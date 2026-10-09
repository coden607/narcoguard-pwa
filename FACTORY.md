# NarcoGuard dark factory

Built 2026-10-09 from `docs/narcoguard-needs-first-overdose-safety.prd.md` with the `build-dark-factory` skill.
Owner: Stephen Blanford. Protected file: humans edit it.

## What it does

Every hour a Claude Code cloud Routine starts a fresh session that runs `factory/RUN.md`: it asks the
deterministic dispatcher (`factory/dispatch.py`) for exactly one job and does it.

```
issue ──triage──▶ factory:accepted ──implement──▶ PR factory/issue-N (factory:built)
   CI + Factory Gate (guard, build, journeys, hidden scenarios) ──▶ validate-pr (a different session)
   factory:validated ──▶ Factory Merge (code, squash) ──▶ Vercel deploys ──▶ Factory Live Check
   live check fails ──▶ rollback + revert + critical issue + @coden607 + email
```

| Piece | File | Kind |
|---|---|---|
| Scope and invariants | `MISSION.md` | protected, human |
| Operating rules | `FACTORY_RULES.md` | protected, human |
| Conventions | `AGENTS.md`, `CLAUDE.md` | protected, human |
| Dispatcher | `factory/dispatch.py` (+ `test_dispatch.py`) | code |
| Protected paths, size and test-weakening guard | `factory/guard.py` | code |
| Definition of "works" | `factory/validate.sh`, `harness/` | code |
| Hidden scenarios | `.factory/holdout/` (8, names never printed) | code, hidden from agents |
| Gate | `factory/gate.sh`, `.github/workflows/factory-gate.yml` | code |
| Merge | `factory/merge.sh`, `.github/workflows/factory-merge.yml` | code |
| Live check and rollback | `factory/live-check.sh`, `.github/workflows/factory-live-check.yml` | code |
| Node prompts | `factory/RUN.md`, `factory/prompts/*.md` | the owner's process |
| Floors and dial | `.factory/locks/{autonomy,e2e-floor,holdout-floor}` | human-set |
| Deliberate defects | `harness/mutations/defects.json`, `harness/mutate.sh` | proves the checks fail |

## Autonomy

Target: **level 3, guarded** (owner, 2026-10-09). Current dial: see `.factory/locks/autonomy`.

| Level | What runs |
|---|---|
| 0 | nothing; run by hand |
| 1 | triage, implement, fix |
| 2 | + a separate session validates and labels `factory:validated` |
| 3 | + `factory-merge.yml` squash-merges green PRs, Vercel deploys, live check guards |

Raise the dial one notch at a time, after a full lap at the current level, by a human commit to
`.factory/locks/autonomy`. Protected areas never auto-merge at any level: they cannot pass the guard.

## Stop button

Either stops dispatch and merging at the next check:

- commit an empty `.factory/STOP` to `main`, or
- add the label `factory:stop` to any open issue.

Rollback of a broken live site still runs while stopped.

## How you hear from it

`factory:needs-human` on the issue or PR, an @mention of `coden607` (GitHub app push and email), and a short
email from the Routine to coden607@gmail.com with the recommended answer.

## What has to be true (owner checklist)

- [ ] Hourly Routine armed (`create_trigger`, fresh session per run, GitHub + Gmail + Vercel connectors).
- [ ] Repo settings → Actions → General → Workflow permissions: "Read and write" and "Allow GitHub Actions to
      create and approve pull requests" (merge and revert PRs).
- [ ] Optional, for instant rollback: repo secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`. Without
      them the next hourly run rolls back through the Vercel connector.
- [ ] The two known gaps the hidden scenarios found are fixed by the factory's first laps (issues filed).

## Honest limits

- The hidden scenarios live in this public repo. Agents are kept out by a hook, a ripgrep ignore and the rules,
  and CI prints only counts; a determined agent could still find them. A private sibling repo would be stronger.
- The validator is a model. The merge is code, and it also requires CI, the gate and the guard.
- The factory owns Find help, Angel plumbing, accessibility, performance and tests. Tone, look, listing truth on
  the ground, and clinical, legal and Constitution content stay with people (MISSION.md).
- Mutation results: see the latest `bash harness/mutate.sh` output in the setup PR.
