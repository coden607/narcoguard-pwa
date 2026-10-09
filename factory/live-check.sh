#!/usr/bin/env bash
# Proves the live site really works, not just that it answers (MISSION.md Gate 3, step 5).
#   bash factory/live-check.sh [https://www.narcoguard.app]
set -uo pipefail
SITE="${1:-https://www.narcoguard.app}"
FAIL=0
check() { if eval "$2"; then echo "LIVE_OK $1"; else echo "LIVE_FAIL $1"; FAIL=1; fi; }
page() { curl -fsSL --max-time 30 "$SITE$1"; }
check "help links 911 and 988" 'H=$(page /help) && grep -q "href=\"tel:911\"" <<<"$H" && grep -q "href=\"tel:988\"" <<<"$H"'
check "angel links 911" 'page /angel | grep -q "href=\"tel:911\""'
check "safer-use crisis lines exact" 'S=$(page /safer-use) && grep -q "tel:18004843731" <<<"$S" && grep -q "tel:18006624357" <<<"$S"'
check "camera allowed for pulse check" 'curl -fsSI --max-time 30 "$SITE/" | grep -qi "permissions-policy:.*camera=(self)"'
search() { curl -fsS --max-time 60 "$SITE/api/resources/needs?zip=13901" | grep -Eq "\"status\":\"(ok|partial)\""; }
check "find help answers for 13901" 'search || { sleep 30; search; }'
[ "$FAIL" = 0 ] && echo "LIVE_CHECK_OK" || echo "LIVE_CHECK_FAILED"
exit "$FAIL"
