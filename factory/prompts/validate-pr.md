# Validate a PR (a fresh session that never saw the build, FACTORY_RULES.md 9)

Target: a factory PR whose required checks are green.

1. Read ONLY: the linked issue (from `Fixes #N`), the PR diff, the check results, the PR body's
   `## Assumptions` section, and MISSION.md / FACTORY_RULES.md from main. Do not read builder comments, commit
   messages beyond titles, or `.factory/runs/`.
2. Judge against the issue and MISSION, not against the builder's intent:
   - Does the diff solve the issue as a user would notice?
   - Any auto-reject trigger (§6)? Any change to a phone number, `tel:` link or 911/988 text, new data leaving
     the phone, gating, silent contact, a weakened test, an unrelated file?
   - Would a stressed person on a small phone understand it?
3. Verdict, as one comment **Factory · validate-pr** with `solves_issue: yes|no`, the rules checked, findings:
   - yes, no findings: add `factory:validated`. The merge workflow does the rest.
   - fixable findings: add `factory:changes-requested` with specific, testable asks.
   - an auto-reject trigger: add `factory:rejected`, close the PR, comment on the issue, escalate.

4. Read the diff with `--stat` first, then only changed hunks. Verdict comment under 120 words.
