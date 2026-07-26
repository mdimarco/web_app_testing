#!/usr/bin/env bash
# Deploy the assembled site/ to Vercel as a single static project.
#
#   ./scripts/deploy_vercel.sh              deploy to production
#   ./scripts/deploy_vercel.sh --preview    deploy a preview (throwaway URL)
#   ./scripts/deploy_vercel.sh --build      rebuild every app first, then deploy
#
# Required:
#   VERCEL_TOKEN     https://vercel.com/account/tokens
# Optional:
#   VERCEL_PROJECT   project name (default: web-app-testing)
#   VERCEL_SCOPE     team slug, if the project lives under a team rather than
#                    your personal account
set -euo pipefail
cd "$(dirname "$0")/.."

PROD=1
BUILD=0
for arg in "$@"; do
  case "$arg" in
    --preview) PROD=0 ;;
    --build)   BUILD=1 ;;
    -h|--help) sed -n '2,14p' "$0"; exit 0 ;;
    *) echo "unknown option: $arg" >&2; exit 2 ;;
  esac
done

if [[ -z "${VERCEL_TOKEN:-}" ]]; then
  cat >&2 <<'EOF'
error: VERCEL_TOKEN is not set.

  1. Create a token at https://vercel.com/account/tokens
  2. export VERCEL_TOKEN=...
     (and VERCEL_SCOPE=<team-slug> if the project belongs to a team)
EOF
  exit 1
fi

PROJECT="${VERCEL_PROJECT:-web-app-testing}"
SCOPE_ARGS=()
[[ -n "${VERCEL_SCOPE:-}" ]] && SCOPE_ARGS=(--scope "$VERCEL_SCOPE")

if [[ $BUILD -eq 1 ]]; then
  SITE_PREFIX="" ./scripts/build_app.sh --all
fi

if [[ -d .venv ]]; then
  # shellcheck disable=SC1091
  source .venv/bin/activate
fi
( cd pipeline && python -m agent.site )

[[ -f site/index.html ]] || { echo "site/ was not assembled" >&2; exit 1; }

VERCEL="npx --yes vercel@latest"

# Link (creating the project on first run) so the deploy is not prompted for a
# project name. Idempotent: re-linking an existing project is a no-op.
echo "==> linking project '$PROJECT'"
$VERCEL link --yes --cwd site --project "$PROJECT" \
  --token "$VERCEL_TOKEN" "${SCOPE_ARGS[@]}"

DEPLOY_ARGS=(deploy --yes --cwd site --token "$VERCEL_TOKEN" "${SCOPE_ARGS[@]}")
[[ $PROD -eq 1 ]] && DEPLOY_ARGS+=(--prod)

echo "==> deploying site/"
# The CLI prints the deployment URL to stdout and progress to stderr.
URL="$($VERCEL "${DEPLOY_ARGS[@]}" | tail -n 1)"

echo
echo "deployed: $URL"
if [[ $PROD -eq 1 ]]; then
  echo "gallery:  $URL/"
  echo "an app:   $URL/apps/<app-id>/"
  echo "a report: $URL/runs/<run-id>/report.html"
else
  echo "(preview deployment — production URL unchanged)"
fi
