#!/usr/bin/env bash
# The structural gate (FACTORY_RULES.md 3). Reads the raw log of guard.py + validate.sh and passes
# only on positive markers with counts at or above the floors a human set in .factory/locks/.
#   bash factory/gate.sh <log>
set -uo pipefail
LOG="${1:?gate log}"
ROOT="$(git rev-parse --show-toplevel)"
floor() { tr -dc 0-9 < "$ROOT/.factory/locks/$1" 2>/dev/null || echo 999; }
fail() { echo "GATE_FAIL: $*"; exit 1; }
grep -q '^GUARD_OK$' "$LOG" || fail "guard did not pass"
grep -q '^APP_STARTED ' "$LOG" || fail "app did not start and serve the emergency link"
E2E=$(grep -o '^E2E_PASSED steps=[0-9]*' "$LOG" | tail -1 | cut -d= -f2)
[ -n "$E2E" ] && [ "$E2E" -ge "$(floor e2e-floor)" ] || fail "journeys passed ${E2E:-0}, floor $(floor e2e-floor)"
HOLD=$(grep -o '^HOLDOUT_PASSED scenarios=[0-9]*' "$LOG" | tail -1 | cut -d= -f2)
[ -n "$HOLD" ] && [ "$HOLD" -ge "$(floor holdout-floor)" ] || fail "hidden scenarios passed ${HOLD:-0}, floor $(floor holdout-floor)"
grep -q '^VALIDATE_OK$' "$LOG" || fail "validate.sh reported a failure"
echo "GATE_OK e2e=$E2E holdout=$HOLD"
