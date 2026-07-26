"""Offline self-test for the pipeline. No API key required.

Exercises the sandbox, the ReAct loop's control flow (tool round-trips,
pause_turn resume, refusal, iteration caps), report rendering, and site
assembly by driving the loop with a scripted stand-in for the Anthropic client.

    cd pipeline && python selftest.py
"""

from __future__ import annotations

import copy
import json
import shutil
import sys
import tempfile
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from agent import report as report_mod
from agent.loop import LoopLimits, run_agent
from agent.promptset import Promptset, PromptsetError
from agent.tools import ToolError, Workspace, dispatch

REPO_ROOT = Path(__file__).resolve().parents[1]
TEMPLATE = REPO_ROOT / "template"

PASS, FAIL = "  ok  ", " FAIL "
failures: list[str] = []


def check(name: str, cond: bool, detail: str = "") -> None:
    print(f"[{PASS if cond else FAIL}] {name}" + (f" — {detail}" if detail and not cond else ""))
    if not cond:
        failures.append(name)


# --- fake API objects -----------------------------------------------------
# Shaped like the SDK's response models: .type on blocks, .model_dump() for
# round-tripping into the next request.


@dataclass
class FakeUsage:
    input_tokens: int = 100
    output_tokens: int = 50
    cache_read_input_tokens: int = 0
    cache_creation_input_tokens: int = 0


class FakeBlock:
    def __init__(self, **kw: Any) -> None:
        self.__dict__.update(kw)

    def model_dump(self, exclude_none: bool = True) -> dict[str, Any]:
        return {k: v for k, v in self.__dict__.items() if v is not None}


def text_block(text: str) -> FakeBlock:
    return FakeBlock(type="text", text=text)


def tool_block(tid: str, name: str, tool_input: dict[str, Any]) -> FakeBlock:
    return FakeBlock(type="tool_use", id=tid, name=name, input=tool_input)


class FakeResponse:
    def __init__(self, content: list[FakeBlock], stop_reason: str,
                 stop_details: Any = None) -> None:
        self.content = content
        self.stop_reason = stop_reason
        self.stop_details = stop_details
        self.usage = FakeUsage()


class FakeStream:
    def __init__(self, response: FakeResponse) -> None:
        self._r = response

    def __enter__(self) -> "FakeStream":
        return self

    def __exit__(self, *exc: Any) -> None:
        return None

    def get_final_message(self) -> FakeResponse:
        return self._r


class FakeMessages:
    def __init__(self, script: list[FakeResponse], sink: list[dict[str, Any]]) -> None:
        self.script = list(script)
        self.sink = sink

    def stream(self, **kwargs: Any) -> FakeStream:
        # Snapshot: the loop mutates one `messages` list across turns, so a
        # live reference would show every request's final state.
        self.sink.append(copy.deepcopy(kwargs))
        if not self.script:
            raise AssertionError("loop requested more turns than the script provides")
        return FakeStream(self.script.pop(0))


class FakeClient:
    def __init__(self, script: list[FakeResponse]) -> None:
        self.requests: list[dict[str, Any]] = []
        self.messages = FakeMessages(script, self.requests)


@contextmanager
def temp_app():
    tmp = Path(tempfile.mkdtemp(prefix="selftest-"))
    app = tmp / "app"
    shutil.copytree(TEMPLATE, app,
                    ignore=shutil.ignore_patterns("node_modules", "dist", ".vite"))
    try:
        yield app
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


# --- tests ----------------------------------------------------------------


def test_workspace() -> None:
    print("\nworkspace sandbox")
    with temp_app() as app:
        ws = Workspace(root=app)

        out = ws.write_file("src/Widget.tsx", "export const Widget = () => null\n")
        check("write_file creates a file", (app / "src/Widget.tsx").exists(), out)

        read = ws.read_file("src/Widget.tsx")
        check("read_file returns numbered contents", "Widget" in read and "1\t" in read)

        listing = ws.read_file("src")
        check("read_file lists a directory", "Widget.tsx" in listing)

        nested = ws.write_file("src/deep/a/b.ts", "export {}\n")
        check("write_file creates parent dirs", (app / "src/deep/a/b.ts").exists(), nested)

        for bad in ("../escape.txt", "/etc/passwd", "src/../../oops.txt"):
            try:
                ws.resolve(bad)
                check(f"path escape rejected: {bad}", False, "no error raised")
            except ToolError:
                check(f"path escape rejected: {bad}", True)

        res = ws.bash("echo hello && pwd")
        check("bash runs in the workspace", "hello" in res and str(app) in res)

        try:
            ws.bash("sudo rm -rf /")
            check("denied command blocked", False, "no error raised")
        except ToolError:
            check("denied command blocked", True)

        try:
            ws.read_file("nope.txt")
            check("missing file errors", False)
        except ToolError:
            check("missing file errors", True)

        err = dispatch(ws, "read_file", {"path": "src/Widget.tsx"})
        check("dispatch routes by name", "Widget" in err)
        try:
            dispatch(ws, "bogus_tool", {})
            check("unknown tool errors", False)
        except ToolError:
            check("unknown tool errors", True)


