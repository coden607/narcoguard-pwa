#!/usr/bin/env bash
# Measures the checks, not the code: applies each deliberate defect from harness/mutations/defects.json
# to a scratch copy, rebuilds, runs factory/validate.sh, and requires it to FAIL. A defect that stays
# green is a kind of bug that can ship with nobody reading the diff.
#   bash harness/mutate.sh [defect-id]
set -uo pipefail
ROOT="$(git rev-parse --show-toplevel)"; cd "$ROOT"
# Inside the repo (gitignored) so node_modules can be hard-linked: Turbopack rejects a symlink.
WORK="$ROOT/.factory/runs/mutate-$$"; mkdir -p "$WORK"; trap 'rm -rf "$WORK"' EXIT INT TERM
git worktree add -q --detach "$WORK/tree" HEAD 2>/dev/null || { echo "MUTATE_ERROR worktree"; exit 2; }
trap 'git worktree remove --force "$WORK/tree" >/dev/null 2>&1; rm -rf "$WORK"' EXIT INT TERM
cp -al "$ROOT/node_modules" "$WORK/tree/node_modules"
cp -r "$ROOT/.factory/holdout" "$WORK/tree/.factory/" 2>/dev/null || true
fails() { grep -Eo '^(E2E|HOLDOUT)_FAILED passed=[0-9]+ failed=[0-9]+' "$1" | grep -Eo 'failed=[0-9]+' | cut -d= -f2 | paste -sd+ | bc 2>/dev/null || echo 0; }
(cd "$WORK/tree" && FACTORY_PORT=3199 bash factory/validate.sh > "$WORK/baseline.log" 2>&1)
grep -q '^APP_STARTED' "$WORK/baseline.log" || { echo "MUTATE_ERROR baseline did not start"; exit 2; }
BASE=$(fails "$WORK/baseline.log"); BASE=${BASE:-0}
echo "BASELINE_FAILURES=$BASE (known gaps already failing on this commit)"
TOTAL=0; CAUGHT=0
for ID in $(node -e 'for (const d of require(process.argv[1])) console.log(d.id)' "$ROOT/harness/mutations/defects.json"); do
  [ -n "${1:-}" ] && [ "$1" != "$ID" ] && continue
  TOTAL=$((TOTAL + 1))
  (cd "$WORK/tree" && git checkout -q -- . && node -e '
    const fs = require("fs"); const d = require(process.argv[1]).find((x) => x.id === process.argv[2])
    const text = fs.readFileSync(d.file, "utf8"); if (!text.includes(d.find)) { console.log("MUTATION_STALE " + d.id); process.exit(3) }
    fs.writeFileSync(d.file, text.replace(d.find, d.replace))' "$ROOT/harness/mutations/defects.json" "$ID") || { echo "MUTATION_STALE $ID"; continue; }
  (cd "$WORK/tree" && FACTORY_PORT=3199 bash factory/validate.sh > "$WORK/$ID.log" 2>&1)
  N=$(fails "$WORK/$ID.log"); N=${N:-0}
  if grep -Eq '^(APP_NOT_WORKING|BUILD_FAILED)' "$WORK/$ID.log" || [ "$N" -gt "$BASE" ]; then
    CAUGHT=$((CAUGHT + 1)); echo "MUTATION_CAUGHT $ID (failures $BASE -> $N)"
  else
    echo "MUTATION_SURVIVED $ID"
  fi
done
echo "MUTATIONS_TOTAL=$TOTAL"; echo "MUTATIONS_CAUGHT=$CAUGHT"
[ "$TOTAL" -gt 0 ] && [ "$CAUGHT" = "$TOTAL" ]
