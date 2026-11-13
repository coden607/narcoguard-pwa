# Angel AI / Life Compass integration design — 2026-11-13

## Goal
Expose the general Life Compass decision-support protocol as a distinctly opted-into Angel AI mode while preserving NarcoGuard's emergency-first and privacy-first controls.

## Chosen architecture
Reuse the current `/api/angel` provider, resource tools and client transcript; allow an explicit validated mode flag and inject a separate, independently authored reasoning protocol only in this mode. Give the mode a dedicated route and Angel link. Design the protocol for future extraction to a separate public-benefit repo. No new storage, account, database, monitoring or third-party messages.

## Alternatives considered
1. Replace the existing Angel prompt globally — rejected because it disrupts simple resource requests and may alter existing safety/voice behavior.
2. Separate chatbot backend — rejected for duplicated provider, consent and emergency logic.
3. Distinct mode of Angel using reusable protocol — selected for minimal integration and clear user consent.

## Non-goals
Clinical replacement, diagnostic classification, personal outcome probability estimates, unverifiable literature citations, historical personal dossier, or mandatory sharing of Guardian data.

## Release
Reviewable PR only; production deployment and any public standalone repository require explicit authorization and license/privacy review.