def test_loop_tool_roundtrip() -> None:
    print("\nReAct loop — tool round-trip")
    with temp_app() as app:
        ws = Workspace(root=app)
        client = FakeClient([
            FakeResponse(
                [text_block("Writing the app."),
                 tool_block("t1", "write_file",
                            {"path": "src/App.tsx", "content": "export default () => <p>hi</p>\n"}),
                 tool_block("t2", "read_file", {"path": "package.json"})],
                "tool_use",
            ),
            FakeResponse([text_block("Done — the app builds.")], "end_turn"),
        ])

        res = run_agent(prompt="build it", system_prompt="SI", workspace=ws,
                        client=client, echo=False, limits=LoopLimits(max_iterations=5))

        check("loop reaches end_turn", res.stop_reason == "end_turn", res.stop_reason)
        check("loop is marked ok", res.ok)
        check("final text captured", "Done" in res.final_text, res.final_text)
        check("tool actually executed", (app / "src/App.tsx").read_text().strip().endswith("<p>hi</p>"))
        check("two iterations", res.iterations == 2, str(res.iterations))
        check("usage accumulated", res.usage.output_tokens == 100, str(res.usage.output_tokens))
        check("tool calls counted",
              res.tool_call_counts == {"write_file": 1, "read_file": 1},
              str(res.tool_call_counts))

        # Both results must come back in ONE user message, or the model stops
        # emitting parallel tool calls.
        second_request = client.requests[1]["messages"]
        last = second_request[-1]
        check("assistant turn echoed back", second_request[-2]["role"] == "assistant")
        check("tool results batched into one user message",
              last["role"] == "user" and len(last["content"]) == 2,
              json.dumps(last)[:200])
        check("tool_use_ids match",
              {b["tool_use_id"] for b in last["content"]} == {"t1", "t2"})

        req = client.requests[0]
        check("no sampling params sent (rejected on Sonnet 5)",
              not {"temperature", "top_p", "top_k"} & set(req))
        check("adaptive thinking requested", req["thinking"] == {"type": "adaptive"})
        check("effort passed via output_config", req["output_config"]["effort"] == "high")
        check("system prompt is cached", req["system"][0]["cache_control"]["type"] == "ephemeral")
        names = {t.get("name") for t in req["tools"]}
        check("all four client tools declared",
              {"read_file", "write_file", "npm_build", "bash"} <= names, str(names))
        check("web search declared as a server tool",
              any(t.get("type", "").startswith("web_search") for t in req["tools"]))


def test_loop_tool_error() -> None:
    print("\nReAct loop — failing tool")
    with temp_app() as app:
        client = FakeClient([
            FakeResponse([tool_block("t1", "read_file", {"path": "../../etc/passwd"})],
                         "tool_use"),
            FakeResponse([text_block("Understood, staying in the workspace.")], "end_turn"),
        ])
        res = run_agent(prompt="p", system_prompt="SI", workspace=Workspace(root=app),
                        client=client, echo=False)
        check("run survives a tool error", res.ok, res.stop_reason)
        result_block = client.requests[1]["messages"][-1]["content"][0]
        check("error surfaced as is_error tool_result", result_block.get("is_error") is True)
        check("error text explains the failure", "escapes" in result_block["content"])


def test_loop_pause_and_refusal() -> None:
    print("\nReAct loop — pause_turn and refusal")
    with temp_app() as app:
        client = FakeClient([
            FakeResponse([text_block("searching...")], "pause_turn"),
            FakeResponse([text_block("resumed and finished")], "end_turn"),
        ])
        res = run_agent(prompt="p", system_prompt="SI", workspace=Workspace(root=app),
                        client=client, echo=False)
        check("pause_turn resumes without a new user turn", res.ok, res.stop_reason)
        check("resume re-sends the assistant turn",
              client.requests[1]["messages"][-1]["role"] == "assistant")

    with temp_app() as app:
        client = FakeClient([FakeResponse([], "pause_turn")] * 10)
        res = run_agent(prompt="p", system_prompt="SI", workspace=Workspace(root=app),
                        client=client, echo=False,
                        limits=LoopLimits(max_pause_resumes=2, max_iterations=20))
        check("runaway pause_turn is capped", res.stop_reason == "error", res.stop_reason)

    with temp_app() as app:
        client = FakeClient([
            FakeResponse([], "refusal", stop_details=FakeBlock(category="cyber",
                                                               explanation="declined"))
        ])
        res = run_agent(prompt="p", system_prompt="SI", workspace=Workspace(root=app),
                        client=client, echo=False)
        check("refusal reported, not raised", res.stop_reason == "refusal", res.stop_reason)
        check("refusal category recorded", "cyber" in (res.error or ""), str(res.error))


