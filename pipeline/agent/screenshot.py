"""Screenshot a built app by serving its real production bundle.

The bundle is served from the exact subpath it will be deployed under, so a
broken `base` or an absolute `/asset.png` reference shows up here as a blank
page rather than after deploy.
"""

from __future__ import annotations

import contextlib
import functools
import http.server
import shutil
import socket
import socketserver
import tempfile
import threading
from dataclasses import dataclass
from pathlib import Path

DEFAULT_VIEWPORT = (1280, 900)


@dataclass
class ShotResult:
    ok: bool
    path: Path | None
    console_errors: list[str]
    page_errors: list[str]
    error: str | None = None


def _free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return int(s.getsockname()[1])


@contextlib.contextmanager
def _serve(root: Path):
    port = _free_port()
    handler = functools.partial(
        http.server.SimpleHTTPRequestHandler, directory=str(root)
    )

    class Quiet(socketserver.TCPServer):
        allow_reuse_address = True

        def handle_error(self, request, client_address):  # noqa: D102
            pass

    httpd = Quiet(("127.0.0.1", port), handler)
    # SimpleHTTPRequestHandler logs every request to stderr; silence it.
    handler.func.log_message = lambda *a, **k: None  # type: ignore[attr-defined]
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{port}"
    finally:
        httpd.shutdown()
        httpd.server_close()


def capture(
    dist_dir: Path,
    out_path: Path,
    *,
    base_path: str = "/",
    viewport: tuple[int, int] = DEFAULT_VIEWPORT,
    settle_ms: int = 1500,
    full_page: bool = False,
) -> ShotResult:
    """Render `dist_dir` at `base_path` and write a PNG to `out_path`.

    Returns ok=False (rather than raising) when Playwright is unavailable or the
    page fails, so a run can continue and report the failure.
    """
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return ShotResult(False, None, [], [], "playwright is not installed")

    index = dist_dir / "index.html"
    if not index.exists():
        return ShotResult(False, None, [], [], f"no index.html in {dist_dir}")

    out_path.parent.mkdir(parents=True, exist_ok=True)
    console_errors: list[str] = []
    page_errors: list[str] = []

    with tempfile.TemporaryDirectory() as tmp:
        # Mirror the deployed layout: <tmp>/apps/<id>/index.html
        mount = Path(tmp) / base_path.strip("/")
        mount.parent.mkdir(parents=True, exist_ok=True)
        shutil.copytree(dist_dir, mount, dirs_exist_ok=True)

        with _serve(Path(tmp)) as origin:
            url = f"{origin}{base_path if base_path.startswith('/') else '/' + base_path}"
            if not url.endswith("/"):
                url += "/"
            try:
                with sync_playwright() as pw:
                    browser = pw.chromium.launch(args=["--no-sandbox"])
                    page = browser.new_page(
                        viewport={"width": viewport[0], "height": viewport[1]},
                        device_scale_factor=2,
                    )
                    page.on(
                        "console",
                        lambda m: console_errors.append(m.text)
                        if m.type == "error"
                        else None,
                    )
                    page.on("pageerror", lambda e: page_errors.append(str(e)))

                    page.goto(url, wait_until="networkidle", timeout=30_000)
                    page.wait_for_timeout(settle_ms)
                    page.screenshot(path=str(out_path), full_page=full_page)
                    browser.close()
            except Exception as exc:  # noqa: BLE001 - a bad app must not kill the run
                return ShotResult(False, None, console_errors, page_errors,
                                  f"{type(exc).__name__}: {exc}")

    return ShotResult(True, out_path, console_errors, page_errors)
