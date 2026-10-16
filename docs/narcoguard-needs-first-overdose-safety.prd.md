# PRD — NarcoGuard: needs-first overdose safety and recovery support

Status: draft for owner review · 2026-10-09 · Owner: Stephen Blanford · Source of truth for `MISSION.md`
Evidence drawn from: `README.md`, `AGENTS.md`, `docs/governance/CONSTITUTION.md`, `docs/architecture/next-phase-2026-10.md`,
production behaviour of https://www.narcoguard.app. Anything not evidenced is marked **TBD — needs validation**.

## 1. Problem statement

People who use opioids, and the people around them, face two problems at once. When someone overdoses there
may be minutes to act, and bystanders often do not know the steps, do not have naloxone, or fear legal
consequences. Between emergencies, unmet basic needs (food, potable water, a toilet, a shower, a bed) crowd out
treatment and recovery: addiction can make using feel as urgent as food or sleep (NIDA), so needs further up
the ladder slip away. The cost of not solving this is preventable death and recovery that never gets started.

## 2. Evidence

- Overdose deaths and the effectiveness of bystander naloxone: public CDC/NIDA data cited in the app.
  **Local (Broome County) baseline — TBD — needs validation.**
- Help exists but is scattered: SAMHSA FindTreatment, 211, OpenStreetMap amenities, Good Samaritan laws that
  differ by state. Observed in building `/help` and `lib/good-samaritan-laws.ts`.
- Live search in Binghamton returned real shelters (Salvation Army, Catholic Charities of Broome, Volunteers of
  America) and 12 toilets once name-based matching was added — the data is findable but not easy to find.
- **User interviews with people who use drugs, outreach workers, or families — none recorded yet. Assumption —
  validate via 5–10 interviews with Broome County harm-reduction programs.**

## 3. Thesis (why build it)

Today people cope by calling 211 during office hours, asking around, searching several directories, or going
without. NarcoGuard puts the next practical step — the nearest food, water, toilet, shelter, naloxone,
treatment, or the overdose steps themselves — one tap or one spoken sentence away, free, without an account,
without tracking, and in the order of the person's own stated needs. Why now: free capable AI models, open
directory data, OTC naloxone (2023), and phones that can run on-device speech and vitals checks. The switch
reason must be speed and dignity: faster than 211 and directories, and it never asks for anything it does not need.

## 4. Hypothesis

We believe that a free, account-optional app that answers "what do I need right now and where is it?" in
seconds, and walks a bystander through an overdose, will cause people who use drugs and the people around them
in a pilot county to find and use nearby help and to act correctly in an overdose, resulting in more needs met
and more bystander responses with naloxone.

- We'll know we're **RIGHT** if, within 90 days of a Broome County pilot, people return to find help (repeat
  aggregate searches per area grow week over week) and partner programs report the app being used to find
  them. **Thresholds — TBD — needs validation with partners.**
- We'll know we're **WRONG** if aggregate searches stay flat or one-off, partners report listings are wrong or
  stale more than they are right, or any safety guardrail moves: an emergency path fails, help is gated on an
  account/tracking, or personal data appears in logs.

## 5. Target user & JTBD

- **Primary user:** a person who uses opioids, often with unstable housing, on a phone with patchy data.
  *When I'm hungry, thirsty, need a toilet or somewhere to sleep, I want to say it once and see the nearest real
  place, so I can get it without explaining myself.*
- **Secondary user:** a bystander (friend, family, stranger) at an overdose. *When someone won't wake up, I want
  clear steps and naloxone guidance immediately, so I can keep them alive until EMS arrives.*
- **Tertiary user:** a certified volunteer Hero (pilot only). *When I'm on duty, I want to know someone nearby
  asked for help after calling 911, so I can bring naloxone.*
- **Non-users:** clinicians needing diagnostic data; anyone needing a medical device; employers, insurers or
  law enforcement seeking information about a person; people expecting the app to call 911 or monitor them.

## 6. MVP (what exists, and the thinnest next line)

Live today: needs-first Find help (food, water, toilets, showers, shelter, treatment, naloxone, and more) with
sources and "call first"; Angel AI chat/voice that remembers a ZIP or rounded location on the phone; overdose
steps, CPR and Good Samaritan summaries; training and Hero certification; emergency contacts; on-screen vitals;
optional account with encrypted backup; Guardian planner; installable PWA.

Next thin line to prove the hypothesis: the Broome County pilot — real people searching for basic needs, plus a
small certified on-duty Hero group with a signed duty agreement — measured with aggregate, privacy-safe counts.

## 7. Success metrics

| Metric | Target | How measured |
| --- | --- | --- |
| Emergency path available | 100% of deploys | E2E on every change: dashboard → overdose steps → Call 911 link |
| Time to first nearby result | p95 < 3 s warm, < 10 s cold | Server timing on `/api/resources/needs` (no personal data) |
| Basic-needs coverage in pilot area | food, water, toilet, shelter each ≥ 1 listing within 10 mi | Scheduled directory check for Broome County ZIPs |
| Repeat use | TBD — needs validation | Aggregate Vercel Analytics, no custom personal events |
| Listing accuracy | TBD — needs validation | Partner spot checks |
| Privacy guardrail | 0 personal/health/location values in logs | Log scan in CI and runtime |

## 8. Non-goals

- Not a medical device, diagnosis, or proof that a wearable detects or reverses overdoses; no claims of automatic
  naloxone delivery working.
- Not an emergency service: never auto-calls 911, dispatches responders, or claims to monitor anyone.
- No relapse prediction, risk scores, or percentage chances; no inference from silence.
- No gating of any help on an account, tracking, waiver, payment, or check-in.
- No selling, sharing, or analytics of personal, health, or location data; no background location tracking.
- No silent outreach to contacts, employers, or authorities.
- No binding governance: the Constitution stays a draft until humans ratify it.
- No production payments, hardware sales, or Hero alerts outside an approved pilot.
- No content from unrelated repositories (see `docs/PROJECT_BOUNDARY.md`).

## 9. Open questions

- [ ] Pilot success thresholds and who reports partner feedback.
- [ ] Legal review of the Hero duty agreement and requester location consent; who and by when.
- [ ] Kimi API balance, or accept the free fallback model as the default.
- [ ] Google sign-in switch-on (Supabase provider, redirect URL, Vercel env).
- [ ] Verified resource catalogue (stage 2) — partner data source and refresh owner.
- [ ] Apple sign-in timing.