def test_loop_limits() -> None:
    print("\nReAct loop — budget ceilings")
    with temp_app() as app:
        # Never terminates on its own: always asks for another tool call.
        script = [
            FakeResponse([tool_block(f"t{i}", "bash", {"command": "true"})], "tool_use")
            for i in range(50)
        ]
        client = FakeClient(script)
        res = run_agent(prompt="p", system_prompt="SI", workspace=Workspace(root=app),
                        client=client, echo=False, limits=LoopLimits(max_iterations=4))
        check("max_iterations halts the loop", res.stop_reason == "max_iterations",
              res.stop_reason)
        check("iteration count respected", res.iterations == 4, str(res.iterations))

    with temp_app() as app:
        client = FakeClient([
            FakeResponse([tool_block(f"t{i}", "bash", {"command": "true"})], "tool_use")
            for i in range(50)
        ])
        res = run_agent(prompt="p", system_prompt="SI", workspace=Workspace(root=app),
                        client=client, echo=False,
                        limits=LoopLimits(max_total_output_tokens=120,
                                          max_iterations=50))
        check("token budget halts the loop", res.stop_reason == "token_budget",
              res.stop_reason)


def test_transcript() -> None:
    print("\ntranscript")
    with temp_app() as app:
        tmp = Path(tempfile.mkdtemp(prefix="selftest-trace-"))
        try:
            trace = tmp / "t.jsonl"
            client = FakeClient([
                FakeResponse([tool_block("t1", "bash", {"command": "echo hi"})], "tool_use"),
                FakeResponse([text_block("done")], "end_turn"),
            ])
            run_agent(prompt="p", system_prompt="SI", workspace=Workspace(root=app),
                      client=client, echo=False, trace_path=trace)
            lines = [json.loads(l) for l in trace.read_text().splitlines()]
            kinds = [l["kind"] for l in lines]
            check("transcript written", trace.exists())
            check("transcript records the full arc",
                  {"start", "tool_use", "tool_result", "turn", "finish"} <= set(kinds),
                  str(kinds))
            check("every line is valid JSON", all("ts" in l for l in lines))
        finally:
            shutil.rmtree(tmp, ignore_errors=True)


