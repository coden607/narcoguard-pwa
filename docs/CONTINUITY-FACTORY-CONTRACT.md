# ContinuityOS Factory + Second Brain Contract

Status: proposed repository policy. This document does not claim that external MCPs, secrets, runners, or hosted services are configured.

## Non-negotiable control plane
1. Route every substantive task through ContinuityOS before execution. Use its router and Jev gate when connected; if unavailable, apply the local fallback rules in `AGENTS.md` and explicitly record the fallback in the run summary. Never claim a route or Jev call occurred unless verified.
2. Load the smallest relevant skill set. At task start, run `npm run setup:agent-skills` and validate with `npm run validate:agent-skills` where the execution environment supports it. Use `coden607/skills` as the canonical skill source and the pinned manifest for reproducibility.
3. Jev is for discrete classification, routing, and guardrail decisions—not code or prose generation.
4. Keep context lean: search before reading, avoid repeated file dumps, reuse verified facts, and checkpoint/handoff before context exhaustion. Spend extra tokens only on work with a concrete quality payoff (tests, debugging, security review, architecture, or CI repair), not repetition.
5. Treat project memory as two layers: durable current facts in `docs/second-brain/STATE.md`; dated append-only decisions and outcomes in `docs/second-brain/EVENTS.md`. Verify facts before changing STATE; never rewrite history in EVENTS. Do not store credentials, tokens, personal secrets, or sensitive user data.

## Factory execution loop
1. Intake: classify as bug, enhancement, security/privacy, reliability, accessibility, documentation, dependency, or infrastructure. Inspect relevant code and existing issues/PRs first.
2. Plan: write a small testable acceptance checklist; identify safety-critical flows and protected paths. Prefer one coherent change per PR.
3. Execute: use isolated worktrees/branches and the existing `factory/` pipeline. Do not bypass `factory/guard.py`, `factory/validate.sh`, `factory/gate.sh`, lock floors, or exact-head validation.
4. Verify: run targeted tests, then the repository's required CI/test/build/lint/type/security checks applicable to the change. Review diffs for regressions, secrets, dependency risk, accessibility, privacy, and emergency-flow correctness. Report evidence, not assumptions.
5. Deliver: open a PR with summary, rationale, test evidence, risks, and rollback notes. Any new commit invalidates validation for the old head; rerun gates on the exact proposed head.
6. Recover: inspect failures and logs, fix within bounded retries, and leave a checkpoint with blocker + next action if unresolved. Do not create endless retry loops.

## Autonomy and approval
- Autonomous: read/search, plan, local edits on isolated branches, tests, documentation, issue/PR drafting, and non-destructive CI fixes.
- Human approval required: merge/rebase operations that rewrite shared history, changes to production behavior or safety-critical flows, auth/security architecture, database migrations or destructive data changes, billing, credentials/secrets, deployments/releases, external communications, or changes to factory guardrails/autonomy policy.
- Do not auto-merge just because checks are green. Keep PRs reviewable and require a human approval for material/important upgrades, security-sensitive changes, schema changes, and production-facing behavior.
- Never access or print secret values. Use GitHub/Vercel/Supabase secret stores and least-privilege scoped credentials; secret setup must be performed through authorized provider interfaces.

## Linear history / PR policy
- Prefer rebase-and-merge for approved PRs so the target branch has a straight, non-merge-commit history.
- Keep feature branches short-lived and based on the latest `main`; rebase feature branches onto current `main` before review when permitted, resolve conflicts explicitly, and rerun all required checks after rebasing.
- Never force-push a shared branch or rewrite `main`. Do not automatically rebase or merge a human-owned PR without explicit authorization.
- Use squash only when the PR intentionally represents one atomic change and rebase merge is unavailable or unsuitable. Do not create merge commits for routine PRs.
- A linear history setting and rebase-merge availability are repository settings; this document alone does not enforce them. Verify branch/ruleset configuration separately.

## Definition of done
- Acceptance criteria are met and relevant tests pass.
- CI validates the exact PR head; no stale validation labels.
- Skills are pinned and validation is green where applicable.
- Documentation and second-brain state are updated if behavior or durable decisions changed.
- PR body lists test evidence, known limitations, risk classification, and whether human approval is required.
- Final report says what changed, what was verified, what remains unverified, and the next highest-value action.
