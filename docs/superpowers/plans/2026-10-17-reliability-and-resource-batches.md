# Approved 20-feature Implementation Plan

> **For agentic workers:** Use executing-plans task-by-task and independent review. Independent domains are delegated under dispatching-parallel-agents; integration and exact-head release gates remain with the coordinator.

**Goal:** Complete the owner's approved 20-item queue and merge only green heads.

**Architecture:** Extend current Next.js routes, local-first planning stores and Supabase-authenticated resource review contracts. Keep private drafts on device; provider-published facts remain distinct from observations. Ship bounded batches with tests and independent review.

**Tech Stack:** Existing Next.js 16, React 19, TypeScript, Supabase, Node tests and Playwright; pinned development-only PGlite 0.5.10 executes migration authorization tests in CI. No new runtime dependencies.

**Spec:** `docs/roadmap/2026-10-17-next-20.md`, explicitly approved for implementation and green-only merge on 2026-10-17.

## Global Constraints

- Emergency actions stay public and independent of account, prediction, moderation and watch status.
- No invented schedules, accessibility facts, provider verification, clinical claims or live deployment results.
- Keep production database operations gated; complete and review migrations before any approval request.
- Use canonical Continuity OS dispatcher locally; daemon unavailable. Load only pinned matching skills and retain interruption state.
- Do not weaken tests, Lighthouse assertions or auth checks to manufacture green results.

## Review Focus

- Narrow screens and enlarged text: every action remains reachable by keyboard and finger.
- Private drafts: update prompts and connectivity failures cannot silently discard or transmit them.
- Expired credentials and redirects: no external redirect targets or recovery tokens in logs.
- Stale resources: unknown/cancelled information never becomes confirmed availability.
- Ownership and moderation: cross-user requests, self-approved provider claims and stale concurrent updates must fail.

## Task 1: Finish watch recovery (#1–2)

- [x] Add full image during loading/failure, disabled inactive controls, manual retry and incremental cleanup.
- [x] Validate renderer-constructor failure and partial-initialization failure; successful retry has exactly one canvas.
- [ ] Merge PR #170 only after all exact-head gates succeed; investigate Lighthouse failures without changing thresholds.

## Task 2: Mobile, scrolling and updates (#3–5)

**Files:** `app/globals.css`, `components/ui/dialog.tsx`, `components/ui/scroll-area.tsx`, `components/pwa/service-worker-register.tsx`, new `lib/app-update.ts`, `tests/feature-app-update.test.ts`, `tests/accessibility-update.spec.ts`.

**Interfaces:** `classifyDeploymentVersion(loaded: string | null, latest: unknown): {loaded: string; update: string | null} | null` rejects invalid versions and never relabels a loaded build as the latest. `approveUpdateReload(dirty: boolean, confirm: () => boolean): boolean` gates user-requested reload without storing field values.

- [ ] Test valid/malformed/missing versions, unsaved cancellation, and display of loaded versus available version.
- [ ] Implement safe version display, manual recheck, reconnect status and unsaved-work guard.
- [ ] Browser-test 280px and 200% text across auth/account/watch/help/stability; dialog and chat scrolling preserve page reachability.
- [ ] Run focused tests/lint/typecheck, review, then prepare batch commit.

## Task 3: Authentication (#6–9)

**Files:** Existing auth UI/API and PKCE modules, new reset page and auth recovery helpers; `tests/auth-recovery.spec.ts`, targeted auth unit tests. Coordinator integrates account 401 redirect.

- [ ] Test and implement generic confirmation resend with cooldown and editable email.
- [ ] Test and implement safe local return URLs and stale-session recovery.
- [ ] Test and implement complete reset request/callback/new-password flow with expiring token handling and no secret logging.
- [ ] Exercise preview auth endpoints at the network edge without sending real emails or creating production accounts; document any provider-specific manual verification.

## Task 4: Offline pending chat (#10)

**Files:** `components/ai/angel-ai.tsx`, `lib/angel-pending.ts`, `tests/feature-angel-pending.test.ts`, `tests/offline-pending.spec.ts`.

- [ ] Fail a send at the network edge; keep unsent content visible in memory with retry/cancel.
- [ ] Retry manually after reconnection; preserve one user message and clear pending only on an acknowledged result.
- [ ] Clear conversation removes pending content; no background send or persistence of sensitive chat.

## Task 5: Private planning (#11–13, #20)

**Files:** New `/planning` route, `components/planning/**`, `lib/personal-*.ts`, planning unit/browser tests. Reuse existing resource lookup/ranking and canonical crisis-plan storage.

- [ ] Test consent, malformed/corrupt storage, bounded records, erase and expiry.
- [ ] Implement destination ZIP override with expiry/cancel restoring home and actual lookup ranking.
- [ ] Implement kit location/freshness journal and crisis-plan snapshots, inspection and restore.
- [ ] Implement foreground follow-up reminders with consent, quiet hours, snooze/cancel and truthful app-closed limitations.

## Task 6: Meeting and accessibility discovery (#14–15)

**Files:** Meeting finder and accessibility components/modules, `/meetings`, current resource finder integration, discovery tests.

- [ ] Verify supported official provider discovery surfaces before implementation; preserve source language/timezone and unknown/cancelled states.
- [ ] Implement official discovery and user-saved records without manufacturing live API results.
- [ ] Implement accessibility observations with field-level unknown values, source/check date and moderated submission.

## Task 7: Provider corrections, hours, duplicates and appeals (#16–19)

**Files:** Existing reports route/moderation model; new correction/alias/appeal models, routes, `/resources/review`, tests and reviewed migration as required.

- [ ] Test owner/moderator authorization, independent provider verification and private reporter visibility.
- [ ] Implement provenance-preserving correction overlays and structured hours observations; source facts change only through authorized review.
- [ ] Implement duplicate alias resolution and undo preserving prior references.
- [ ] Implement one active appeal per decision, owner status access and independent review; audit every state transition atomically.
- [ ] Validate schema offline/non-production; do not apply production migration without its required approval.

## Task 8: Integration and release

- [ ] Add discoverable links and browser suite entrypoints; update queue with evidence and remaining configuration gates.
- [ ] Run `npm run verify` (or report unavailable stages by name) and exact-head CI, including expanded browser tests and Lighthouse.
- [ ] Obtain whole-patch independent review; fix important findings and repeat only affected validation.
- [ ] Squash merge green heads as authorized; verify the production version and reachable critical public paths. Distinguish merged code from features requiring pending production schema/provider configuration.
