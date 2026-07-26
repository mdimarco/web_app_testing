"""Client-side tools exposed to the ReAct agent.

Every tool is sandboxed to a single app directory (the "workspace"). Paths are
resolved and checked against the workspace root before any filesystem call, so
a model-supplied `../../etc/passwd` is rejected rather than followed.

Web search is *not* here: it is an Anthropic server-side tool declared in the
request and executed on Anthropic's infrastructure, so there is nothing for us
to run locally. See `loop.py`.
"""

from __future__ import annotations

import os
import shlex
import subprocess
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

MAX_TOOL_OUTPUT_CHARS = 30_000
DEFAULT_BASH_TIMEOUT = 120
DEFAULT_BUILD_TIMEOUT = 600


def _truncate(text: str, limit: int = MAX_TOOL_OUTPUT_CHARS) -> str:
    if len(text) <= limit:
        return text
    head = text[: limit // 2]
    tail = text[-limit // 2 :]
    dropped = len(text) - len(head) - len(tail)
    return f"{head}\n\n...[{dropped} characters truncated]...\n\n{tail}"


class ToolError(Exception):
    """Recoverable failure — surfaced to the model as an is_error tool_result."""


@dataclass
class Workspace:
    """A single generated app's directory. All tool calls are confined to it."""

    root: Path
    bash_timeout: int = DEFAULT_BASH_TIMEOUT
    build_timeout: int = DEFAULT_BUILD_TIMEOUT
    # Commands the agent may not run. Kept deliberately small: the workspace is
    # already disposable, so this guards against escaping it, not against
    # breaking it.
    denied_commands: tuple[str, ...] = ("sudo", "shutdown", "reboot", "mkfs", "mount")
    calls: list[dict[str, Any]] = field(default_factory=list)

    def __post_init__(self) -> None:
        self.root = self.root.resolve()
        self.root.mkdir(parents=True, exist_ok=True)

    # ---- path safety -----------------------------------------------------

    def resolve(self, rel_path: str) -> Path:
        """Resolve a model-supplied path inside the workspace, or raise."""
        if not rel_path or rel_path.strip() == "":
            raise ToolError("path must be a non-empty string")
        candidate = (self.root / rel_path).resolve()
        if candidate != self.root and self.root not in candidate.parents:
            raise ToolError(
                f"path {rel_path!r} escapes the app workspace; "
                "use paths relative to the app root such as 'src/App.tsx'"
            )
        return candidate

    def rel(self, path: Path) -> str:
        try:
            return str(path.relative_to(self.root))
        except ValueError:
            return str(path)

    # ---- tool implementations -------------------------------------------

    def read_file(self, path: str, start_line: int | None = None,
                  end_line: int | None = None) -> str:
        target = self.resolve(path)
        if not target.exists():
            raise ToolError(f"{path} does not exist")
        if target.is_dir():
            entries = sorted(
                (f"{p.name}/" if p.is_dir() else p.name) for p in target.iterdir()
            )
            return f"{path} is a directory containing:\n" + "\n".join(entries)
        try:
            text = target.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            raise ToolError(f"{path} is not a UTF-8 text file")

        lines = text.splitlines()
        if start_line is not None or end_line is not None:
            lo = max((start_line or 1) - 1, 0)
            hi = end_line if end_line is not None else len(lines)
            lines = lines[lo:hi]
            offset = lo + 1
        else:
            offset = 1
        numbered = "\n".join(f"{i + offset:>5}\t{line}" for i, line in enumerate(lines))
        return _truncate(numbered) if numbered else "(empty file)"

    def write_file(self, path: str, content: str) -> str:
        target = self.resolve(path)
        target.parent.mkdir(parents=True, exist_ok=True)
        existed = target.exists()
        target.write_text(content, encoding="utf-8")
        verb = "Overwrote" if existed else "Created"
        n_lines = content.count("\n") + 1
        return f"{verb} {self.rel(target)} ({len(content)} bytes, {n_lines} lines)."

    def bash(self, command: str, timeout: int | None = None) -> str:
        if not command.strip():
            raise ToolError("command must be a non-empty string")
        try:
            tokens = shlex.split(command)
        except ValueError:
            # Unbalanced quotes etc. — bash may still accept it, so don't
            # reject the command, just skip the denylist check.
            tokens = []
        head = tokens[0] if tokens else ""
        if head and os.path.basename(head) in self.denied_commands:
            raise ToolError(f"command {head!r} is not permitted in this environment")

        proc = subprocess.run(
            ["bash", "-lc", command],
            cwd=self.root,
            capture_output=True,
            text=True,
            timeout=timeout or self.bash_timeout,
        )
        return self._format_process(proc, label=f"$ {command}")

    def npm_build(self) -> str:
        """Install dependencies if needed, then run the production build.

        This is the agent's correctness signal: TypeScript and Vite errors come
        back here, so the loop is expected to call it until it exits 0.
        """
        if not (self.root / "package.json").exists():
            raise ToolError(
                "no package.json in the app root — the app scaffold is missing"
            )

        output: list[str] = []
        if not (self.root / "node_modules").exists():
            install = subprocess.run(
                ["npm", "install", "--no-fund", "--no-audit"],
                cwd=self.root,
                capture_output=True,
                text=True,
                timeout=self.build_timeout,
            )
            output.append(self._format_process(install, label="$ npm install"))
            if install.returncode != 0:
                return "\n\n".join(output)

        build = subprocess.run(
            ["npm", "run", "build"],
            cwd=self.root,
            capture_output=True,
            text=True,
            timeout=self.build_timeout,
            env={**os.environ, "VITE_BASE": os.environ.get("VITE_BASE", "/")},
        )
        output.append(self._format_process(build, label="$ npm run build"))
        if build.returncode == 0:
            output.append("Build succeeded. dist/ is ready to deploy.")
        return "\n\n".join(output)

    @staticmethod
    def _format_process(proc: subprocess.CompletedProcess[str], label: str) -> str:
        parts = [f"{label}\nexit code: {proc.returncode}"]
        if proc.stdout.strip():
            parts.append(f"--- stdout ---\n{proc.stdout.rstrip()}")
        if proc.stderr.strip():
            parts.append(f"--- stderr ---\n{proc.stderr.rstrip()}")
        if not proc.stdout.strip() and not proc.stderr.strip():
            parts.append("(no output)")
        return _truncate("\n".join(parts))


# --- tool schemas sent to the API ----------------------------------------
#
# Descriptions are prescriptive about *when* to call each tool, not just what it
# does — that measurably improves triggering.

TOOL_SCHEMAS: list[dict[str, Any]] = [
    {
        "name": "read_file",
        "description": (
            "Read a UTF-8 text file from the app workspace, or list a directory's "
            "contents when given a directory path. Call this before editing any "
            "file you have not already written in this session, so you edit "
            "against the real contents rather than an assumed version."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Path relative to the app root, e.g. 'src/App.tsx'.",
                },
                "start_line": {
                    "type": "integer",
                    "description": "Optional 1-indexed first line to return.",
                },
                "end_line": {
                    "type": "integer",
                    "description": "Optional 1-indexed last line to return (inclusive).",
                },
            },
            "required": ["path"],
        },
    },
    {
        "name": "write_file",
        "description": (
            "Write a file in the app workspace, creating parent directories as "
            "needed. The file is replaced in full, so always supply the complete "
            "intended contents — there is no partial-edit mode. Use this for every "
            "source file you add or change."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Path relative to the app root, e.g. 'src/components/Board.tsx'.",
                },
                "content": {
                    "type": "string",
                    "description": "Full file contents to write.",
                },
            },
            "required": ["path", "content"],
        },
    },
    {
        "name": "npm_build",
        "description": (
            "Install dependencies if missing and run the production build "
            "(tsc + vite build) in the app workspace. This is how you verify your "
            "work: call it after finishing a coherent chunk of code, read any "
            "TypeScript or bundler errors it returns, fix them, and call it again "
            "until it exits 0. Do not report the app as finished until this "
            "succeeds."
        ),
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "bash",
        "description": (
            "Run a bash command in the app workspace. Use it for things the other "
            "tools do not cover — listing files, grepping, checking a dependency "
            "version, adding an npm package with `npm install <pkg>`. Prefer "
            "npm_build over a hand-rolled build command."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "command": {
                    "type": "string",
                    "description": "The command to run, executed with `bash -lc` from the app root.",
                },
            },
            "required": ["command"],
        },
    },
]


def dispatch(workspace: Workspace, name: str, tool_input: dict[str, Any]) -> str:
    """Execute one client-side tool call and return its result text."""
    if name == "read_file":
        return workspace.read_file(
            tool_input["path"],
            tool_input.get("start_line"),
            tool_input.get("end_line"),
        )
    if name == "write_file":
        return workspace.write_file(tool_input["path"], tool_input["content"])
    if name == "npm_build":
        return workspace.npm_build()
    if name == "bash":
        return workspace.bash(tool_input["command"])
    raise ToolError(f"unknown tool {name!r}")
