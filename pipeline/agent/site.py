"""Assemble the publishable site: every built app, every run report, and an index.

Layout produced under `site/`:

    site/vercel.json                 routing + caching for the deployed site
    site/index.html                  gallery of apps + list of runs
    site/apps/<app-id>/              each app's Vite dist output
    site/runs/<run-id>/report.html   run reports, with screenshots alongside

The tree is entirely relative-linked, so the same directory works served from
the local `gallery` container, from `python -m http.server`, and from Vercel.
"""

from __future__ import annotations

import argparse
import html
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
APPS_DIR = REPO_ROOT / "apps"
RUNS_DIR = REPO_ROOT / "runs"
SITE_DIR = REPO_ROOT / "site"

# Written to site/vercel.json on every assemble, so the deployed directory is
# self-describing and `vercel deploy site` needs no extra flags.
#
# `rewrites` are evaluated *after* the filesystem check, so real files (hashed
# assets, screenshots, manifests) still serve directly; only unmatched paths
# inside an app fall through to that app's index.html. That gives each app its
# own SPA fallback without one app's routes swallowing another's.
VERCEL_CONFIG: dict[str, Any] = {
    "$schema": "https://openapi.vercel.sh/vercel.json",
    # No `trailingSlash`: with it set, a rewrite whose destination ends in
    # `.html` gets normalized to `…/index.html/` and 404s. Every link we emit
    # already ends in `/`, and directory indexes resolve without it.
    "rewrites": [
        {"source": "/apps/:appId/(.*)", "destination": "/apps/:appId/index.html"},
    ],
    "headers": [
        # Order matters: when several rules match, later ones win for the same
        # header key. The catch-all must come FIRST so the assets rule below can
        # override it — reversed, every hashed asset silently gets max-age=0.
        {
            # Republished in place on every deploy, so must revalidate.
            "source": "/(.*)",
            "headers": [
                {"key": "Cache-Control", "value": "public, max-age=0, must-revalidate"},
            ],
        },
        {
            # Vite fingerprints these filenames, so they can be cached forever.
            "source": "/apps/:appId/assets/(.*)",
            "headers": [
                {"key": "Cache-Control", "value": "public, max-age=31536000, immutable"},
            ],
        },
    ],
}

INDEX_CSS = """
*,*::before,*::after{box-sizing:border-box}
:root{color-scheme:light dark;--bg:#fbfaf7;--surface:#fff;--line:#e6e2d9;--ink:#1c1a17;
  --muted:#6b6459;--accent:#8a4b2a}
@media (prefers-color-scheme:dark){:root{--bg:#141311;--surface:#1d1b18;--line:#33302a;
  --ink:#f0ece4;--muted:#9d968a;--accent:#d99a6c}}
:root[data-theme="dark"]{--bg:#141311;--surface:#1d1b18;--line:#33302a;--ink:#f0ece4;
  --muted:#9d968a;--accent:#d99a6c}
:root[data-theme="light"]{--bg:#fbfaf7;--surface:#fff;--line:#e6e2d9;--ink:#1c1a17;
  --muted:#6b6459;--accent:#8a4b2a}
body{margin:0;background:var(--bg);color:var(--ink);
  font:16px/1.55 ui-serif,Georgia,"Iowan Old Style",serif;overflow-x:hidden}
.wrap{max-width:1080px;margin:0 auto;padding:56px 24px 96px}
h1{font-size:clamp(30px,5vw,46px);margin:0 0 8px;letter-spacing:-.025em}
h2{font-size:15px;font-family:ui-sans-serif,system-ui,sans-serif;text-transform:uppercase;
  letter-spacing:.09em;color:var(--muted);margin:52px 0 18px;font-weight:600}
p.sub{color:var(--muted);margin:0 0 8px;max-width:62ch}
.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:18px}
.tile{display:block;text-decoration:none;color:inherit;background:var(--surface);
  border:1px solid var(--line);border-radius:10px;overflow:hidden;
  transition:transform .14s ease,border-color .14s ease}
.tile:hover{transform:translateY(-2px);border-color:var(--accent)}
.tile img{display:block;width:100%;aspect-ratio:16/10;object-fit:cover;object-position:top;
  border-bottom:1px solid var(--line);background:color-mix(in srgb,var(--ink) 5%,transparent)}
.tile .none{display:grid;place-items:center;width:100%;aspect-ratio:16/10;color:var(--muted);
  font-size:13px;border-bottom:1px solid var(--line);
  background:color-mix(in srgb,var(--ink) 5%,transparent)}
.tile .cap{padding:13px 15px}
.tile .cap b{display:block;font-size:16px;letter-spacing:-.01em}
.tile .cap span{color:var(--muted);font-size:12px;font-family:ui-monospace,Menlo,monospace}
ul.runs{list-style:none;padding:0;margin:0;display:grid;gap:10px}
ul.runs a{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:baseline;
  text-decoration:none;color:inherit;background:var(--surface);border:1px solid var(--line);
  border-radius:9px;padding:14px 17px;transition:border-color .14s ease}
ul.runs a:hover{border-color:var(--accent)}
ul.runs b{letter-spacing:-.01em}
ul.runs span{color:var(--muted);font-size:13px;
  font-family:ui-sans-serif,system-ui,sans-serif}
.empty{color:var(--muted);border:1px dashed var(--line);border-radius:10px;padding:26px;
  text-align:center}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
footer{margin-top:64px;padding-top:20px;border-top:1px solid var(--line);color:var(--muted);
  font-size:13px;font-family:ui-sans-serif,system-ui,sans-serif}
"""


