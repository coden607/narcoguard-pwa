#!/usr/bin/env bash
# Push AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET to Vercel production and preview,
# set AUTH_URL, and trigger a production redeploy.
# Never prints the credential values.
set -euo pipefail

PROJECT_ID="prj_VvbCgTu4gRMB0VXPoKnL38ONCz9A"
TEAM_SLUG="stephens-projects-8fbc16d0"

if [[ -z "${AUTH_GOOGLE_ID:-}" || -z "${AUTH_GOOGLE_SECRET:-}" ]]; then
  echo "AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET must be set in the environment." >&2
  echo "This script does not print those values and will not prompt for them." >&2
  exit 1
fi

payload() {
  python3 - "$1" "$2" <<'PY'
import json, os, sys
key, typ = sys.argv[1], sys.argv[2]
fixed = {"AUTH_GOOGLE_ENABLED": "true", "AUTH_URL": "https://www.narcoguard.app"}
value = fixed.get(key, os.environ[key])
json.dump({"key": key, "value": value, "type": typ, "target": ["production", "preview"], "comment": "NarcoGuard Google sign-in"}, sys.stdout)
PY
}

cli_value() {
  python3 - "$1" <<'PY'
import os, sys
key = sys.argv[1]
fixed = {"AUTH_GOOGLE_ENABLED": "true", "AUTH_URL": "https://www.narcoguard.app"}
sys.stdout.write(fixed.get(key, os.environ[key]))
PY
}

upsert_via_api() {
  local key="$1"
  local typ="$2"
  payload "$key" "$typ" | curl -sS --fail-with-body -X POST \
    "https://api.vercel.com/v10/projects/${PROJECT_ID}/env?upsert=true&slug=${TEAM_SLUG}" \
    -H "Authorization: Bearer ${VERCEL_TOKEN}" \
    -H "Content-Type: application/json" \
    --data-binary @- \
    -o /tmp/ng-vercel-env-result.json
}

upsert_via_cli() {
  local key="$1"
  local typ_flag="$2"
  cli_value "$key" | npx --yes vercel env add "$key" \
    --environment production,preview \
    "$typ_flag" \
    --force --yes \
    --project "$PROJECT_ID" \
    --scope "$TEAM_SLUG" \
    >/tmp/ng-vercel-env-cli.log
}

if [[ -n "${VERCEL_TOKEN:-}" ]]; then
  upsert_via_api AUTH_GOOGLE_ID sensitive
  upsert_via_api AUTH_GOOGLE_SECRET sensitive
  upsert_via_api AUTH_GOOGLE_ENABLED plain
  upsert_via_api AUTH_URL plain
  echo "Wrote Google sign-in environment variables to Vercel production and preview."
  python3 -c 'import json,sys; json.dump({"name":"narcoguard-pwa","project":"prj_VvbCgTu4gRMB0VXPoKnL38ONCz9A","target":"production","gitSource":{"type":"github","org":"coden607","repo":"coden607/narcoguard-pwa","ref":"main"}}, sys.stdout)' | curl -sS --fail-with-body -X POST \
    "https://api.vercel.com/v13/deployments?forceNew=1&slug=${TEAM_SLUG}" \
    -H "Authorization: Bearer ${VERCEL_TOKEN}" \
    -H "Content-Type: application/json" \
    --data-binary @- \
    -o /tmp/ng-vercel-redeploy.json
  echo "Triggered a production redeploy so the new variables are picked up."
  exit 0
fi

if npx --yes vercel whoami >/tmp/ng-vercel-whoami.log 2>&1; then
  upsert_via_cli AUTH_GOOGLE_ID --sensitive
  upsert_via_cli AUTH_GOOGLE_SECRET --sensitive
  upsert_via_cli AUTH_GOOGLE_ENABLED --no-sensitive
  upsert_via_cli AUTH_URL --no-sensitive
  echo "Wrote Google sign-in environment variables to Vercel production and preview."
  npx --yes vercel redeploy --yes --scope "$TEAM_SLUG" --project "$PROJECT_ID" >/tmp/ng-vercel-redeploy.log 2>&1 || true
  echo "Attempted a production redeploy so the new variables are picked up."
  exit 0
fi

echo "No Vercel credentials available." >&2
echo "Set VERCEL_TOKEN, or log in with 'vercel login', then run this script again." >&2
echo "The Google client ID and secret were not printed and were not uploaded." >&2
exit 2
