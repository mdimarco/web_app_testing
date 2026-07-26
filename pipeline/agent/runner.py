"""Run a promptset end to end: scaffold -> agent -> build -> screenshot -> report."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import anthropic

from . import report as report_mod
from . import screenshot
from .loop import DEFAULT_MODEL, LoopLimits, run_agent
from .promptset import Prompt, Promptset
from .tools import Workspace

REPO_ROOT = Path(__file__).resolve().parents[2]
TEMPLATE_DIR = REPO_ROOT / "template"
APPS_DIR = REPO_ROOT / "apps"
RUNS_DIR = REPO_ROOT / "runs"
DEFAULT_SI = Path(__file__).with_name("system_prompt.md")

# Vercel serves the assembled site/ at the domain root, so apps live at
# /apps/<id>/ with no repo-name prefix. Override with --site-prefix (or
# SITE_PREFIX) if you host the same tree under a subpath instead.
DEFAULT_SITE_PREFIX = ""


@dataclass
class AppResult:
    app_id: str
    prompt_id: str
    title: str
    prompt: str
    status: str                      # "ok" | "build_failed" | "agent_failed" | "error"
    agent_stop_reason: str = ""
    agent_error: str | None = None
    iterations: int = 0
    elapsed_seconds: float = 0.0
    usage: dict[str, int] = field(default_factory=dict)
    estimated_cost_usd: float = 0.0
    tool_call_counts: dict[str, int] = field(default_factory=dict)
    final_message: str = ""
    build_ok: bool = False
    build_log_tail: str = ""
    screenshot: str | None = None    # path relative to the run directory
    console_errors: list[str] = field(default_factory=list)
    page_errors: list[str] = field(default_factory=list)
    app_url: str = ""
    transcript: str | None = None


def _now_slug() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")


def scaffold(app_dir: Path, *, force: bool = False) -> None:
    """Create a fresh app workspace from the template."""
    if app_dir.exists():
        if not force:
            raise SystemExit(
                f"{app_dir} already exists; pass --force to overwrite it"
            )
        shutil.rmtree(app_dir)
    app_dir.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(
        TEMPLATE_DIR,
        app_dir,
        ignore=shutil.ignore_patterns("node_modules", "dist", ".vite"),
    )

    # Hardlink a prewarmed node_modules if one exists (see scripts/warm_template.sh).
    # Saves a full npm install per app; falls back silently to a normal install.
    warm = TEMPLATE_DIR / "node_modules"
    if warm.is_dir():
        try:
            subprocess.run(
                ["cp", "-al", str(warm), str(app_dir / "node_modules")],
                check=True,
                capture_output=True,
            )
        except (subprocess.CalledProcessError, FileNotFoundError):
            pass


def build_for_deploy(app_dir: Path, base: str, timeout: int = 600) -> tuple[bool, str]:
    """Build the app with the deployment base path baked in."""
    env = {**os.environ, "VITE_BASE": base, "NODE_ENV": "production", "CI": "true"}
    if not (app_dir / "node_modules").exists():
        install = subprocess.run(
            ["npm", "install", "--no-fund", "--no-audit"],
            cwd=app_dir, capture_output=True, text=True, timeout=timeout, env=env,
        )
        if install.returncode != 0:
            return False, (install.stdout + install.stderr)[-4000:]
    proc = subprocess.run(
        ["npm", "run", "build"],
        cwd=app_dir, capture_output=True, text=True, timeout=timeout, env=env,
    )
    return proc.returncode == 0, (proc.stdout + proc.stderr)[-4000:]


def run_one(
    prompt: Prompt,
    *,
    app_id: str,
    system_prompt: str,
    run_dir: Path,
    site_prefix: str,
    model: str,
    effort: str,
    limits: LoopLimits,
    enable_web_search: bool,
    force: bool,
    echo: bool,
) -> AppResult:
    app_dir = APPS_DIR / app_id
    base = f"{site_prefix.rstrip('/')}/apps/{app_id}/"
    result = AppResult(
        app_id=app_id,
        prompt_id=prompt.id,
        title=prompt.title,
        prompt=prompt.prompt,
        status="error",
        app_url=base,
    )

    print(f"\n=== {app_id} — {prompt.title}")
    try:
        scaffold(app_dir, force=force)
    except SystemExit as exc:
        result.agent_error = str(exc)
        return result

    trace_path = run_dir / "transcripts" / f"{app_id}.jsonl"
    workspace = Workspace(root=app_dir)

    loop_result = run_agent(
        prompt=prompt.prompt,
        system_prompt=system_prompt,
        workspace=workspace,
        model=model,
        effort=effort,
        limits=limits,
        enable_web_search=enable_web_search,
        trace_path=trace_path,
        echo=echo,
    )

    result.agent_stop_reason = loop_result.stop_reason
    result.agent_error = loop_result.error
    result.iterations = loop_result.iterations
    result.elapsed_seconds = round(loop_result.elapsed_seconds, 1)
    result.usage = loop_result.usage.as_dict()
    result.estimated_cost_usd = round(loop_result.usage.estimated_cost_usd(), 4)
    result.tool_call_counts = loop_result.tool_call_counts
    result.final_message = loop_result.final_text
    result.transcript = str(trace_path.relative_to(run_dir))

    # Always attempt the deploy build, even after a bad agent stop — a run that
    # hit max_iterations may still have produced a working app.
    print(f"  building for {base}")
    try:
        build_ok, build_log = build_for_deploy(app_dir, base)
    except subprocess.TimeoutExpired:
        build_ok, build_log = False, "build timed out"
    result.build_ok = build_ok
    result.build_log_tail = build_log[-2000:]

    if not build_ok:
        result.status = "build_failed" if loop_result.ok else "agent_failed"
        print("  build FAILED")
        return result

    print("  screenshotting")
    shot_path = run_dir / "screenshots" / f"{app_id}.png"
    shot = screenshot.capture(app_dir / "dist", shot_path, base_path=base)
    result.console_errors = shot.console_errors[:20]
    result.page_errors = shot.page_errors[:20]
    if shot.ok and shot.path:
        result.screenshot = str(shot.path.relative_to(run_dir))
    elif shot.error:
        print(f"  screenshot unavailable: {shot.error}")

    result.status = "ok" if loop_result.ok else "agent_failed"
    return result


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(
        prog="python -m agent.runner",
        description="Run a versioned promptset through the app-building agent.",
    )
    ap.add_argument("promptset", help="Path to a promptset directory or promptset.yaml")
    ap.add_argument("--model", default=None, help=f"default: {DEFAULT_MODEL}")
    ap.add_argument("--effort", default=None,
                    choices=["low", "medium", "high", "xhigh", "max"])
    ap.add_argument("--only", nargs="*", metavar="PROMPT_ID",
                    help="Run only these prompt ids")
    ap.add_argument("--tag", default="",
                    help="Suffix appended to app ids, e.g. --tag v2")
    ap.add_argument("--parallel", type=int, default=1,
                    help="Number of apps to build concurrently")
    ap.add_argument("--max-iterations", type=int, default=None)
    ap.add_argument("--site-prefix", default=os.environ.get("SITE_PREFIX", DEFAULT_SITE_PREFIX),
                    help="URL prefix the site is served under (empty for a domain root)")
    ap.add_argument("--no-web-search", action="store_true")
    ap.add_argument("--force", action="store_true",
                    help="Overwrite existing app directories")
    ap.add_argument("--run-id", default=None)
    ap.add_argument("--quiet", action="store_true")
    args = ap.parse_args(argv)

    if not os.environ.get("ANTHROPIC_API_KEY") and not os.environ.get("ANTHROPIC_AUTH_TOKEN"):
        print(
            "warning: ANTHROPIC_API_KEY is unset — the SDK will fall back to an "
            "`ant auth login` profile if one exists.",
            file=sys.stderr,
        )

    pset = Promptset.load(args.promptset)
    defaults = pset.defaults
    model = args.model or defaults.get("model") or DEFAULT_MODEL
    effort = args.effort or defaults.get("effort") or "high"
    limits = LoopLimits(
        max_iterations=args.max_iterations
        or int(defaults.get("max_iterations", LoopLimits.max_iterations)),
        max_output_tokens_per_turn=int(
            defaults.get("max_output_tokens_per_turn",
                         LoopLimits.max_output_tokens_per_turn)
        ),
        max_total_output_tokens=int(
            defaults.get("max_total_output_tokens",
                         LoopLimits.max_total_output_tokens)
        ),
        wall_clock_seconds=int(
            defaults.get("wall_clock_seconds", LoopLimits.wall_clock_seconds)
        ),
    )
    system_prompt = pset.system_prompt or DEFAULT_SI.read_text(encoding="utf-8")
    enable_web_search = not args.no_web_search and defaults.get("web_search", True)

    prompts = pset.prompts
    if args.only:
        wanted = set(args.only)
        prompts = [p for p in prompts if p.id in wanted]
        missing = wanted - {p.id for p in prompts}
        if missing:
            raise SystemExit(f"no such prompt id(s): {', '.join(sorted(missing))}")
    if not prompts:
        raise SystemExit("nothing to run")

    run_id = args.run_id or f"{pset.id}-{_now_slug()}"
    run_dir = RUNS_DIR / run_id
    (run_dir / "transcripts").mkdir(parents=True, exist_ok=True)
    (run_dir / "screenshots").mkdir(parents=True, exist_ok=True)

    suffix = f"-{args.tag}" if args.tag else ""
    started = time.time()

    print(f"run {run_id}: {len(prompts)} prompt(s), model={model}, effort={effort}")

    def task(p: Prompt) -> AppResult:
        return run_one(
            p,
            app_id=f"{pset.id}-{p.id}{suffix}",
            system_prompt=system_prompt,
            run_dir=run_dir,
            site_prefix=args.site_prefix,
            model=model,
            effort=effort,
            limits=limits,
            enable_web_search=enable_web_search,
            force=args.force,
            echo=not args.quiet,
        )

    results: list[AppResult] = []
    if args.parallel > 1:
        with ThreadPoolExecutor(max_workers=args.parallel) as pool:
            futures = {pool.submit(task, p): p for p in prompts}
            for fut in as_completed(futures):
                p = futures[fut]
                try:
                    results.append(fut.result())
                except Exception as exc:  # noqa: BLE001
                    results.append(
                        AppResult(
                            app_id=f"{pset.id}-{p.id}{suffix}", prompt_id=p.id,
                            title=p.title, prompt=p.prompt, status="error",
                            agent_error=f"{type(exc).__name__}: {exc}",
                        )
                    )
        order = {p.id: i for i, p in enumerate(prompts)}
        results.sort(key=lambda r: order.get(r.prompt_id, 0))
    else:
        for p in prompts:
            results.append(task(p))

    manifest: dict[str, Any] = {
        "run_id": run_id,
        "promptset": {
            "id": pset.id,
            "name": pset.name,
            "description": pset.description,
            "path": str(pset.path.relative_to(REPO_ROOT)),
        },
        "model": model,
        "effort": effort,
        "web_search": enable_web_search,
        "limits": asdict(limits),
        "system_prompt": system_prompt,
        "site_prefix": args.site_prefix,
        "started_at": datetime.fromtimestamp(started, timezone.utc).isoformat(),
        "finished_at": datetime.now(timezone.utc).isoformat(),
        "duration_seconds": round(time.time() - started, 1),
        "apps": [asdict(r) for r in results],
        "totals": {
            "apps": len(results),
            "ok": sum(1 for r in results if r.status == "ok"),
            "output_tokens": sum(r.usage.get("output_tokens", 0) for r in results),
            "input_tokens": sum(r.usage.get("input_tokens", 0) for r in results),
            "estimated_cost_usd": round(
                sum(r.estimated_cost_usd for r in results), 4
            ),
        },
    }
    (run_dir / "manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    report_path = report_mod.write_report(run_dir, manifest)

    ok = manifest["totals"]["ok"]
    print(f"\n{ok}/{len(results)} apps built cleanly")
    print(f"manifest: {run_dir / 'manifest.json'}")
    print(f"report:   {report_path}")
    print("\nNext: ./scripts/deploy_vercel.sh   (assemble site/ and deploy)")
    print("  or: ./scripts/publish.sh --serve  (assemble site/ and serve locally)")
    return 0 if ok == len(results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