def test_promptset() -> None:
    print("\npromptset loading")
    pset = Promptset.load(REPO_ROOT / "promptsets/v1")
    check("v1 promptset loads", pset.id == "v1", pset.id)
    check("v1 has prompts", len(pset.prompts) == 6, str(len(pset.prompts)))
    check("prompt bodies non-empty", all(p.prompt.strip() for p in pset.prompts))
    check("titles present", all(p.title for p in pset.prompts))
    check("defaults pin Sonnet 5", pset.defaults.get("model") == "claude-sonnet-5",
          str(pset.defaults))

    tmp = Path(tempfile.mkdtemp(prefix="selftest-ps-"))
    try:
        bad = tmp / "promptset.yaml"
        bad.write_text("id: bad\nprompts:\n  - id: Not_A_Slug\n    prompt: x\n")
        try:
            Promptset.load(bad)
            check("invalid prompt id rejected", False, "no error raised")
        except PromptsetError:
            check("invalid prompt id rejected", True)

        bad.write_text("id: bad\nprompts:\n  - id: dup\n    prompt: x\n  - id: dup\n    prompt: y\n")
        try:
            Promptset.load(bad)
            check("duplicate prompt id rejected", False, "no error raised")
        except PromptsetError:
            check("duplicate prompt id rejected", True)

        # A promptset may version its own system prompt.
        (tmp / "promptset.yaml").write_text(
            "id: withsi\nprompts:\n  - id: a\n    prompt: x\n")
        (tmp / "system_prompt.md").write_text("CUSTOM SI")
        loaded = Promptset.load(tmp)
        check("promptset-local system_prompt.md is picked up",
              loaded.system_prompt == "CUSTOM SI", loaded.system_prompt)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def test_report() -> None:
    print("\nreport rendering")
    manifest = {
        "run_id": "v1-20260101-000000",
        "promptset": {"id": "v1", "name": "Baseline", "description": "d",
                      "path": "promptsets/v1/promptset.yaml"},
        "model": "claude-sonnet-5", "effort": "high",
        "duration_seconds": 42.0,
        "finished_at": "2026-01-01T00:00:00+00:00",
        "system_prompt": "SI text",
        "totals": {"apps": 2, "ok": 1, "output_tokens": 1234,
                   "input_tokens": 999, "estimated_cost_usd": 0.42},
        "apps": [
            {"app_id": "v1-kanban", "prompt_id": "kanban", "title": "Kanban Board",
             "prompt": "Build a board with <script>alert(1)</script>",
             "status": "ok", "agent_stop_reason": "end_turn", "iterations": 7,
             "elapsed_seconds": 120.0, "usage": {"output_tokens": 900},
             "estimated_cost_usd": 0.3, "final_message": "Built it.",
             "build_ok": True, "screenshot": "screenshots/v1-kanban.png",
             "console_errors": [], "page_errors": [],
             "app_url": "/apps/v1-kanban/",
             "transcript": "transcripts/v1-kanban.jsonl"},
            {"app_id": "v1-broken", "prompt_id": "broken", "title": "Broken",
             "prompt": "p", "status": "build_failed", "agent_stop_reason": "max_iterations",
             "iterations": 60, "elapsed_seconds": 300.0, "usage": {"output_tokens": 334},
             "estimated_cost_usd": 0.12, "build_ok": False,
             "build_log_tail": "TS2345: type error", "agent_error": "hit cap",
             "console_errors": ["boom"], "page_errors": [],
             "app_url": "/apps/v1-broken/"},
        ],
    }
    html_out = report_mod.render(manifest)
    check("report includes both apps",
          "Kanban Board" in html_out and "Broken" in html_out)
    check("report links to the live app", 'href="../../apps/v1-kanban/"' in html_out)
    check("report embeds the screenshot", "screenshots/v1-kanban.png" in html_out)
    check("failed app's link is disabled", 'aria-disabled="true"' in html_out)
    check("build log surfaced on failure", "TS2345" in html_out)
    check("prompt HTML is escaped",
          "&lt;script&gt;" in html_out and "<script>alert" not in html_out)
    check("system prompt included", "SI text" in html_out)
    check("theme-aware CSS present",
          "prefers-color-scheme" in html_out and 'data-theme="dark"' in html_out)
    check("responsive layout present", "@media (max-width:820px)" in html_out)

    tmp = Path(tempfile.mkdtemp(prefix="selftest-report-"))
    try:
        out = report_mod.write_report(tmp, manifest)
        check("report written to disk", out.exists() and out.stat().st_size > 3000)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def test_vercel_config() -> None:
    print("\nvercel config")
    from agent.site import VERCEL_CONFIG

    rewrites = VERCEL_CONFIG.get("rewrites", [])
    check("one SPA rewrite per app", len(rewrites) == 1, str(rewrites))
    src, dst = rewrites[0]["source"], rewrites[0]["destination"]
    check("rewrite is scoped to a single app id",
          src == "/apps/:appId/(.*)" and dst == "/apps/:appId/index.html",
          f"{src} -> {dst}")
    check("rewrite cannot swallow the gallery index", not src.startswith("/(."),
          src)
    # Verified against real Vercel: `trailingSlash: true` normalizes the
    # rewrite destination to `…/index.html/`, which 404s every SPA route.
    check("trailingSlash is not set (it breaks the rewrite destination)",
          "trailingSlash" not in VERCEL_CONFIG)

    headers = VERCEL_CONFIG.get("headers", [])
    sources = [h["source"] for h in headers]
    immutable = [h for h in headers
                 if any("immutable" in x["value"] for x in h["headers"])]
    check("hashed assets are cached immutably", len(immutable) == 1, str(headers))
    check("immutable rule targets only /assets/",
          "/assets/" in immutable[0]["source"], immutable[0]["source"])
    check("everything else must revalidate",
          any(h["source"] == "/(.*)"
              and "must-revalidate" in h["headers"][0]["value"] for h in headers))
    # Verified against real Vercel: every matching rule applies and the LAST one
    # wins per header key. Catch-all first, or assets silently get max-age=0.
    check("catch-all header rule precedes the assets rule",
          sources.index("/(.*)") < sources.index(immutable[0]["source"]),
          str(sources))
    check("config is JSON-serializable", bool(json.dumps(VERCEL_CONFIG)))


def main() -> int:
    print("pipeline self-test (no API key required)")
    test_workspace()
    test_loop_tool_roundtrip()
    test_loop_tool_error()
    test_loop_pause_and_refusal()
    test_loop_limits()
    test_transcript()
    test_promptset()
    test_report()
    test_vercel_config()

    print()
    if failures:
        print(f"{len(failures)} FAILED: {', '.join(failures)}")
        return 1
    print("all checks passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
