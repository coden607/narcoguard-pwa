# Next-20 production enablement

Code merge is authorized only on green exact-head checks. Production database
migrations and reviewer appointments remain separate approval gates in AGENTS.md.

## Verified project and prerequisites

- NarcoGuard Supabase project: `ytzeuerdzzknitxxwznn` (`narcoguard-pwa`, active).
- Read-only inspection on 2026-10-17 found neither `resource_reports` nor
  `resource_moderation_events`; no development branches exist.
- The database migration history does not yet include the report foundation or
  the new governance review migration.
- Independent review and the pinned PostgreSQL test engine exercised both files
  together, including transaction rollback, service/authenticated role grants,
  ownership checks, verification before publication, rate limits, alias cycle/undo
  and the superseded-appeal adversarial sequence.

## Concrete database change awaiting owner approval

Apply these two committed migrations, in this order, to the project above:

1. `supabase/migrations/20261013054500_resource_moderation_queue.sql` creates
   private resource reports, immutable moderation events, indexes, RLS and the
   update-time trigger.
2. `supabase/migrations/20261017203644_resource_governance_review.sql` adds
   server-controlled reviewer membership, review/alias/audit records, structured
   observed hours and service-only transactional review RPCs. Browser roles cannot
   appoint reviewers or adjudicate their own reports.

No existing user records are deleted or backfilled. Do not populate reviewer
membership until the owner identifies the intended authenticated account(s) and
authorizes that access. Empty reviewer membership safely leaves publication and
adjudication unavailable; authenticated users can still submit and follow their
own reports once schema and service access are ready.

After an approved application: list migrations, inspect expected tables/functions,
run security advisors, and verify anonymous/private ownership denial plus ordinary
authenticated submission against a designated non-production fixture. Do not use
production user reports as test data. Do not execute a destructive down migration
as a routine verification step.

## Authentication configuration verification

Password recovery requires the exact deployed origin plus `/api/auth/recovery`
in Supabase Auth's redirect allowlist. Keep preview and production destinations
separate. No broad wildcard is needed for production. SMTP delivery and real link
expiry have not been verified by mocked browser tests; use a dedicated authorized
test inbox and account before claiming end-to-end email recovery is live.

The code uses browser-bound PKCE, a scoped httpOnly recovery token, generic
account-independent responses, a resend cooldown and explicit expiry handling.
Changing provider settings or sending test email is not implied by a passing
unit/browser fixture result.

## Functional boundaries

- Private planning and reminders are foreground, on-device tools; closed PWAs do
  not run background schedules or expiry deletion. Web Locks are required for
  race-safe persistence; unsupported browsers retain public help access.
- Meeting discovery opens verified official finders and preserves user-recorded
  source/timezone/status. No imported live provider schedule is claimed.
- Resource corrections and duplicate aliases preserve original provenance;
  publishing is a reviewed overlay, not an assertion that a provider is open.
