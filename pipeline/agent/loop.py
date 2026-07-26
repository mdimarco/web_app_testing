"""A small ReAct harness over the Claude Messages API.

Deliberately a hand-written loop rather than the SDK tool runner: the pipeline
needs to log every step, enforce its own iteration/token ceilings, and keep the
control flow inspectable.

Model behavior notes that shape this file (Claude Sonnet 5):
  * Adaptive thinking is on by default; `budget_tokens` is rejected.
  * `temperature` / `top_p` / `top_k` are rejected — steer with the prompt.
  * Requests stream, because max_tokens is large enough to risk HTTP timeouts.
  * Server-side tools can end a turn with stop_reason "pause_turn"; the turn is
    resumed by re-sending with the assistant turn appended and no new user text.
"""

from __future__ import annotations

import json
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable

import anthropic

from .tools import TOOL_SCHEMAS, ToolError, Workspace, dispatch

DEFAULT_MODEL = "claude-sonnet-5"

# Server-side tool: runs on Anthropic's infrastructure, so there is no local
# handler. The _20260209 variant adds dynamic result filtering and is supported
# on Sonnet 5.
WEB_SEARCH_TOOL: dict[str, Any] = {
    "type": "web_search_20260209",
    "name": "web_search",
    "max_uses": 8,
}


@dataclass
class LoopLimits:
    max_iterations: int = 60
    max_output_tokens_per_turn: int = 32_000
    # Cumulative ceiling across the whole run for one app. The loop stops
    # cleanly when crossing it rather than being cut off mid-turn.
    max_total_output_tokens: int = 400_000
    max_pause_resumes: int = 5
    wall_clock_seconds: int = 3_600


@dataclass
class Usage:
    input_tokens: int = 0
    output_tokens: int = 0
    cache_read_input_tokens: int = 0
    cache_creation_input_tokens: int = 0

    def add(self, u: Any) -> None:
        self.input_tokens += getattr(u, "input_tokens", 0) or 0
        self.output_tokens += getattr(u, "output_tokens", 0) or 0
        self.cache_read_input_tokens += getattr(u, "cache_read_input_tokens", 0) or 0
        self.cache_creation_input_tokens += (
            getattr(u, "cache_creation_input_tokens", 0) or 0
        )

    def as_dict(self) -> dict[str, int]:
        return {
            "input_tokens": self.input_tokens,
            "output_tokens": self.output_tokens,
            "cache_read_input_tokens": self.cache_read_input_tokens,
            "cache_creation_input_tokens": self.cache_creation_input_tokens,
        }

    def estimated_cost_usd(self) -> float:
        """Sonnet 5 list pricing: $3/MTok in, $15/MTok out; cache reads ~0.1x in."""
        return (
            self.input_tokens * 3e-6
            + self.cache_creation_input_tokens * 3.75e-6
            + self.cache_read_input_tokens * 0.3e-6
            + self.output_tokens * 15e-6
        )


@dataclass
class LoopResult:
    stop_reason: str          # "end_turn" | "max_iterations" | "token_budget" |
                              # "timeout" | "refusal" | "error"
    iterations: int
    usage: Usage
    final_text: str
    elapsed_seconds: float
    error: str | None = None
    transcript_path: Path | None = None
    tool_call_counts: dict[str, int] = field(default_factory=dict)

    @property
    def ok(self) -> bool:
        return self.stop_reason == "end_turn"


class Tracer:
    """Appends one JSON object per loop event to a .jsonl file."""

    def __init__(self, path: Path, echo: bool = True) -> None:
        self.path = path
        self.echo = echo
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._fh = self.path.open("w", encoding="utf-8")

    def event(self, kind: str, **payload: Any) -> None:
        record = {"ts": time.time(), "kind": kind, **payload}
        self._fh.write(json.dumps(record, ensure_ascii=False, default=str) + "\n")
        self._fh.flush()
        if self.echo:
            self._echo(kind, payload)

    @staticmethod
    def _echo(kind: str, payload: dict[str, Any]) -> None:
        if kind == "assistant_text":
            text = (payload.get("text") or "").strip()
            if text:
                print(f"  · {text[:400]}")
        elif kind == "tool_use":
            name = payload.get("name")
            args = payload.get("input") or {}
            hint = args.get("path") or args.get("command") or args.get("query") or ""
            print(f"  → {name}({str(hint)[:120]})")
        elif kind == "tool_result":
            status = "error" if payload.get("is_error") else "ok"
            print(f"  ← {payload.get('name')} [{status}]")
        elif kind == "turn":
            print(
                f"  turn {payload.get('iteration')}: "
                f"stop={payload.get('stop_reason')} "
                f"out={payload.get('output_tokens')}tok"
            )

    def close(self) -> None:
        self._fh.close()


