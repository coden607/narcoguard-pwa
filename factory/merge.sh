#!/usr/bin/env bash
# Squash-merges factory PRs that pass every gate in FACTORY_RULES.md 3. Run by factory-merge.yml from main.
set -uo pipefail
REPO="${GITHUB_REPOSITORY:-coden607/narcoguard-pwa}"
LEVEL=$(tr -dc 0-9 < .factory/locks/autonomy 2>/dev/null || echo 0); LEVEL=${LEVEL:-0}
if [ -f .factory/STOP ]; then echo "MERGE_IDLE stop file on main"; exit 0; fi
if [ "$(gh issue list -R "$REPO" --label factory:stop --state open --json number --jq length 2>/dev/null || echo 0)" != "0" ]; then echo "MERGE_IDLE factory:stop label"; exit 0; fi
if [ "$LEVEL" -lt 3 ]; then echo "MERGE_IDLE autonomy $LEVEL < 3: a human merges"; exit 0; fi

REQUIRED="quality pwa-browser-smoke lighthouse gate"
BLOCKING='factory:needs-human|factory:rejected|factory:stop|factory:assumption|factory:changes-requested'
gh pr list -R "$REPO" --state open --label factory:validated --json number,headRefName,headRefOid,labels,mergeable \
  --jq '.[] | [.number, .headRefName, .headRefOid, ([.labels[].name] | join(",")), .mergeable] | @tsv' |
while IFS=$'\t' read -r N REF SHA LABELS MERGEABLE; do
  case "$REF" in factory/issue-*) ;; *) echo "skip #$N: not a factory branch"; continue ;; esac
  if echo "$LABELS" | grep -Eq "$BLOCKING"; then echo "skip #$N: blocked by label"; continue; fi
  if [ "$MERGEABLE" != "MERGEABLE" ]; then echo "skip #$N: not mergeable ($MERGEABLE)"; continue; fi
  RUNS=$(gh api "repos/$REPO/commits/$SHA/check-runs?per_page=100" --jq '.check_runs[] | "\(.name)=\(.conclusion)"')
  OK=1
  for CHECK in $REQUIRED; do
    echo "$RUNS" | grep -qx "$CHECK=success" || { echo "skip #$N: $CHECK not green on $SHA"; OK=0; break; }
  done
  [ "$OK" = 1 ] || continue
  if gh pr merge "$N" -R "$REPO" --squash --match-head-commit "$SHA"; then
    gh pr edit "$N" -R "$REPO" --add-label factory:merged >/dev/null 2>&1 || true
    echo "MERGED #$N at $SHA"
  else
    echo "MERGE_FAILED #$N"
  fi
done
