"""A ReAct harness built natively on the Gemini API.

Not an adapter over `loop.py` — this speaks Gemini's own primitives directly:
`types.Content` / `types.Part`, `function_declarations`, `Part.from_function_call`
and `Part.from_function_response`, `ThinkingConfig`, and `finish_reason`. It
shares only the tool implementations (`tools.Workspace`) and the `LoopResult`
shape so the runner and report can treat either provider identically.

Gemini specifics that shape this file:
  * Function calling is off the model's own turn: a response part carries a
    `function_call`, and results go back as a `function_response` part in a
    `role="user"` Content. There is no tool_use_id to correlate — Gemini matches
    on function *name* and part ordering.
  * Automatic function calling is disabled: the SDK will otherwise try to invoke
    Python callables itself, which takes the loop away from us.
  * Caching is implicit on 2.5 models — there is no cache_control to place.
    `usage_metadata.cached_content_token_count` reports what got reused.
  * Free-tier quotas are low enough that client-side pacing is mandatory, not an
    optimisation. See RateLimiter.
"""

from __future__ import annotations

import json
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable

from google import genai
from google.genai import errors as genai_errors
from google.genai import types

from .loop import LoopLimits, LoopResult, Tracer, Usage
from .tools import TOOL_SCHEMAS, ToolError, Workspace, dispatch

DEFAULT_MODEL = "gemini-2.5-flash"

# Free-tier quotas (requests/min, requests/day) as published for Google AI
# Studio keys. A paid key raises these substantially; pass explicit limits to
# RateLimiter to override. Conservative by design — hitting the daily cap
# mid-app wastes everything spent on that app.
FREE_TIER_QUOTAS: dict[str, tuple[int, int]] = {
    "gemini-2.5-pro": (5, 100),
    "gemini-2.5-flash": (10, 250),
    "gemini-2.5-flash-lite": (15, 1000),
    "gemini-2.0-flash": (15, 200),
}

# `effort` is an Anthropic concept; Gemini exposes thinking depth instead. Map
# the runner's shared vocabulary onto ThinkingLevel so one promptset can drive
# either provider.
EFFORT_TO_THINKING_LEVEL: dict[str, str] = {
    "low": "MINIMAL",
    "medium": "LOW",
    "high": "MEDIUM",
    "xhigh": "HIGH",
    "max": "HIGH",
}


class RateLimiter:
    """Token-bucket pacing for requests-per-minute and requests-per-day.

    Free-tier RPD is the binding constraint for this workload: a complex app
    takes 70-90 requests, so one app can consume an entire day of quota. Raising
    a clear error on exhaustion beats letting the API return 429s that look like
    transient failures.
    """

    def __init__(self, rpm: int | None, rpd: int | None) -> None:
        self.rpm = rpm
        self.rpd = rpd
        self._minute: list[float] = []
        self._day: list[float] = []
        self._lock = threading.Lock()

    def acquire(self) -> float:
        """Block until a request slot is free. Returns seconds waited."""
        waited = 0.0
        while True:
            with self._lock:
                now = time.monotonic()
                self._minute = [t for t in self._minute if now - t < 60]
                self._day = [t for t in self._day if now - t < 86_400]

                if self.rpd is not None and len(self._day) >= self.rpd:
                    raise QuotaExhausted(
                        f"daily request quota reached ({self.rpd}/day). "
                        "Wait for the quota window to roll over, use a paid key, "
                        "or resume with --append."
                    )
                if self.rpm is None or len(self._minute) < self.rpm:
                    self._minute.append(now)
                    self._day.append(now)
                    return waited
                sleep_for = 60 - (now - self._minute[0]) + 0.25
            time.sleep(max(sleep_for, 0.1))
            waited += max(sleep_for, 0.1)


class QuotaExhausted(RuntimeError):
    """Raised when the daily request quota is spent — not retryable."""


def _gemini_tools(enable_web_search: bool) -> list[types.Tool]:
    """Our client tools as function declarations, plus Google Search grounding.

    `parameters_json_schema` takes plain JSON Schema, so the tool definitions in
    tools.py are reused verbatim rather than restated in Gemini's Schema type.
    """
    declarations = [
        types.FunctionDeclaration(
            name=t["name"],
            description=t["description"],
            parameters_json_schema=t["input_schema"],
        )
        for t in TOOL_SCHEMAS
    ]
    tools = [types.Tool(function_declarations=declarations)]
    if enable_web_search:
        # Grounding runs server-side, like Anthropic's web_search tool. Some
        # model/tool combinations reject search alongside function declarations;
        # the caller can disable it if the API complains.
        tools.append(types.Tool(google_search=types.GoogleSearch()))
    return tools


