# Life Compass Angel Integration Implementation Plan

> **For agentic workers:** Follow the source and tests in this PR before expanding; each future step must have independently verified evidence.

**Goal:** Introduce Life Compass as a non-clinical, evidence-aware, opt-in Angel AI mode.

**Architecture:** Reuse Angel API+frontend; new prompt and deterministic routing helper; no added storage and no new external service.

**Tech Stack:** Next.js, TypeScript, Zod, Node test runner.

**Spec:** `docs/superpowers/specs/2026-11-13-life-compass-angel-integration-design.md`

## Global constraints
- No changes to emergency notices.
- No user chat persistence.
- No provider credential or production config changes.
- Preserve MIT for existing files; PolyForm Noncommercial for the independently authored reasoning module only.
- Do not invent citations, clinical efficacy, calibrated probabilities or live research access.

## Review focus
1. Existing Angel requests remain unchanged without the explicit mode.
2. Crisis/emergency notifications continue in both modes.
3. User-context sharing remains opt-in.
4. Resource requests continue using the current directory lookup.
5. Citations are not represented as verified without a retrieval tool.

## Implemented task
- [x] Add a mode-specific prompt and routing helper.
- [x] Validate explicit API mode and pass reasoning route through existing provider.
- [x] Add dedicated Angel Life Compass page and link.
- [x] Add regression tests and scoped licensing documents.

## Verification pending
- [ ] Run `npm run test:features` with the repository's Node 24 environment.
- [ ] Run `npm run typecheck && npm run lint`.
- [ ] Review provider consent content and verify production does not receive a change before explicit approval.
- [ ] If public release planned, complete legal/license and clinical safety review.
