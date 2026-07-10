# NarcoGuard PWA — Agent Guide

## Project

NarcoGuard is a production-oriented Next.js PWA for the NG2 overdose-prevention wearable. Treat reliability, accessibility, privacy, and emergency-flow correctness as safety-critical.

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
