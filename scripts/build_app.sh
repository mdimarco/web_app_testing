#!/usr/bin/env bash
# Build one app for deployment (with the deploy base path baked in).
#
#   ./scripts/build_app.sh v1-kanban
#   ./scripts/build_app.sh --all
#
# Uses the Docker image when USE_DOCKER=1, otherwise the host's node.
set -euo pipefail
cd "$(dirname "$0")/.."

# Empty by default: the site deploys at a domain root on Vercel, so apps live at
# /apps/<id>/. Set SITE_PREFIX=/some/path to host the tree under a subpath.
SITE_PREFIX="${SITE_PREFIX:-}"

build_one() {
  local app_id="$1"
  local dir="apps/$app_id"
  [[ -d "$dir" ]] || { echo "no such app: $app_id" >&2; return 1; }
  local base="${SITE_PREFIX%/}/apps/$app_id/"
  echo "==> $app_id  (base=$base)"

  if [[ "${USE_DOCKER:-0}" == "1" ]]; then
    docker run --rm \
      -v "$PWD/$dir:/app" \
      -e "VITE_BASE=$base" \
      webapp-env:latest build
  else
    ( cd "$dir" && [[ -d node_modules ]] || npm install --no-fund --no-audit )
    ( cd "$dir" && VITE_BASE="$base" npm run build )
  fi
}

if [[ "${1:-}" == "--all" ]]; then
  shopt -s nullglob
  for d in apps/*/; do
    build_one "$(basename "$d")"
  done
else
  [[ $# -ge 1 ]] || { echo "usage: $0 <app-id> | --all" >&2; exit 2; }
  build_one "$1"
fi
