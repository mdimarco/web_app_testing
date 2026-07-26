#!/usr/bin/env bash
# Assemble site/ from every built app + every run report, for local viewing.
#
#   ./scripts/publish.sh              assemble only
#   ./scripts/publish.sh --build      rebuild all apps first
#   ./scripts/publish.sh --serve      assemble, then serve on :8080
#
# To put it on the internet, use ./scripts/deploy_vercel.sh instead (or just
# push to main — the deploy workflow does the same thing). site/ is gitignored
# and rebuilt on demand.
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

echo "site/ ready. To view it:"
echo "  ./scripts/publish.sh --serve                            # http://localhost:8080"
echo "  docker compose -f docker/docker-compose.yml up gallery  # same, via nginx"
echo "To deploy it:"
echo "  ./scripts/deploy_vercel.sh"

if [[ "${1:-}" == "--serve" ]]; then
  echo
  echo "serving site/ on http://localhost:8080"
  ( cd site && python -m http.server 8080 )
fi
