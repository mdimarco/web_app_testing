#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-dev}"

if [[ ! -f package.json ]]; then
  echo "error: no package.json at /app — bind-mount an app directory there" >&2
  echo "  docker run --rm -v \"\$PWD/apps/<app-id>:/app\" -p 5173:5173 webapp-env" >&2
  exit 1
fi

# Install only when the lockfile/manifest is newer than the installed tree.
# node_modules is an anonymous volume, so this is a no-op on warm restarts.
needs_install=0
if [[ ! -d node_modules ]]; then
  needs_install=1
elif [[ package.json -nt node_modules ]] || { [[ -f package-lock.json ]] && [[ package-lock.json -nt node_modules ]]; }; then
  needs_install=1
fi

if [[ $needs_install -eq 1 ]]; then
  echo "==> installing dependencies"
  if [[ -f package-lock.json ]]; then
    npm ci --no-fund --no-audit || npm install --no-fund --no-audit
  else
    npm install --no-fund --no-audit
  fi
  touch node_modules
fi

case "$MODE" in
  dev)
    echo "==> vite dev on http://localhost:5173 (base=${VITE_BASE:-/})"
    exec npm run dev
    ;;
  build)
    echo "==> production build (base=${VITE_BASE:-/})"
    exec npm run build
    ;;
  preview)
    echo "==> production build + preview on http://localhost:4173"
    npm run build
    exec npm run preview
    ;;
  typecheck)
    exec npm run typecheck
    ;;
  shell)
    exec bash
    ;;
  *)
    # Anything else is run verbatim, e.g. `docker run ... webapp-env npm run lint`
    exec "$@"
    ;;
esac
