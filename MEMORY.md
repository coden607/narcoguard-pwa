# MEMORY.md — NarcoGuard project state (STATE tier)

> STATE only: current truth, one line per key, overwritten when it changes (log the change as an EVENT in
> `memory/daily/`). Format parsed by `continuity brain audit`:
> `- **key**: value — as-of YYYY-MM-DD · source: <who/link> · review-by YYYY-MM-DD`
> Public repository: no secrets, tokens, or personal, health or location data. Ever.

## Project
- **repo**: coden607/narcoguard-pwa, default branch main, Next.js 16 / React 19 / TypeScript, Node 24, npm — as-of 2026-10-27 · source: repo package.json · review-by 2027-01-27
- **history-policy**: main is one straight line; rebase-merge only (no merge commits, no squash), by the factory or anyone — as-of 2026-10-28 · source: Stephen (owner) · review-by 2027-04-27
- **autonomy-dial**: 5 (levels 4-5 add scope: proposal feeder + cross-repo sweeps; merge gates unchanged; secrets, settings, billing and destructive actions still need Stephen; rebase-only) — as-of 2026-10-28 · source: Stephen (owner), .factory/locks/autonomy · review-by 2026-12-28
- **owner-approval-required**: PRs touching guard-protected paths (factory/guard.py: dependencies, CI/workflow, .factory, governance, emergency/auth/data), repo settings and secrets, irreversible list (FACTORY_RULES 7.3) — as-of 2026-10-28 · source: Stephen (owner) · review-by 2027-01-28

## Operations
- **routing**: all substantive agent work routes through ContinuityOS (coden607/continuity-os) then Jev (decide only), then cheapest capable tier — as-of 2026-10-27 · source: AGENTS.md · review-by 2027-01-27
- **ci-skills-token**: CI step "Install pinned private agent skills" needs a valid SKILLS_READ_TOKEN secret (read on coden607/skills) — as-of 2026-10-27 · source: Actions run 40326329532 · review-by 2026-11-10

## Lessons
- **lessons-index**: see memory/kb/README.md — as-of 2026-10-27 · source: this file · review-by 2027-01-27
