# Architecture — NarcoGuard next phase (October 2026)

## Problem & goals
People in crisis need food, water, a toilet, a bed and overdose help near them, quickly and without being
asked the same thing twice. This phase makes nearby help faster and broader, lets Angel remember where the
person is (on their phone only), adds one-click Google sign-in, and pilots the Hero Network in one county with
written duty and consent terms. Every decision is judged against the rights floor in
`docs/governance/CONSTITUTION.md`: ordinary help never depends on an account, tracking or a signed waiver.

## Approaches considered
- **Resources: live search (current) vs. per-area RAG catalogue vs. live search + area cache.** A RAG catalogue
  needs a maintained, verified dataset (AGENTS.md stage 2) and goes stale silently; live search is fresh but
  slow on cold calls. **Chosen: live search + a short-lived area cache** keyed by a ~1 km cell and need list, so
  repeat searches in an area answer instantly while listings stay fresh. A verified catalogue remains stage 2.
- **Angel AI: users' own ChatGPT accounts vs. our provider chain.** Third-party web apps cannot use a person's
  ChatGPT subscription or ChatGPT voice mode; there is no such API. **Chosen (owner): keep Kimi first** with the
  gateway fallback chain; Kimi currently returns 429 on every call (most likely no API balance — the Kimi chat
  app's credits are separate from the API platform), so Angel answers on the open fallback model until it is
  topped up. Voice stays on-device speech recognition and synthesis.
- **Hero Network: nationwide vs. one-area pilot vs. stay off.** **Chosen (owner): pilot in Broome County, NY**,
  after the owner signs off as the safety and privacy review AGENTS.md requires, with draft agreements marked
  for legal review.
- **Sign-in: Google + Apple vs. Google first vs. passkeys.** **Chosen (owner): Google first** via Supabase OAuth
  (PKCE); name and email come from Google, so nothing is typed. Apple later.
- **Location memory: on device vs. account vs. none.** **Chosen (owner): on device**, opt-in, one tap to forget.

## Recommended approach
Brownfield. Reuse `lib/resource-lookup.ts` and add an in-memory area cache in front of Overpass and
FindTreatment. Extend water to taps and water points marked potable. Angel stores the ZIP or rounded location
in `localStorage` after the person agrees, and reuses it in every chat and in Find help. Google sign-in adds an
OAuth start route and a PKCE callback beside the existing email/password flow in `lib/supabase-auth.ts`.
The Hero pilot uses the existing alert design (`lib/hero-alerts.ts`, pull-only, ~5 km cell, 30 minutes, at
most 5 Heroes) plus two signed records: a Hero duty agreement and a requester location consent, and a pilot
area gate.

## Key decisions
- **Stack & libraries** — no new dependencies: Next.js route handlers, Supabase Auth REST (PKCE) and Postgres,
  existing Overpass/FindTreatment clients. Alternatives (a RAG vector store, the Supabase JS client, NextAuth)
  add moving parts without a current need.
- **Data model** — `hero_agreements` (hero, agreement version, accepted terms: carries naloxone on duty, on-call
  windows honoured, signed at) and `hero_request_consents` (request, consent version, location-sharing scope,
  signed at), both RLS-protected and written only by the server. The area cache is in memory, never stored.
- **Boundaries & contracts** — Google OAuth client and secret live in Supabase, not in this app. The app needs
  `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` in Vercel. Coordinates are still rounded
  and never logged; consent text is shown before any location is shared with a Hero; declining never blocks
  911, naloxone steps, Angel or Find help.
- **Other** — agreements are versioned; changing terms requires re-acceptance. The pilot gate is a server-side
  list of allowed counties (`HERO_PILOT_AREAS`), so widening is a config change after review.

## Missing pieces
- Production database: the vault, watch registry and Hero alert migrations are not applied (only
  `hero_certifications` exists). Applying them to production needs the owner's explicit go-ahead.
- Vercel: Supabase URL and keys are not set in production.
- Google Cloud OAuth client + enabling the Google provider in Supabase (owner).
- Kimi API balance (owner) — or Angel keeps answering on the fallback model.
- Legal review of the Hero duty agreement and the requester consent (drafts only until then).

## Spikes & experiments
```
Question:      Does the area cache cut cold-to-warm latency enough without serving stale listings?
Spike:         Cache per ~1 km cell for 15 minutes; measure p50/p95 of /api/resources/needs over a day
Decision rule: keep 15 min if warm p95 < 1 s and no stale complaints; shorten if listings change faster
```
```
Question:      Will enough Heroes be on duty in Broome County to answer within minutes?
Spike:         Pilot with certified Heroes only; track requests, acknowledgements and time to first response
Decision rule: widen the area only if most requests get an on-duty Hero acknowledgement in < 5 minutes
```

## Open questions
- Who performs the legal review of the agreements, and by when.
- Whether Hero agreements should require proof of naloxone (photo, kit serial) or an attestation only.
- Apple sign-in timing (needs an Apple Developer account).