def _blocks_to_params(content: list[Any]) -> list[dict[str, Any]]:
    """Convert response content blocks into params for the next request.

    Thinking blocks must be echoed back unchanged on the same model, so this
    round-trips every block via its raw dict form rather than filtering.
    """
    out: list[dict[str, Any]] = []
    for block in content:
        if hasattr(block, "model_dump"):
            out.append(block.model_dump(exclude_none=True))
        else:  # already a plain dict
            out.append(block)
    return out


def run_agent(
    *,
    prompt: str,
    system_prompt: str,
    workspace: Workspace,
    client: anthropic.Anthropic | None = None,
    model: str = DEFAULT_MODEL,
    effort: str = "high",
    limits: LoopLimits | None = None,
    enable_web_search: bool = True,
    trace_path: Path | None = None,
    echo: bool = True,
    on_iteration: Callable[[int], None] | None = None,
) -> LoopResult:
    """Drive one app-building session to completion.

    Returns a LoopResult; it does not raise on model-side failures (refusals,
    budget exhaustion) — those are reported through `stop_reason` so the caller
    can still produce a report row for the app.
    """
    client = client or anthropic.Anthropic()
    limits = limits or LoopLimits()
    tracer = Tracer(trace_path, echo=echo) if trace_path else None
    started = time.monotonic()

    tools: list[dict[str, Any]] = list(TOOL_SCHEMAS)
    if enable_web_search:
        tools.append(WEB_SEARCH_TOOL)

    # Cache the stable prefix: tools render first, then system. One breakpoint
    # on the last system block covers both, and the conversation grows after it.
    system_param = [
        {
            "type": "text",
            "text": system_prompt,
            "cache_control": {"type": "ephemeral"},
        }
    ]

    messages: list[dict[str, Any]] = [{"role": "user", "content": prompt}]
    usage = Usage()
    tool_counts: dict[str, int] = {}
    final_text = ""
    pause_resumes = 0
    iteration = 0

    if tracer:
        tracer.event("start", model=model, effort=effort, prompt=prompt,
                     workspace=str(workspace.root))

    try:
        while True:
            if iteration >= limits.max_iterations:
                return _finish("max_iterations", iteration, usage, final_text,
                               started, tracer, trace_path, tool_counts)
            if usage.output_tokens >= limits.max_total_output_tokens:
                return _finish("token_budget", iteration, usage, final_text,
                               started, tracer, trace_path, tool_counts)
            if time.monotonic() - started > limits.wall_clock_seconds:
                return _finish("timeout", iteration, usage, final_text,
                               started, tracer, trace_path, tool_counts)

            iteration += 1
            if on_iteration:
                on_iteration(iteration)

            response = _create_with_retries(
                client,
                model=model,
                max_tokens=limits.max_output_tokens_per_turn,
                system=system_param,
                messages=messages,
                tools=tools,
                effort=effort,
            )
            usage.add(response.usage)

            texts = [b.text for b in response.content if b.type == "text"]
            if texts:
                final_text = "\n".join(texts).strip()
                if tracer:
                    tracer.event("assistant_text", text=final_text)

            if tracer:
                tracer.event(
                    "turn",
                    iteration=iteration,
                    stop_reason=response.stop_reason,
                    output_tokens=response.usage.output_tokens,
                    cumulative_output_tokens=usage.output_tokens,
                )

            messages.append(
                {"role": "assistant", "content": _blocks_to_params(response.content)}
            )

            # Safety classifiers declined. Not an exception — a 200 with an
            # empty or partial content list.
            if response.stop_reason == "refusal":
                details = getattr(response, "stop_details", None)
                if tracer:
                    tracer.event("refusal", category=getattr(details, "category", None),
                                 explanation=getattr(details, "explanation", None))
                return _finish("refusal", iteration, usage, final_text, started,
                               tracer, trace_path, tool_counts,
                               error=f"model refused ({getattr(details, 'category', 'unknown')})")

            # A server-side tool hit its per-turn iteration cap. Re-send as-is;
            # the API resumes from the trailing server_tool_use block.
            if response.stop_reason == "pause_turn":
                pause_resumes += 1
                if pause_resumes > limits.max_pause_resumes:
                    return _finish("error", iteration, usage, final_text, started,
                                   tracer, trace_path, tool_counts,
                                   error="turn still paused after max_pause_resumes")
                continue

            if response.stop_reason != "tool_use":
                # end_turn, max_tokens, stop_sequence — the model is done talking.
                reason = "end_turn" if response.stop_reason == "end_turn" else "error"
                err = None if reason == "end_turn" else f"stopped: {response.stop_reason}"
                return _finish(reason, iteration, usage, final_text, started,
                               tracer, trace_path, tool_counts, error=err)

            # Execute every requested client tool, then return all results in a
            # single user message — splitting them suppresses parallel calls.
            tool_results: list[dict[str, Any]] = []
            for block in response.content:
                if block.type != "tool_use":
                    continue
                tool_counts[block.name] = tool_counts.get(block.name, 0) + 1
                if tracer:
                    tracer.event("tool_use", name=block.name, id=block.id,
                                 input=_redact(block.input))
                try:
                    result_text = dispatch(workspace, block.name, dict(block.input))
                    is_error = False
                except ToolError as exc:
                    result_text, is_error = f"Error: {exc}", True
                except Exception as exc:  # noqa: BLE001 - report, don't crash the run
                    result_text = f"Error: {type(exc).__name__}: {exc}"
                    is_error = True

                if tracer:
                    tracer.event("tool_result", name=block.name, id=block.id,
                                 is_error=is_error, result=result_text[:2000])

                tool_results.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": result_text,
                        **({"is_error": True} if is_error else {}),
                    }
                )

            if not tool_results:
                # stop_reason was tool_use but only server tools ran; nothing to
                # send back, so let the next turn continue the conversation.
                messages.append(
                    {"role": "user", "content": "Continue."}
                )
            else:
                messages.append({"role": "user", "content": tool_results})

    except anthropic.APIError as exc:
        return _finish("error", iteration, usage, final_text, started, tracer,
                       trace_path, tool_counts, error=f"{type(exc).__name__}: {exc}")
    finally:
        if tracer:
            tracer.close()


