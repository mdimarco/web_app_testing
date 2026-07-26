#!/usr/bin/env bash
# One-time setup: Python venv, pipeline deps, Playwright browser, warm template.
set -euo pipefail
cd "$(dirname "$0")/.."

PY="${PYTHON:-python3}"

if [[ ! -d .venv ]]; then
  echo "==> creating .venv"
  "$PY" -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate

echo "==> installing pipeline dependencies"
pip install --quiet --upgrade pip
pip install --quiet -r pipeline/requirements.txt

# In this repo's cloud environment Chromium is preinstalled at
# $PLAYWRIGHT_BROWSERS_PATH and PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD is set;
# elsewhere we need to fetch it.
if [[ "${PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD:-0}" != "1" ]]; then
  echo "==> installing Playwright Chromium"
  python -m playwright install chromium
else
  echo "==> using preinstalled Chromium at ${PLAYWRIGHT_BROWSERS_PATH:-default}"
fi

./scripts/warm_template.sh

echo
echo "Setup complete. Activate with:  source .venv/bin/activate"
echo "Then run:                       ./scripts/run_promptset.sh promptsets/v1"