def _e(v: Any) -> str:
    return html.escape(str(v if v is not None else ""))


def _load_runs() -> list[dict[str, Any]]:
    runs = []
    if not RUNS_DIR.exists():
        return runs
    for manifest_path in sorted(RUNS_DIR.glob("*/manifest.json")):
        try:
            runs.append(json.loads(manifest_path.read_text(encoding="utf-8")))
        except json.JSONDecodeError:
            continue
    runs.sort(key=lambda m: m.get("finished_at", ""), reverse=True)
    return runs


def _screenshot_for(app_id: str, runs: list[dict[str, Any]]) -> str | None:
    """Newest screenshot across all runs for this app id, as a site-relative path."""
    for manifest in runs:
        for app in manifest.get("apps", []):
            if app.get("app_id") == app_id and app.get("screenshot"):
                return f"runs/{manifest['run_id']}/{app['screenshot']}"
    return None


def build(clean: bool = True) -> Path:
    runs = _load_runs()

    if clean and SITE_DIR.exists():
        # Preserve the Vercel project link across rebuilds. Without this, a
        # re-assemble deletes site/.vercel and the next deploy silently creates
        # a brand-new project named after the directory ("site") instead of
        # updating the real one.
        for entry in SITE_DIR.iterdir():
            if entry.name == ".vercel":
                continue
            shutil.rmtree(entry) if entry.is_dir() else entry.unlink()
    SITE_DIR.mkdir(parents=True, exist_ok=True)
    (SITE_DIR / "vercel.json").write_text(
        json.dumps(VERCEL_CONFIG, indent=2) + "\n", encoding="utf-8"
    )

    # 1. Apps — copy each dist/ that exists.
    published: list[str] = []
    if APPS_DIR.exists():
        for app_dir in sorted(p for p in APPS_DIR.iterdir() if p.is_dir()):
            dist = app_dir / "dist"
            if not (dist / "index.html").exists():
                print(f"  skip {app_dir.name}: no dist/index.html (build it first)")
                continue
            shutil.copytree(dist, SITE_DIR / "apps" / app_dir.name, dirs_exist_ok=True)
            published.append(app_dir.name)

    # 2. Run reports + their screenshots.
    for manifest in runs:
        run_id = manifest["run_id"]
        src = RUNS_DIR / run_id
        dst = SITE_DIR / "runs" / run_id
        dst.mkdir(parents=True, exist_ok=True)
        for name in ("report.html", "manifest.json"):
            if (src / name).exists():
                shutil.copy2(src / name, dst / name)
        if (src / "screenshots").exists():
            shutil.copytree(src / "screenshots", dst / "screenshots", dirs_exist_ok=True)

    # 3. Index.
    titles: dict[str, str] = {}
    for manifest in reversed(runs):
        for app in manifest.get("apps", []):
            titles[app["app_id"]] = app.get("title") or app["app_id"]

    if published:
        tiles = []
        for app_id in published:
            shot = _screenshot_for(app_id, runs)
            media = (
                f'<img loading="lazy" src="{_e(shot)}" alt="">'
                if shot
                else '<div class="none">no screenshot</div>'
            )
            tiles.append(
                f'<a class="tile" href="apps/{_e(app_id)}/">{media}'
                f'<div class="cap"><b>{_e(titles.get(app_id, app_id))}</b>'
                f"<span>{_e(app_id)}</span></div></a>"
            )
        apps_html = f'<div class="grid">{"".join(tiles)}</div>'
    else:
        apps_html = (
            '<div class="empty">No built apps yet. Run a promptset, then '
            "<span class=\"mono\">./scripts/publish.sh</span>.</div>"
        )

    if runs:
        items = []
        for m in runs:
            t = m.get("totals", {})
            items.append(
                f'<li><a href="runs/{_e(m["run_id"])}/report.html">'
                f'<b>{_e(m.get("promptset", {}).get("name", m["run_id"]))}</b>'
                f'<span class="mono">{_e(m["run_id"])}</span>'
                f'<span>{t.get("ok", 0)}/{t.get("apps", 0)} built · '
                f'{_e(m.get("model"))} · {_e(m.get("finished_at", "")[:16])}</span>'
                "</a></li>"
            )
        runs_html = f'<ul class="runs">{"".join(items)}</ul>'
    else:
        runs_html = '<div class="empty">No runs recorded yet.</div>'

    index = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>web_app_testing — generated apps</title>
<style>{INDEX_CSS}</style>
</head>
<body>
<div class="wrap">
  <h1>Generated apps</h1>
  <p class="sub">A staging ground for React apps produced by the agent pipeline.
     Each tile opens a live, interactive build; each run links to a full report
     with the prompt behind every app.</p>
  <h2>Apps ({len(published)})</h2>
  {apps_html}
  <h2>Pipeline runs ({len(runs)})</h2>
  {runs_html}
  <footer>Built {_e(datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC'))}</footer>
</div>
</body>
</html>
"""
    (SITE_DIR / "index.html").write_text(index, encoding="utf-8")
    print(f"site/ assembled: {len(published)} app(s), {len(runs)} run(s)")
    return SITE_DIR


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="python -m agent.site")
    ap.add_argument("--no-clean", action="store_true",
                    help="Merge into an existing site/ instead of rebuilding it")
    args = ap.parse_args(argv)
    build(clean=not args.no_clean)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