def _usage_from(response: Any, usage: Usage) -> None:
    """Fold Gemini's usage_metadata into the shared Usage counters."""
    um = getattr(response, "usage_metadata", None)
    if um is None:
        return
    cached = um.cached_content_token_count or 0
    prompt = um.prompt_token_count or 0
    # Gemini's prompt_token_count includes cached tokens; split them so the
    # shared cost model and the report's cache-hit figure stay meaningful.
    usage.cache_read_input_tokens += cached
    usage.input_tokens += max(prompt - cached, 0)
    usage.output_tokens += (um.candidates_token_count or 0) + (
        um.thoughts_token_count or 0
    )


def _estimate_cost(usage: Usage, model: str) -> float:
    """Rough USD estimate. Zero on the free tier, but useful on a paid key."""
    # Published per-1M-token rates; Flash-Lite < Flash < Pro.
    rates = {
        "gemini-2.5-pro": (1.25, 10.00),
        "gemini-2.5-flash": (0.30, 2.50),
        "gemini-2.5-flash-lite": (0.10, 0.40),
        "gemini-2.0-flash": (0.10, 0.40),
    }
    inp, out = rates.get(model, (0.30, 2.50))
    return (
        usage.input_tokens * inp / 1e6
        + usage.cache_read_input_tokens * inp * 0.25 / 1e6
        + usage.output_tokens * out / 1e6
    )


def run_agent_gemini(
    *,
    prompt: str,
    system_prompt: str,
    workspace: Workspace,
    client: Any | None = None,
    model: str = DEFAULT_MODEL,
    effort: str = "high",
    limits: LoopLimits | None = None,
    enable_web_search: bool = True,
    trace_path: Path | None = None,
    echo: bool = True,
    rate_limiter: RateLimiter | None = None,
    free_tier: bool = True,
    on_iteration: Callable[[int], None] | None = None,
) -> LoopResult:
    """Drive one app-building session on Gemini.

    Returns the same LoopResult as the Anthropic loop, so runner.py and
    report.py need no provider-specific branches.
    """
    client = client or genai.Client()
    limits = limits or LoopLimits()
    tracer = Tracer(trace_path, echo=echo) if trace_path else None
    started = time.monotonic()

    if rate_limiter is None:
        rpm, rpd = FREE_TIER_QUOTAS.get(model, (10, 250)) if free_tier else (None, None)
        rate_limiter = RateLimiter(rpm, rpd)

    thinking_level = EFFORT_TO_THINKING_LEVEL.get(effort, "MEDIUM")
    config = types.GenerateContentConfig(
        system_instruction=system_prompt,
        tools=_gemini_tools(enable_web_search),
        # We own the loop; the SDK must not invoke anything itself.
        automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
        thinking_config=types.ThinkingConfig(thinking_level=thinking_level),
        max_output_tokens=limits.max_output_tokens_per_turn,
        tool_config=types.ToolConfig(
            function_calling_config=types.FunctionCallingConfig(mode="AUTO")
        ),
    )

    contents: list[types.Content] = [
        types.Content(role="user", parts=[types.Part.from_text(text=prompt)])
    ]
    usage = Usage()
    tool_counts: dict[str, int] = {}
    final_text = ""
    iteration = 0

    if tracer:
        tracer.event("start", provider="gemini", model=model,
                     thinking_level=thinking_level, prompt=prompt,
                     workspace=str(workspace.root))

    try:
        while True:
            if iteration >= limits.max_iterations:
                return _finish("max_iterations", iteration, usage, final_text,
                               started, tracer, trace_path, tool_counts, model)
            if usage.output_tokens >= limits.max_total_output_tokens:
                return _finish("token_budget", iteration, usage, final_text,
                               started, tracer, trace_path, tool_counts, model)
            if time.monotonic() - started > limits.wall_clock_seconds:
                return _finish("timeout", iteration, usage, final_text,
                               started, tracer, trace_path, tool_counts, model)

            iteration += 1
            if on_iteration:
                on_iteration(iteration)

            waited = rate_limiter.acquire()
            if waited > 1 and tracer:
                tracer.event("rate_limit_wait", seconds=round(waited, 1))

            response = _generate_with_retries(client, model=model,
                                              contents=contents, config=config)
            _usage_from(response, usage)

            candidate = (response.candidates or [None])[0]
            if candidate is None or candidate.content is None:
                return _finish("error", iteration, usage, final_text, started,
                               tracer, trace_path, tool_counts, model,
                               error="response carried no candidate content")

            parts = candidate.content.parts or []
            # `thought` parts are the model's reasoning, not its answer.
            texts = [p.text for p in parts
                     if p.text and not getattr(p, "thought", False)]
            if texts:
                final_text = "\n".join(texts).strip()
                if tracer:
                    tracer.event("assistant_text", text=final_text)

            finish = str(candidate.finish_reason or "")
            if tracer:
                tracer.event("turn", iteration=iteration, stop_reason=finish,
                             output_tokens=usage.output_tokens)

            # Echo the model's turn back verbatim — thought signatures included,
            # which Gemini needs to keep its reasoning coherent across turns.
            contents.append(candidate.content)

            calls = [p.function_call for p in parts if p.function_call]

            if not calls:
                if "MAX_TOKENS" in finish:
                    # Cut off mid-thought; ask for a continuation rather than
                    # treating a truncated turn as a finished one.
                    contents.append(types.Content(role="user", parts=[
                        types.Part.from_text(text=(
                            "Your previous response hit the output token limit "
                            "and was cut off. Continue from exactly where you "
                            "stopped."))]))
                    continue
                if "STOP" in finish or not finish:
                    return _finish("end_turn", iteration, usage, final_text,
                                   started, tracer, trace_path, tool_counts, model)
                # SAFETY, PROHIBITED_CONTENT, MALFORMED_FUNCTION_CALL, ...
                return _finish("refusal" if "SAFETY" in finish
                               or "PROHIBITED" in finish else "error",
                               iteration, usage, final_text, started, tracer,
                               trace_path, tool_counts, model,
                               error=f"finish_reason: {finish}")

            # Execute every requested call and return all results in one
            # user-role Content, mirroring Gemini's parallel-call convention.
            result_parts: list[types.Part] = []
            for call in calls:
                name = call.name or ""
                args = dict(call.args or {})
                tool_counts[name] = tool_counts.get(name, 0) + 1
                if tracer:
                    tracer.event("tool_use", name=name, id=call.id or "",
                                 input=_redact(args))
                try:
                    output = dispatch(workspace, name, args)
                    is_error = False
                except ToolError as exc:
                    output, is_error = f"Error: {exc}", True
                except Exception as exc:  # noqa: BLE001 - report, don't crash
                    output = f"Error: {type(exc).__name__}: {exc}"
                    is_error = True

                if tracer:
                    tracer.event("tool_result", name=name, id=call.id or "",
                                 is_error=is_error, result=output[:2000])

                # Gemini takes a JSON object, not a bare string.
                payload: dict[str, Any] = ({"error": output} if is_error
                                           else {"output": output})
                result_parts.append(
                    types.Part.from_function_response(name=name, response=payload)
                )

            contents.append(types.Content(role="user", parts=result_parts))

    except QuotaExhausted as exc:
        return _finish("quota_exhausted", iteration, usage, final_text, started,
                       tracer, trace_path, tool_counts, model, error=str(exc))
    except genai_errors.APIError as exc:
        return _finish("error", iteration, usage, final_text, started, tracer,
                       trace_path, tool_counts, model,
                       error=f"{type(exc).__name__}: {exc}")
    finally:
        if tracer:
            tracer.close()


