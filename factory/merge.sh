#!/usr/bin/env bash
# Rebase-merges factory PRs that pass every gate in FACTORY_RULES.md 3. Run by factory-merge.yml from main.
# Below autonomy 3 this script does nothing: a person rebase-merges. At 3 it merges only green, validated,
# linear, review-clean PRs, and fails closed on anything it cannot read.
set -uo pipefail
REPO="${GITHUB_REPOSITORY:-coden607/narcoguard-pwa}"
LEVEL=$(tr -dc 0-9 < .factory/locks/autonomy 2>/dev/null || echo 0); LEVEL=${LEVEL:-0}
if [ -f .factory/STOP ]; then echo "MERGE_IDLE stop file on main"; exit 0; fi
STOPS=$(gh issue list -R "$REPO" --label factory:stop --state open --json number --jq length) || { echo "MERGE_IDLE could not read the stop label"; exit 1; }
if [ "$STOPS" != "0" ]; then echo "MERGE_IDLE factory:stop label"; exit 0; fi
if [ "$LEVEL" -lt 3 ]; then echo "MERGE_IDLE autonomy $LEVEL < 3: a human rebase-merges"; exit 0; fi

REQUIRED="quality pwa-browser-smoke lighthouse linear-history gate"
BLOCKING='factory:needs-human|factory:rejected|factory:stop|factory:assumption|factory:changes-requested'
gh pr list -R "$REPO" --state open --base main --label factory:validated --json number,headRefName,headRefOid,labels,mergeable \
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
  # Linear history: no merge commit anywhere in the PR (fail closed if the commits cannot be read).
  MERGES=$(gh api --paginate "repos/$REPO/pulls/$N/commits?per_page=100" --jq '[.[] | select((.parents | length) > 1)] | length' 2>/dev/null | awk '{n+=$1; c++} END{if (c>0) print n}')
  if [ "$MERGES" != "0" ]; then echo "skip #$N: merge commit present or commits unreadable ($MERGES)"; continue; fi
  # No unresolved review findings: every review thread resolved, no CHANGES_REQUESTED. Unreadable or truncated = skip.
  REVIEW=$(gh api graphql -F owner="${REPO%%/*}" -F name="${REPO##*/}" -F num="$N" -f query='query($owner:String!,$name:String!,$num:Int!){repository(owner:$owner,name:$name){pullRequest(number:$num){reviewDecision reviewThreads(first:100){pageInfo{hasNextPage} nodes{isResolved}}}}}' \
    --jq '.data.repository.pullRequest | if .reviewThreads.pageInfo.hasNextPage then "TRUNCATED" elif .reviewDecision == "CHANGES_REQUESTED" then "CHANGES_REQUESTED" else "unresolved=\([.reviewThreads.nodes[] | select(.isResolved | not)] | length)" end' 2>/dev/null)
  if [ "$REVIEW" != "unresolved=0" ]; then echo "skip #$N: review findings not clear ($REVIEW)"; continue; fi
  if gh pr merge "$N" -R "$REPO" --rebase --match-head-commit "$SHA"; then
    gh pr edit "$N" -R "$REPO" --add-label factory:merged >/dev/null 2>&1 || true
    echo "REBASE_MERGED #$N at $SHA"
  else
    echo "MERGE_FAILED #$N"
  fi
done
