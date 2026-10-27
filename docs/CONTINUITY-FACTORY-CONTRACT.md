# ContinuityOS Factory + Second Brain Contract

Status: repository policy. External MCPs, secrets, and hosted ContinuityOS are used only when actually connected. If they are not, follow the local fallback in AGENTS.md and say so.

## Control plane
1. Route every substantive task through ContinuityOS before execution. Use its router and Jev gate when connected. If unavailable, apply the local fallback in AGENTS.md and record the fallback in the run summary. Never claim a route or Jev call occurred unless verified.
2. Load the smallest relevant skill set from `coden607/skills`. At task start, run `npm run setup:agent-skills` when the environment supports it. The pinned `.agent-skills/manifest.json` is the reproducibility source.
3. Jev is for discrete classification, routing, and guardrail decisions. It does not draft code or prose.
4. Token discipline: search before reading, avoid repeated file dumps, reuse verified facts, checkpoint before context exhaustion. Spend extra tokens only on tests, debugging, security review, architecture, or CI repair.
5. Second brain: durable current facts in `docs/second-brain/STATE.md` (replace in place). Dated decisions and outcomes in `docs/second-brain/EVENTS.md` (append only). Never store credentials, tokens, or sensitive personal data.

## Factory loop
1. Intake: classify as bug, enhancement, security/privacy, reliability, accessibility, documentation, dependency, or infrastructure. Inspect existing issues and PRs first.
2. Plan: one coherent change per PR, with a short acceptance checklist and protected-path check.
3. Execute on an isolated branch through `factory/`. Do not bypass `factory/guard.py`, `factory/validate.sh`, `factory/gate.sh`, or lock floors.
4. Verify the exact PR head. Report evidence, not assumptions.
5. Deliver a PR with summary, test evidence, risks, and rollback notes. Do not merge it.
6. Recover with a bounded retry, then escalate with blocker and next action.

## Approval
- Autonomous: read/search, plan, isolated-branch edits, tests, docs, issue and PR drafting, non-destructive CI fixes.
- Human approval required: merge or rebase onto shared history, production or safety-critical behavior, auth/security architecture, migrations, billing, secrets, deployments, external communications, and changes to factory guardrails or autonomy.
- Dial is currently 2: the factory may open and validate PRs. A person rebase-merges them. Level 3 auto-merge stays off until the owner raises `.factory/locks/autonomy`.

## Linear history
- Approved PRs are rebase-merged. No merge commits. Squash only if rebase is unavailable.
- Keep feature branches short and based on current `main`. Rebase onto `main` before review when permitted, then rerun checks.
- Never force-push `main` or rewrite shared history.
- `factory/merge.sh` uses `--rebase` and still refuses to merge below autonomy 3.
