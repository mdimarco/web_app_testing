#!/usr/bin/env bash
# Run a promptset through the agent pipeline.
#
#   ./scripts/run_promptset.sh promptsets/v1
#   ./scripts/run_promptset.sh promptsets/v1 --only kanban --force
#   ./scripts/run_promptset.sh promptsets/v1 --parallel 3 --effort xhigh
#
# Any extra arguments are passed through to `python -m agent.runner`.
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ -d .venv ]]; then
  # shellcheck disable=SC1091
  source .venv/bin/activate
fi

if [[ -z "${ANTHROPIC_API_KEY:-}${ANTHROPIC_AUTH_TOKEN:-}" ]]; then
  echo "note: ANTHROPIC_API_KEY is unset; the SDK will try an 'ant auth login' profile." >&2
fi

[[ $# -ge 1 ]] || { echo "usage: $0 <promptset-dir> [runner options...]" >&2; exit 2; }

# Resolve the promptset relative to the repo root, so the path still means the
# same thing after we cd into pipeline/ (where the `agent` package lives).
PROMPTSET="$1"
[[ "$PROMPTSET" = /* ]] || PROMPTSET="$PWD/${PROMPTSET#./}"
[[ -e "$PROMPTSET" ]] || { echo "no such promptset: $PROMPTSET" >&2; exit 1; }

cd pipeline
exec python -m agent.runner "$PROMPTSET" "${@:2}"
