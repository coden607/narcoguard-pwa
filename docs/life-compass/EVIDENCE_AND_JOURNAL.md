# Life Compass Evidence + Encrypted Journal — November 13, 2026

## What is implemented

- Life Compass remains a distinct, opt-in Angel AI mode.
- An independent **general-keyword** search retrieves actual PubMed bibliographic metadata on explicit user action. Nothing is sent to PubMed from the Angel transcript, encrypted journal or Guardian planner.
- The encrypted on-device journal stores only manually entered decisions, hypotheses, measurable indicators and subsequently observed results. It never imports Angel chat automatically.
- User action required for each save, unlock, restore, erasure and backup. No cloud history, silent tracking, scheduling, contact, or predictions. Passphrases are not stored.
- PBKDF2-SHA256 (310,000 iterations), random salt, AES-256-GCM per-save random IV, authenticated format, decryption fails closed.
- Forecasts and observations are human-authored and uncalibrated; no individualized probabilities, clinical verdicts, or automated scoring.
- Scope: `packages/life-compass-core/src/*` is original new source licensed under scoped PolyForm NC; previously MIT licensed NarcoGuard code remains MIT.

## Privacy and limitations

The standalone lookup sends the person's **typed research query** to NCBI. A user could type sensitive words despite the warning, so do not claim this is anonymous or no-data-transfer. Publisher metadata is not a systematic literature review, verification of personal allegations, or study-quality assessment. The browser's WebCrypto vault limits exposure at rest but cannot protect against compromised devices, malicious extensions, or weak passwords. Losing the passphrase or clearing browser storage means lost history unless an encrypted backup exists.

This is nonclinical decision support, not a psychologist, emergency responder, or a mental-health outcome predictor. Consent and safety reviews remain necessary before treating it as a clinical intervention.

## Verification gate

- `npm run test:features`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test:pwa` via existing CI.
- Exact PR head must pass quality, PWA smoke, Lighthouse and linear history before rebase merge.
- Source and licensing need human review as appropriate; clinical effectiveness not asserted.

## Long-term architecture

The independent Life Compass Commons package can be extracted from the `packages/life-compass-core` contract and linked by npm/workspace once `coden607/life-compass` exists. A public release must preserve PolyForm and third-party upstream notices, and must never include any private decision records.
