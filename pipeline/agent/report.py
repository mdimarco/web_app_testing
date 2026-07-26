"""Generate the HTML overview for a pipeline run.

The report is written to `runs/<run_id>/report.html` with only relative links,
so the same file works from the local gallery container and from GitHub Pages
once `scripts/publish.sh` has assembled `site/`.
"""

from __future__ import annotations

import html
import json
from pathlib import Path
from typing import Any

STATUS_LABEL = {
    "ok": ("Built", "ok"),
    "build_failed": ("Build failed", "bad"),
    "agent_failed": ("Agent stopped early", "warn"),
    "error": ("Error", "bad"),
}

CSS = """
*,*::before,*::after{box-sizing:border-box}
:root{
  color-scheme:light dark;
  --bg:#fbfaf7; --surface:#fff; --line:#e6e2d9; --ink:#1c1a17; --muted:#6b6459;
  --ok:#1f7a4d; --warn:#96650d; --bad:#a3302a; --accent:#8a4b2a;
  --radius:10px;
}
@media (prefers-color-scheme:dark){
  :root{--bg:#141311;--surface:#1d1b18;--line:#33302a;--ink:#f0ece4;--muted:#9d968a;
        --ok:#5fc08c;--warn:#e0ac4d;--bad:#e8837c;--accent:#d99a6c}
}
:root[data-theme="dark"]{--bg:#141311;--surface:#1d1b18;--line:#33302a;--ink:#f0ece4;
  --muted:#9d968a;--ok:#5fc08c;--warn:#e0ac4d;--bad:#e8837c;--accent:#d99a6c}
:root[data-theme="light"]{--bg:#fbfaf7;--surface:#fff;--line:#e6e2d9;--ink:#1c1a17;
  --muted:#6b6459;--ok:#1f7a4d;--warn:#96650d;--bad:#a3302a;--accent:#8a4b2a}

body{margin:0;background:var(--bg);color:var(--ink);
  font:16px/1.55 ui-serif,Georgia,"Iowan Old Style",serif;overflow-x:hidden}
.wrap{max-width:1080px;margin:0 auto;padding:48px 24px 96px}
h1{font-size:clamp(28px,4vw,40px);line-height:1.15;margin:0 0 6px;letter-spacing:-.02em}
h2{font-size:20px;margin:0 0 4px;letter-spacing:-.01em}
.sub{color:var(--muted);margin:0 0 32px;font-size:15px}
.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px}

.stats{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 40px;padding:0;list-style:none}
.stat{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);
  padding:12px 16px;min-width:120px}
.stat b{display:block;font-size:22px;font-variant-numeric:tabular-nums;line-height:1.2}
.stat span{color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.07em;
  font-family:ui-sans-serif,system-ui,sans-serif}

.card{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);
  margin:0 0 28px;overflow:hidden}
.card-head{display:flex;flex-wrap:wrap;gap:12px;align-items:baseline;
  justify-content:space-between;padding:20px 22px 14px}
.badge{font-family:ui-sans-serif,system-ui,sans-serif;font-size:11px;font-weight:600;
  letter-spacing:.06em;text-transform:uppercase;padding:4px 9px;border-radius:99px;
  border:1px solid currentColor;white-space:nowrap}
.badge.ok{color:var(--ok)} .badge.warn{color:var(--warn)} .badge.bad{color:var(--bad)}

.card-body{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.1fr);gap:22px;
  padding:0 22px 22px}
@media (max-width:820px){.card-body{grid-template-columns:1fr}}

.prompt{white-space:pre-wrap;background:color-mix(in srgb,var(--ink) 4%,transparent);
  border:1px solid var(--line);border-radius:8px;padding:14px 16px;font-size:14px;
  max-height:340px;overflow:auto;margin:0}
.label{font-family:ui-sans-serif,system-ui,sans-serif;font-size:11px;font-weight:600;
  letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin:0 0 7px}

/* Fixed aspect so cards stay uniform regardless of screenshot height. */
.shot{display:block;width:100%;aspect-ratio:16/10;object-fit:cover;object-position:top;
  border:1px solid var(--line);border-radius:8px;
  background:color-mix(in srgb,var(--ink) 4%,transparent)}
.shot-missing{display:grid;place-items:center;aspect-ratio:16/10;border:1px dashed var(--line);
  border-radius:8px;padding:16px;text-align:center;color:var(--muted);font-size:14px}

.actions{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:14px}
a.btn{display:inline-block;font-family:ui-sans-serif,system-ui,sans-serif;font-size:14px;
  font-weight:600;text-decoration:none;color:var(--bg);background:var(--accent);
  padding:9px 16px;border-radius:7px;transition:transform .12s ease,opacity .12s ease}
a.btn:hover{transform:translateY(-1px);opacity:.92}
a.btn.ghost{background:transparent;color:var(--accent);border:1px solid var(--accent)}
a.btn[aria-disabled="true"]{opacity:.4;pointer-events:none}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}

.meta{display:flex;flex-wrap:wrap;gap:6px 18px;margin:14px 0 0;padding:0;list-style:none;
  color:var(--muted);font-family:ui-sans-serif,system-ui,sans-serif;font-size:12.5px}
.meta b{color:var(--ink);font-weight:600;font-variant-numeric:tabular-nums}

details{margin-top:14px;border-top:1px solid var(--line);padding-top:12px}
summary{cursor:pointer;font-family:ui-sans-serif,system-ui,sans-serif;font-size:13px;
  color:var(--muted);font-weight:600}
summary:hover{color:var(--ink)}
details pre{white-space:pre-wrap;font-size:12.5px;margin:10px 0 0;padding:12px;
  background:color-mix(in srgb,var(--ink) 5%,transparent);border-radius:7px;
  max-height:300px;overflow:auto}
.err{color:var(--bad)}
footer{margin-top:56px;padding-top:20px;border-top:1px solid var(--line);
  color:var(--muted);font-size:13px;font-family:ui-sans-serif,system-ui,sans-serif}
"""


