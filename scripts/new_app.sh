#!/usr/bin/env bash
# Scaffold an app workspace by hand (the pipeline does this automatically).
#
#   ./scripts/new_app.sh my-experiment
set -euo pipefail
cd "$(dirname "$0")/.."

APP_ID="${1:-}"
[[ -n "$APP_ID" ]] || { echo "usage: $0 <app-id>" >&2; exit 2; }
[[ "$APP_ID" =~ ^[a-z0-9][a-z0-9-]*[a-z0-9]$ ]] || {
  echo "app id must be a lowercase slug (it becomes a URL segment)" >&2; exit 2; }
[[ ! -e "apps/$APP_ID" ]] || { echo "apps/$APP_ID already exists" >&2; exit 1; }

mkdir -p apps
cp -r template "apps/$APP_ID"
rm -rf "apps/$APP_ID/node_modules" "apps/$APP_ID/dist"

if [[ -d template/node_modules ]]; then
  cp -al template/node_modules "apps/$APP_ID/node_modules" 2>/dev/null || true
fi

echo "created apps/$APP_ID"
echo "  ./scripts/dev.sh $APP_ID"
