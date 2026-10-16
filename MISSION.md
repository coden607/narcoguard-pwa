# Mission

**Derived from:** `docs/narcoguard-needs-first-overdose-safety.prd.md`
**Last reconciled with that PRD:** 2026-10-09
**Owner:** Stephen Blanford. Humans only: this file is protected, and the factory cannot edit it.

## What NarcoGuard is

NarcoGuard is a free, installable web app that puts the next practical step one tap or one spoken sentence
away for people who use opioids and the people around them. It covers the nearest food, potable water, toilet,
shower, shelter, naloxone or treatment, plus clear overdose and CPR steps. It works without an account and
without tracking, and it orders help by the person's own stated needs, using Maslow's hierarchy as a planning
aid. Angel AI talks or types with the person and finds nearby help.

It is one public deployment (https://www.narcoguard.app) on Vercel with an optional Supabase backend. Help is
read from public directories (SAMHSA FindTreatment, OpenStreetMap) and is always labelled with its source and
"call first".

## Who it is for

- A person who uses opioids, often without stable housing, on a phone with patchy data, who needs a basic need
  met now.
- A bystander at an overdose who needs the steps and naloxone guidance immediately.
- (Pilot only) a certified volunteer Hero who is on duty and may bring naloxone.

NarcoGuard is not a medical device, an emergency service, a treatment program or a monitoring system.

## Core capabilities (in scope)

The factory may accept issues in these areas.

**Find help (`/help`, `app/api/resources/**`, `lib/resource-*`, `lib/need-intent.ts`, `lib/maslow-resources.ts`)**
- Better, faster, more accurate nearby listings for food, potable water, toilets, showers, laundry, shelter,
  medical care, naloxone, treatment, someone to talk to, charging, work.
- Clearer source, distance, hours, "call first", directions and Call 211 fallbacks.
- Caching and latency work that never stores personal data.

**Angel AI (`/angel`, `app/api/angel`, `lib/angel-*`, `components/ai/**`, `lib/voice.ts`)**
- Reply quality, speed, provider fallback reliability, voice, the on-device saved place, nearby-search tool use.

**Safety education (`/ar`, `/safer-use`, training, Good Samaritan summaries display)**
- Accuracy, accessibility and offline use of the guidance that already exists.

**Accessibility, performance, offline/PWA, mobile layout, copy clarity** across every page.

**Tests** for existing uncovered behaviour, and regression tests for reported bugs.

## Out of scope (the factory must never build this)

These come from the owner's interview answers on 2026-10-09. Issues asking for any of them are rejected at
triage, however popular or easy.

**Gating or tracking**
- Requiring an account, sign-in, waiver, payment, check-in or location to get any help or emergency guidance.
- Background or continuous location tracking, or tracking a person without their in-the-moment action.
- Risk scores, relapse predictions, or percentages about an individual.

**Silent contact**
- Automatically calling 911, texting contacts, notifying employers, police or anyone else without the person
  tapping to do it.
- Hero alerts or notifications that reveal a person's recovery status.

**Data**
- Selling, renting or trading any user data, ever.
- Sending personal, health, location or identity data to third parties for advertising or analytics.

## Hard invariants (not tunable by any issue)

1. **Emergency help is always one tap away, with no conditions.** The dashboard emergency button,
   `tel:911` and `tel:988` links, and the overdose and naloxone steps render for everyone: offline, signed out,
   with location denied, and in every watch lock state.
2. **Phone numbers for 911, 988, 211, SAMHSA (1-800-662-4357) and Never Use Alone (1-800-484-3731) are exact.**
   A wrong digit can kill someone.
3. **Angel's safety net is deterministic.** `/angel` always shows the 911 and 988 links, and any message that
   sounds like an overdose or crisis gets the 911/988 notice from `lib/angel-ai.ts`, whatever the model says.
   Angel never claims to monitor, detect or contact anyone.
4. **Location is rounded to about 1 km before it leaves the browser or reaches a server, model or log.** Saved
   places stay on the phone. Logging personal data is allowed only with the person's explicit consent, and no
   such consent flow exists yet; adding one is a human decision.
5. **No medical claims beyond the evidence.** No claim that NarcoGuard or the NG watch detects or reverses an
   overdose, or that automatic naloxone delivery exists (`npm run validate:claims` enforces part of this).
6. **The founding Constitution stays a draft.** An AI must not propose, approve and deploy a constitutional change.
7. **The factory cannot modify governance files.** `MISSION.md`, `FACTORY_RULES.md`, `FACTORY.md`, `AGENTS.md`
   and `CLAUDE.md` are the constitution of the factory. A PR touching any of them is rejected automatically.

## Allowed evolutions

- Refactors inside Find help and Angel that keep every invariant and every test, and come with their own tests.
- Replacing a public directory source with a better public source, if listings keep their source label.
- Performance, accessibility and copy improvements anywhere outside the protected list.

## Definition of done

**Gate 1 - static checks and tests pass.** `npm run verify` (lint, typecheck, production/env/supabase/claims
validators, unit suites, watch design, dependency audit, build, 55+ Playwright tests).

**Gate 2 - the change is usable without instructions** by a stressed person on a small phone, with large tap
targets and plain words.

**Gate 3 - the three journeys pass as a real user, against the running app.**

1. Start the production build. `GET /` answers and the dashboard shows "Call 911" linked to `tel:911`.
2. Emergency: the overdose steps and naloxone guidance render, and Call 911 / 988 links are exact.
3. Find help: on `/help`, tap Food and Water, enter ZIP 13901, and listings appear with a source and a Call 211
   fallback for any need with no listing.
4. Angel: on `/angel`, agree to consent, send "I'm hungry, my zip is 13901", and the reply names a nearby place
   with a phone number, and the page shows the 911 and 988 links. Sending "my friend won't wake up" returns
   the 911 notice.
5. Live: after deploy, the same checks pass on https://www.narcoguard.app.

## Non-goals

NarcoGuard is not trying to be a social network, a telehealth service, a dispatch service, a data broker, or a
general-purpose chatbot.

When in doubt, the answer is "that is out of scope."

## Open questions - decisions nobody has made yet

These are undecided, not forbidden. **The factory may propose an answer**, build against it, record the
assumption, and hold the merge for a human (see `FACTORY_RULES.md` §7).

- **Q1** Pilot success thresholds for repeat use and listing accuracy.
- **Q2** Whether Angel should default to the free fallback model when Kimi has no balance.
- **Q3** Apple sign-in timing.

**Except these, which stop the factory** (irreversible list, `FACTORY_RULES.md` §7.3):

- Anything about identity, sign-in, accounts, or who may act as whom.
- Any database migration, or consent-based logging of personal data.
- Hero alerts going live, and the Hero duty agreement / requester location consent (need legal review).
- Medical or legal claims (Good Samaritan law text, overdose steps).

## What the factory does NOT own - permanently human

- Whether the tone feels right to someone in crisis: warm, non-judgemental, not preachy.
- Whether the page looks right and reads clearly on a cracked phone in the dark.
- Whether listings are actually true on the ground (partners and 211 verify that).
- Clinical, legal and governance content: overdose steps, naloxone guidance, Good Samaritan law, the Constitution.

The factory owns Find help, Angel's plumbing, accessibility, performance and tests: the layer whose correctness
can be asserted. A green gate means that layer is intact, not that the product is good.