def _e(value: Any) -> str:
    return html.escape(str(value if value is not None else ""))


def _app_card(app: dict[str, Any], depth_to_root: str) -> str:
    label, tone = STATUS_LABEL.get(app.get("status", "error"), ("Unknown", "warn"))
    app_href = f"{depth_to_root}apps/{app['app_id']}/"
    shot = app.get("screenshot")
    usage = app.get("usage") or {}

    if shot:
        preview = (
            f'<a href="{_e(app_href)}"><img class="shot" loading="lazy" '
            f'src="{_e(shot)}" alt="Screenshot of {_e(app["title"])}"></a>'
        )
    else:
        preview = (
            '<div class="shot-missing">No screenshot — the app did not build, '
            "or Playwright was unavailable.</div>"
        )

    meta_bits = [
        f"<li>Iterations <b>{_e(app.get('iterations', 0))}</b></li>",
        f"<li>Duration <b>{_e(app.get('elapsed_seconds', 0))}s</b></li>",
        f"<li>Output <b>{usage.get('output_tokens', 0):,}</b> tok</li>",
        f"<li>Est. cost <b>${app.get('estimated_cost_usd', 0):.2f}</b></li>",
        f"<li>Stop <b>{_e(app.get('agent_stop_reason'))}</b></li>",
    ]

    extras: list[str] = []
    if app.get("final_message"):
        extras.append(
            "<details><summary>Agent's closing message</summary>"
            f"<pre>{_e(app['final_message'])}</pre></details>"
        )
    if app.get("agent_error"):
        extras.append(
            '<details open><summary class="err">Agent error</summary>'
            f"<pre class=\"err\">{_e(app['agent_error'])}</pre></details>"
        )
    if not app.get("build_ok") and app.get("build_log_tail"):
        extras.append(
            '<details open><summary class="err">Build output</summary>'
            f"<pre class=\"err\">{_e(app['build_log_tail'])}</pre></details>"
        )
    errs = (app.get("console_errors") or []) + (app.get("page_errors") or [])
    if errs:
        extras.append(
            f'<details><summary class="err">{len(errs)} runtime console '
            "error(s) at screenshot time</summary><pre class=\"err\">"
            + _e("\n".join(errs))
            + "</pre></details>"
        )
    if app.get("transcript"):
        extras.append(
            f'<details><summary>Transcript</summary><p class="mono">'
            f"{_e(app['transcript'])}</p></details>"
        )

    disabled = "" if app.get("build_ok") else ' aria-disabled="true"'
    return f"""
    <article class="card">
      <div class="card-head">
        <div>
          <h2>{_e(app['title'])}</h2>
          <p class="mono" style="margin:2px 0 0;color:var(--muted)">{_e(app['app_id'])}</p>
        </div>
        <span class="badge {tone}">{_e(label)}</span>
      </div>
      <div class="card-body">
        <div>
          <p class="label">Prompt</p>
          <pre class="prompt">{_e(app['prompt'])}</pre>
          <ul class="meta">{''.join(meta_bits)}</ul>
        </div>
        <div>
          <p class="label">Output</p>
          {preview}
          <div class="actions">
            <a class="btn" href="{_e(app_href)}"{disabled}>Open the app</a>
            <a class="btn ghost" href="{_e(app_href)}" target="_blank"
               rel="noopener"{disabled}>New tab</a>
          </div>
        </div>
      </div>
      <div style="padding:0 22px 20px">{''.join(extras)}</div>
    </article>"""


