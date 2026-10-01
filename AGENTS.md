# NarcoGuard PWA — Agent Guide

## Project

NarcoGuard is a production-oriented Next.js PWA for the NG overdose-prevention wearable. Treat reliability, accessibility, privacy, and emergency-flow correctness as safety-critical.

## Stack

- Next.js 15 App Router, React 18, and TypeScript
- Tailwind CSS and Radix UI components
- Supabase/Postgres backend and Vercel hosting
- npm with Node 24 (see `.nvmrc`, `engines`, and `packageManager`)
- Playwright for browser and PWA tests

## Working Style

- Work autonomously on safe, in-scope implementation and verification steps.
- Preserve user changes in a dirty worktree. Never discard, reset, or overwrite unrelated work.
- Use `rg`/`rg --files` for discovery and `apply_patch` for hand edits.
- Keep changes focused; do not perform broad rewrites without a demonstrated need.
- Never print, commit, or copy secret values. Refer to environment variables by name only.
- Do not bypass sandbox, approval, branch-protection, or provider security controls.
- Require explicit confirmation immediately before destructive operations, production deployment, database migration against production, payment activation, secret rotation, or sending external communications.

## Required Checks

Run the checks relevant to the change, and run the complete gate before release:

```bash
npm run lint
npm run typecheck
npm run build
npm run test:pwa
```

Use `npm run verify` for the complete gate. Report any check that could not run and why.

## Dependencies

- Use npm and keep `package.json` and `package-lock.json` synchronized.
- Inspect release notes and migration guides before major upgrades.
- Prefer incremental upgrades with verification between framework/runtime majors.
- Do not weaken lint, type checking, tests, or security settings to make an upgrade pass.

## Environment and Integrations

- `.env.example` is the canonical, secret-free inventory of required variables.
- `.env.local` is local-only and must remain ignored by Git.
- Client-exposed values must use `NEXT_PUBLIC_`; secrets must never use that prefix.
- Keep development, preview, and production values distinct in Vercel.
- Use least-privilege Supabase keys. Never expose service-role, JWT, database password, or Stripe secret/webhook keys to browser code.
- Stripe work must default to test mode. Production payments require confirmed products/prices, webhook handling, fulfillment behavior, refund/support policy, and an explicit go-live approval.

## Git and Deployment

- Work from the current branch unless asked otherwise.
- Review `git status` and the diff before committing.
- Do not amend user commits, force-push, or rewrite history unless explicitly requested.
- Before pushing `main` or deploying production, ensure the full verification gate passes and summarize the exact commit and deployment target.
- Verify the live deployment and critical PWA/emergency paths after release.

## Code Conventions

- Follow existing App Router and component patterns.
- Prefer server-side handling for privileged operations.
- Maintain accessible semantics, keyboard behavior, reduced-motion support, and mobile layouts.
- Avoid logging personal, health, location, authentication, or payment data.
- Treat emergency alerts and vitals calculations as safety-sensitive: add tests for behavior changes and make uncertainty/failure states explicit.

## Guardian Stability planner

- Follow `docs/governance/CONSTITUTION.md`: assistance remains available if a person declines tracking, pauses, or erases their planner. The person sets goals and chooses each action; never gate food, shelter, hygiene, or emergency guidance on check-ins.
- Current `/stability` is an opt-in browser-local prototype: needs, estimated sleep, goals, tomorrow's tasks, broad resource-directory links, and descriptive personal counts. It has no background location tracking, verified service availability, predictive relapse probability, or automated outreach. Do not label a proposed feature as live.
- Build future help in stages: (1) consent and data controls; (2) a maintained resource catalog with service type, eligibility, location, hours, accessibility, contact, provenance, last verification date, and an explicit stale/unknown state; (3) voluntary planning reminders; (4) evaluated personal pattern summaries; (5) separately reviewed, explicitly opted-in alerts. Provide a human-accessible 211 or local directory fallback when fresh resource data is unavailable. Never promise a bed, meal, appointment, or benefit without confirming with the provider.
- Prefer practical next steps based on the person's stated needs and goals. Maslow's hierarchy is a planning aid, not a ranking of people or a reason to deny care. Preserve unknown answers; do not infer that silence means a missed meal, hygiene, or relapse.
- Show descriptive counts with denominators and time windows. Do not turn small or biased samples into a percentage chance of relapse, imply causality, or use population statistics to diagnose an individual. Require clinical, statistical, fairness, and safety review, independent validation, calibration, uncertainty bounds, abstention rules, and prospective monitoring before any prediction or danger alert can ship.
- Keep a support contact as tap-to-call until separately approved. Any future outbound notification needs explicit, granular permission for each recipient and trigger, a preview, revocation, delivery/failure handling, and privacy review. Never silently contact a person, emergency services, or an employer. Avoid notifications that reveal a person's recovery status on a shared screen.
- Keep sensitive entries out of analytics, server logs, URL parameters, issue reports, and error traces. Assess device sharing, retention, deletion, consent withdrawal, access controls, encryption, and service-provider agreements before server persistence. Measure aggregate opt-in feature use separately from personal outcomes.
- Test missing/uncertain data, stale resource listings, denied permissions, paused/deleted state, accessibility, offline behavior, and emergency-path isolation. Report benchmark methodology and actual measured results, never fabricated effectiveness or accuracy claims.

## Founding Constitution

- `docs/governance/CONSTITUTION.md` is the canonical public **founding draft, not yet ratified**. `/constitution` displays it. Its protections and offices are proposals, not currently enforceable. Do not describe a draft, GitHub issue, donation, or majority as binding governance authority.
- Preserve a non-waivable rights floor in every design: ordinary help cannot depend on tracking or disclosure; location/contact sharing is optional and revocable; scores cannot independently deny help or trigger adverse action; people can inspect/correct data and seek timely independent human review. Do not claim these proposals are enforceable until a lawful governance structure and operational controls exist.
- The first public feedback process uses `.github/ISSUE_TEMPLATE/constitution.yml`. Issue numbers and GitHub discussion provide public identifiers and review history; the public issue body must not include health, contact, or location details. Offer a private challenge path for sensitive feedback. Preserve objections and contrary evidence in review; link decisions and follow-up outcomes to the original issue and reviewed PR.
- Any future authority must separate powers, limit and stagger terms, use transparent selection and cause-based removal with due process, prevent overlapping offices, disclose conflicts with privacy redactions, require recusal and independent replacement, and protect reviewers' budget and appointment independence. Emergency authority must be pre-defined, least-restrictive, time-limited, auditable, independently reviewed within 72 hours, and unable to suspend the rights floor. No office, funder, majority, or AI may create emergency powers for itself.
- Ratification/amendment safeguards must be public before voting: accessible and private affected-person participation, notice and cooling-off time, independent rights review, published evidence/conflicts, pre-set thresholds, preserved dissent, and auditable version history. Changes to the rights floor require affected-person approval plus independent rights review and cannot authorize rights violations.
- Constitutional edits require human review, explicit rationale, rights/evidence/conflict analysis, ordinary protected PR checks, and a traceable commit. An AI agent must not independently propose, approve, deploy, and certify a consequential constitutional change. Changes to binding elections, authorities, rights enforcement, or production data access need a separately approved design, security and legal review.
- Governance failures and issue-template changes must not affect emergency paths. No public submission directly edits the Constitution or triggers emergency action.