def _create_with_retries(
    client: anthropic.Anthropic,
    *,
    model: str,
    max_tokens: int,
    system: list[dict[str, Any]],
    messages: list[dict[str, Any]],
    tools: list[dict[str, Any]],
    effort: str,
    attempts: int = 4,
):
    """Stream one turn and return the accumulated message.

    Streaming is required at these max_tokens values — a non-streaming request
    can outlive the SDK's HTTP timeout. The SDK already retries 429/5xx; this
    adds a backoff around overload bursts that exhaust its budget.
    """
    delay = 2.0
    last: Exception | None = None
    for attempt in range(attempts):
        try:
            with client.messages.stream(
                model=model,
                max_tokens=max_tokens,
                system=system,
                messages=messages,
                tools=tools,
                output_config={"effort": effort},
                thinking={"type": "adaptive"},
            ) as stream:
                return stream.get_final_message()
        except (anthropic.RateLimitError, anthropic.InternalServerError,
                anthropic.APIConnectionError) as exc:
            last = exc
            if attempt == attempts - 1:
                raise
            time.sleep(delay)
            delay *= 2
    raise last  # pragma: no cover - unreachable


def _redact(tool_input: Any) -> Any:
    """Trim huge write_file payloads out of the echoed trace line."""
    if isinstance(tool_input, dict) and "content" in tool_input:
        clipped = dict(tool_input)
        content = str(clipped["content"])
        clipped["content"] = content[:500] + ("..." if len(content) > 500 else "")
        return clipped
    return tool_input


def _finish(
    stop_reason: str,
    iterations: int,
    usage: Usage,
    final_text: str,
    started: float,
    tracer: Tracer | None,
    trace_path: Path | None,
    tool_counts: dict[str, int],
    error: str | None = None,
) -> LoopResult:
    elapsed = time.monotonic() - started
    if tracer:
        tracer.event("finish", stop_reason=stop_reason, iterations=iterations,
                     usage=usage.as_dict(), elapsed_seconds=elapsed, error=error)
    return LoopResult(
        stop_reason=stop_reason,
        iterations=iterations,
        usage=usage,
        final_text=final_text,
        elapsed_seconds=elapsed,
        error=error,
        transcript_path=trace_path,
        tool_call_counts=tool_counts,
    )
