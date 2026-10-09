#!/usr/bin/env bash
# The factory's definition of "works" (FACTORY_RULES.md 3-4). Prints positive markers that
# factory/gate.sh requires; a check that did not run prints nothing and fails the gate.
#
#   bash factory/validate.sh           full: build, start, journeys, hidden scenarios
#   bash factory/validate.sh --quick   builder's inner loop: lint, types, unit tests, journeys
#
# Safe to re-run; Ctrl-C stops the server it started.
set -uo pipefail
ROOT="$(git rev-parse --show-toplevel)"; cd "$ROOT"
MODE="${1:-full}"
RUN="$ROOT/.factory/runs/$(date -u +%Y%m%dT%H%M%SZ)"; mkdir -p "$RUN"
PORT="${FACTORY_PORT:-3100}"
BASE="http://127.0.0.1:$PORT"
FAIL=0
SERVER_PID=""
cleanup() { [ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null; true; }
trap cleanup EXIT INT TERM
step() { echo "== $*"; }

if [ "$MODE" = "--quick" ]; then
  step "static and unit checks"
  npm run --silent lint && npm run --silent typecheck && npm run --silent test:features || FAIL=1
fi

if [ "$MODE" != "--quick" ] && [ "${FACTORY_SKIP_BUILD:-0}" != "1" ]; then
  step "production build"
  npm run --silent build > "$RUN/build.log" 2>&1 || { tail -40 "$RUN/build.log"; echo "BUILD_FAILED"; exit 1; }
fi
[ -f .next/BUILD_ID ] || { echo "BUILD_MISSING: run npm run build first"; exit 1; }

step "start the app with directory and AI stubs on :$PORT"
EXTRA=""; [ "$MODE" != "--quick" ] && [ -f .factory/holdout/fixtures.json ] && EXTRA="$ROOT/.factory/holdout/fixtures.json"
FACTORY_STUB=1 MOONSHOT_API_KEY=stub FACTORY_EXTRA_FIXTURES="$EXTRA" NODE_OPTIONS="--import ./harness/directory-stub.mjs" \
  ./node_modules/.bin/next start -H 127.0.0.1 -p "$PORT" > "$RUN/server.log" 2>&1 &
SERVER_PID=$!
for _ in $(seq 1 60); do curl -fsS -o /dev/null "$BASE/" 2>/dev/null && break; sleep 1; done
# Started is not working: the emergency link must be served and the real search must answer.
if curl -fsS "$BASE/help" | grep -q 'href="tel:911"' && curl -fsS "$BASE/api/resources/needs?zip=13901" | grep -q '"status":"ok"'; then
  echo "APP_STARTED port=$PORT"
else
  tail -20 "$RUN/server.log"; echo "APP_NOT_WORKING"; exit 1
fi

count() { node -e 'const r=require(process.argv[1]);let p=0,f=0;const walk=s=>{for(const x of s.suites??[])walk(x);for(const sp of s.specs??[])for(const t of sp.tests??[]){const st=t.results?.at(-1)?.status;if(st==="passed")p++;else f++}};walk(r);console.log(p+" "+f)' "$1" 2>/dev/null || echo "0 1"; }

step "end-to-end journeys (MISSION.md Gate 3)"
FACTORY_BASE_URL="$BASE" FACTORY_REPORT="$RUN/journeys.json" ./node_modules/.bin/playwright test -c harness/playwright.config.ts
read -r P F < <(count "$RUN/journeys.json")
if [ "$F" = "0" ] && [ "$P" -gt 0 ]; then echo "E2E_PASSED steps=$P"; else echo "E2E_FAILED passed=$P failed=$F"; FAIL=1; fi

if [ "$MODE" != "--quick" ] && [ -d .factory/holdout ]; then
  step "hidden scenarios (names withheld)"
  FACTORY_QUIET=1 FACTORY_SUITE_DIR="$ROOT/.factory/holdout" FACTORY_BASE_URL="$BASE" FACTORY_REPORT="$RUN/holdout.json" \
    ./node_modules/.bin/playwright test -c harness/playwright.config.ts > "$RUN/holdout.log" 2>&1
  read -r P F < <(count "$RUN/holdout.json")
  if [ "$F" = "0" ] && [ "$P" -gt 0 ]; then echo "HOLDOUT_PASSED scenarios=$P"; else echo "HOLDOUT_FAILED passed=$P failed=$F"; FAIL=1; fi
fi

[ "$FAIL" = "0" ] && echo "VALIDATE_OK" || echo "VALIDATE_FAILED"
exit "$FAIL"
