#!/usr/bin/env bash
# Open one generated app in the standard Docker dev environment with HMR.
#
#   ./scripts/dev.sh v1-kanban        -> http://localhost:5173
#   ./scripts/dev.sh v1-kanban preview -> production build on :4173
set -euo pipefail
cd "$(dirname "$0")/.."

APP_ID="${1:-}"
MODE="${2:-dev}"
[[ -n "$APP_ID" ]] || { echo "usage: $0 <app-id> [dev|preview|build|shell]" >&2; exit 2; }
[[ -d "apps/$APP_ID" ]] || { echo "no such app: apps/$APP_ID" >&2; exit 1; }

docker build -q -t webapp-env:latest docker/ >/dev/null

PORT=5173
[[ "$MODE" == "preview" ]] && PORT=4173

echo "==> $APP_ID [$MODE] on http://localhost:$PORT"
exec docker run --rm -it \
  -v "$PWD/apps/$APP_ID:/app" \
  -v "webapp_node_modules_$APP_ID:/app/node_modules" \
  -p "$PORT:$PORT" \
  -e VITE_BASE=/ \
  webapp-env:latest "$MODE"
