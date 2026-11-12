# Functional audit — November 12, 2026

Audited repository: `coden607/narcoguard-pwa`, base `ffb71897ae7cfd5342e637a8ae4371b74cebd4ee`. Changes are prepared for review, not deployed. No accounts, provider credentials, production data, payments, or external messaging were changed.

## Verified deployment gap

The public [version endpoint](https://www.narcoguard.app/api/app-version) reported `0ea77a0e093493f46c4e71be563e66191d1b1308`, an October 19 commit. The audited main branch contains **90 later commits**. A successful repository build therefore does not establish that visitors have the current features. The mapped Vercel project is `narcoguard-pwa` under `stephens-projects-8fbc16d0`; custom-domain assignment and a release must be checked before deployment.

## Repairs in this change

| Flow | Reproduced problem | Result |
| --- | --- | --- |
| Preferences | Partial nested objects, malformed collections and shared defaults could corrupt setup or crash consumers | Normalize each field; keep safe independent defaults and valid saved data |
| Settings/setup | Settings deleted preferences; editing started with empty contacts/name/locations; completion retained the skipped flag | Reopen existing setup without deleting; seed saved fields; clear skipped status on completion |
| Restricted storage | A blocked storage property or write could trap setup or crash Angel, Find Help and Daily Life | Handle the property failure, preserve temporary preference state, keep basic help usable, and show persistence warnings |
| Saved setup details | Contacts and naloxone locations collected in setup had no corresponding view on the separate contacts screen | Show saved locations and manual tap-to-call links; retain separately consented server-text enrollment |
| Account actions | Failed logout showed signed out; malformed decrypted backup could cause unhandled errors; temporary contact restores could claim persistence | Require server-confirmed logout, validate backup contents before replacement, confirm restore, catch failures, and report either store's temporary state |
| Daily Life/support tools | Write/quota failures stopped edits; failed deletion could be represented incorrectly | Continue visit-local edits with warnings; report failed erasure without claiming it occurred |
| Wake reminder | Desktop-only Notification construction fails in mobile PWAs; duplicate alerts within the due minute; missing notification destination | Prefer service-worker notifications, open Daily Life on tap, deduplicate successful delivery, and allow failed attempts to retry |

## Capability boundaries

| Capability | Evidence/status | Smallest next step |
| --- | --- | --- |
| Optional account | Live `/api/auth` reported available; actual user login, email delivery and encrypted backup roundtrip were not exercised | Use a dedicated test account on a verified preview and confirm a complete restore/logout cycle |
| Angel AI | Live `/api/angel` reported Kimi available, non-strict privacy, retention unverified; no paid generation was requested | Test a non-sensitive prompt after consent on the reviewed preview |
| Contact texting | Live `/api/contacts` reported unavailable; mapped project env-name inventory contains no Twilio or contact-alert signing configuration | Review recipient consent, delivery/opt-out setup and provider configuration before enabling test-mode sends |
| Watch/vitals provider | Live `/api/watch` and `/api/vitals` reported unavailable; mapped project env-name inventory has no NG watch provider configuration | Connect a real supported provider/device and verify stale, disconnected and invalid reading behavior |
| Bluetooth readings | Implemented for supported Web Bluetooth browsers; no physical sensor was available for this audit | Test a standard heart-rate or pulse-oximeter device on a supported browser; iPhone support is not established |
| Background alerts/timers | Local reminder delivery is foreground/page-active; background trusted-contact timer remains [issue #282](https://github.com/coden607/narcoguard-pwa/issues/282) | Design and separately review server scheduling, revocation and delivery/failure handling |
| Wearable treatment/detection | Experimental concept; physical fit and water resistance remain verification-pending | Complete bench and independent validation; do not substitute simulated values for device evidence |
| Additional proposed features | Unimplemented product proposals remain in the [open backlog](https://github.com/coden607/narcoguard-pwa/issues) | Select and specify a bounded feature; proposed issues are not proof of shipped functionality |

## Verification and release

The complete `npm run verify` was attempted. Its skill-manifest, lint, production inventory, environment inventory, types, Supabase migration-definition validation, claims, signal/vitals/Guardian/Constitution/feature suites, watch-model validation, dependency audit and production build ran successfully before the browser stage. Migration-definition checks do not establish the live database's applied schema.

Browser execution was blocked: installed Chromium cannot create its required socket in this executor; the official Playwright headless-shell download returned invalid/empty archives. The separate browser could not reach the executor's localhost. Do not count these as passing interaction/offline tests. New setup regression cases are included in `test:pwa` for the normal CI runner. A final production HTTP smoke checks route HTML, manifest/icons, service-worker/offline assets and read-only API availability, but does not replace browser interaction tests.

Review found and corrected wake-notification navigation, notification retry state, install-button ambiguity, blocked support-tool persistence and temporary contact-restore reporting. No unresolved finding remained in that scoped review. See the PR for final check counts and exact-head CI status.

Final local verification: **621 feature tests passed**, lint and types passed, production build passed, and **37 production HTML routes** plus PWA assets and six API availability responses passed the HTTP smoke. Transactional crisis-plan rollback tests also passed after preserving the shared writers' throwing contract and handling persistence failure at the UI boundary. Browser interaction tests remain unverified locally.

Before release: exact-head CI including browser/offline checks must pass; verify domain/project/source identity and necessary schema/provider setup; obtain owner approval for protected paths and production deployment. Do not describe all NarcoGuard functions as fully operational until these gaps are resolved.
