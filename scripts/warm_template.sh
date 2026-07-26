#!/usr/bin/env bash
# Install the template's node_modules once. New app workspaces hardlink from it
# (cp -al), which turns a ~30s npm install per app into a near-instant copy.
# Re-run this after changing template/package.json.
set -euo pipefail
cd "$(dirname "$0")/../template"

echo "==> warming template/node_modules"
if [[ -f package-lock.json ]]; then
  npm ci --no-fund --no-audit
else
  npm install --no-fund --no-audit
fi
echo "==> done ($(du -sh node_modules | cut -f1))"
