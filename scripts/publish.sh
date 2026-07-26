#!/usr/bin/env bash
# Assemble site/ from every built app + every run report.
#
#   ./scripts/publish.sh              assemble only
#   ./scripts/publish.sh --build      rebuild all apps first
#   ./scripts/publish.sh --serve      assemble, then serve on :8080
#
# Deployment itself is handled by .github/workflows/deploy-pages.yml on push;
# site/ is gitignored and rebuilt in CI.
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ "${1:-}" == "--build" ]]; then
  ./scripts/build_app.sh --all
  shift
fi

if [[ -d .venv ]]; then
  # shellcheck disable=SC1091
  source .venv/bin/activate
fi

( cd pipeline && python -m agent.site )

echo "site/ ready — open site/index.html, or:"
echo "  docker compose -f docker/docker-compose.yml up gallery   # http://localhost:8080"

if [[ "${1:-}" == "--serve" ]]; then
  echo
  echo "serving site/ on http://localhost:8080"
  ( cd site && python -m http.server 8080 )
fi