def _generate_with_retries(client: Any, *, model: str,
                           contents: list[types.Content],
                           config: types.GenerateContentConfig,
                           attempts: int = 4) -> Any:
    """One turn, with backoff on 429/5xx.

    A 429 here means the server disagreed with our local pacing (shared quota,
    burst accounting); back off and let RateLimiter keep the longer-term shape.
    """
    delay = 5.0
    last: Exception | None = None
    for attempt in range(attempts):
        try:
            return client.models.generate_content(
                model=model, contents=contents, config=config
            )
        except genai_errors.APIError as exc:
            status = getattr(exc, "status", None) or getattr(exc, "code", None)
            retryable = str(status) in {"429", "500", "503", "504"} or (
                "RESOURCE_EXHAUSTED" in str(exc) or "UNAVAILABLE" in str(exc)
            )
            if not retryable or attempt == attempts - 1:
                raise
            last = exc
            time.sleep(delay)
            delay *= 2
    raise last  # pragma: no cover


def _redact(args: dict[str, Any]) -> dict[str, Any]:
    """Trim big write_file payloads out of the echoed trace line."""
    if "content" in args:
        clipped = dict(args)
        text = str(clipped["content"])
        clipped["content"] = text[:500] + ("..." if len(text) > 500 else "")
        return clipped
    return args


def _finish(stop_reason: str, iterations: int, usage: Usage, final_text: str,
            started: float, tracer: Tracer | None, trace_path: Path | None,
            tool_counts: dict[str, int], model: str,
            error: str | None = None) -> LoopResult:
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
        cost_usd=_estimate_cost(usage, model),
    )