def render(manifest: dict[str, Any], depth_to_root: str = "../../") -> str:
    """Render the run report. `depth_to_root` is the path from the report to site root."""
    apps = manifest.get("apps", [])
    totals = manifest.get("totals", {})
    pset = manifest.get("promptset", {})

    stats = [
        (f"{totals.get('ok', 0)}/{totals.get('apps', len(apps))}", "Apps built"),
        (manifest.get("model", "—"), "Model"),
        (manifest.get("effort", "—"), "Effort"),
        (f"{totals.get('output_tokens', 0):,}", "Output tokens"),
        (f"${totals.get('estimated_cost_usd', 0):.2f}", "Est. cost"),
        (f"{manifest.get('duration_seconds', 0):.0f}s", "Wall clock"),
    ]
    stat_html = "".join(
        f'<li class="stat"><b>{_e(v)}</b><span>{_e(k)}</span></li>' for v, k in stats
    )

    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Run {_e(manifest.get('run_id'))} — {_e(pset.get('name'))}</title>
<style>{CSS}</style>
</head>
<body>
<div class="wrap">
  <header>
    <h1>{_e(pset.get('name') or pset.get('id'))}</h1>
    <p class="sub">
      Run <span class="mono">{_e(manifest.get('run_id'))}</span> ·
      finished {_e(manifest.get('finished_at'))}<br>
      {_e(pset.get('description'))}
    </p>
    <ul class="stats">{stat_html}</ul>
  </header>
  <main>
    {''.join(_app_card(a, depth_to_root) for a in apps)}
  </main>
  <footer>
    <p>Promptset <span class="mono">{_e(pset.get('path'))}</span> ·
       Generated by the web_app_testing agent pipeline.
       Full run data in <span class="mono">manifest.json</span>.</p>
    <details>
      <summary>System prompt used for this run</summary>
      <pre>{_e(manifest.get('system_prompt'))}</pre>
    </details>
  </footer>
</div>
</body>
</html>
"""


def write_report(run_dir: Path, manifest: dict[str, Any]) -> Path:
    out = run_dir / "report.html"
    out.write_text(render(manifest), encoding="utf-8")
    return out


def main(argv: list[str] | None = None) -> int:
    """Regenerate a report from an existing manifest: python -m agent.report <run_dir>"""
    import argparse

    ap = argparse.ArgumentParser(prog="python -m agent.report")
    ap.add_argument("run_dir", type=Path)
    args = ap.parse_args(argv)

    manifest_path = args.run_dir / "manifest.json"
    if not manifest_path.exists():
        raise SystemExit(f"no manifest.json in {args.run_dir}")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    print(write_report(args.run_dir, manifest))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
