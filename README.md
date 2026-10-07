# NarcoGuard — public PWA and wearable research concept

NarcoGuard explores overdose prevention and person-led recovery support. It is organized around [Maslow's hierarchy of needs](#how-narcoguard-uses-maslows-hierarchy-of-needs): basic needs first, then safety, connection, stability and the goals each person chooses. Today the free app offers needs-first resource search, Angel AI, emergency and CPR steps, training and Hero certification, Good Samaritan law summaries and an optional Guardian planner. It is guided by a public [founding Constitution](#founding-constitution) draft, not yet ratified, whose proposed rights floor keeps ordinary help free of tracking or risk scores. The public web app is a **demo and research concept**. It is not a validated medical device, emergency dispatch service, treatment program, or proof that an experimental wearable can detect or reverse an overdose. In an immediate emergency, call 911.

## Visit and contribute

- [Public PWA](https://narcoguard-pwa.vercel.app)
- [Guardian Stability planner](https://narcoguard-pwa.vercel.app/stability)
- [Founding Constitution](https://narcoguard-pwa.vercel.app/constitution) — **founding draft, not yet ratified**
- [Repository](https://github.com/coden607/narcoguard-pwa)
- Contact: [narcoguard607@gmail.com](mailto:narcoguard607@gmail.com)

## What this release does

The PWA demonstrates emergency guidance, wearable and community response concepts. A screen or prototype algorithm does not establish clinical reliability. The public demo does not automatically contact 911, dispatch responders, deliver naloxone, or alert loved ones.

The optional Guardian Stability page lets a person record daily needs, estimated sleep, personal goals, a task for tomorrow, and a support phone number. It suggests relevant public service directories such as 211 when a need is marked. Records stay in the browser's local storage; there is no account sync. A person can pause recording or erase planner data from that browser. A link to call a support person opens the phone dialer only when tapped. The page shows a descriptive count from answered entries after enough data is available, not a relapse prediction. Resources may be unavailable or have changed; verify with each provider.

Site traffic is measured with Vercel Analytics. Guardian check-in answers, sleep, goals, ZIP code and contact number are not sent as custom analytics events. See the [privacy page](https://narcoguard-pwa.vercel.app/privacy) for browser-sharing and third-party-link details.

## How NarcoGuard uses Maslow's hierarchy of needs

**Why it matters in addiction.** Addiction can hijack the hierarchy: drugs over-activate the brain's reward circuit, and with repeated use it becomes hard to feel pleasure from anything besides the drug ([NIDA](https://nida.nih.gov/publications/drugs-brains-behavior-science-addiction/drugs-brain)). Using can come to feel as urgent as food or sleep, and basic needs, safety, relationships and goals slip away, which makes recovery harder to start. NarcoGuard helps rebuild from the bottom, alongside treatment rather than instead of it. It is not a cure and cannot promise recovery. Treatment referrals: SAMHSA National Helpline, 1-800-662-4357 (free, confidential, 24/7).

NarcoGuard is organized around [Maslow's hierarchy of needs](https://www.narcoguard.app/about): basic needs first, then safety, connection, stability and the person's own goals. It is a planning aid, not a ranking of people. Every kind of help stays available at every level, and nothing is withheld because a need was or wasn't stated.

| Level | What it covers | Where it lives |
| --- | --- | --- |
| 1. Body and basic needs | Food, water, a place to sleep, toilets, showers, laundry | Find Help needs search (`/help`), Guardian planner check-in (`/stability`) |
| 2. Safety and health | Overdose response, naloxone, clinics, pharmacies, emergency rooms | Dashboard emergency steps, Training (`/ar`), Find Help |
| 3. Recovery and connection | Treatment, someone to talk to, peer support, community spaces, trusted contacts | Find Help, Angel AI (`/angel`), emergency contacts, Hero Network |
| 4. Stability and independence | Work, internet and phone charging, skills | Find Help job help and libraries, Hero certification |
| 5. Growth and goals | The person's own goals, broken into steps | Guardian planner goals and tomorrow's task, Angel AI |

How it works:

1. **Say it in your own words.** On Find Help, "I'm hungry and need somewhere to sleep" is matched on the device (`lib/need-intent.ts`). The words go to the AI provider only if the person taps "Let AI read my words". Angel chat is separate: after the person agrees to start a chat, each message is sent to the AI provider to get a reply, and conversations are not stored.
2. **Stated needs first.** The needs a person names are shown first, with basic needs leading when several are named. All other categories follow in the levels used by Find Help (`NEED_LEVELS` in `lib/resource-finder.ts`). Food, shelter and showers widen from 10 to about 25 miles when nothing is close, and are labelled as farther away.
3. **The person chooses a goal; Angel listens.** Angel AI follows the same order when several needs are mentioned. For a goal, it offers two or three small next steps and asks which one the person wants. The Guardian planner can hold tomorrow's task.
4. **Move up at your own pace.** The same tools help with work, learning and connection as today's needs are handled.

The AI listens and suggests; it never decides. NarcoGuard cannot guarantee that a need will be met. Listings come from public directories and may be out of date, so call first or dial 211.

## Planned Guardian work

The long-term direction is a person-led planner for food, water, rest, hygiene, laundry, safety, connection, treatment, and meaningful goals. The next resource phase needs verified local service hours, eligibility, accessibility, freshness, and an honest unknown or unavailable state. Only after separate evaluation could the product offer opt-in proactive guidance based on personal patterns. It must never invent a percentage chance of relapse or treat a correlation as a clinical prediction. Any outbound alert to a loved one requires separate, specific, revocable permission, delivery handling, and review. These capabilities are **not live**. Engineering rules are in [AGENTS.md](AGENTS.md).

## Founding Constitution

The [canonical draft](docs/governance/CONSTITUTION.md) is published at `/constitution`. Visitors can submit public support, objections, proposed changes, evidence, harms, or constitutional challenges through the [structured issue form](https://github.com/coden607/narcoguard-pwa/issues/new?template=constitution.yml). A public GitHub issue number identifies the submission; discussion, decisions, and linked PRs provide a review record. Do not place private health, contact, or location information in a public issue. Email is available for feedback that should not be public. Submissions are advisory: they neither edit the document automatically nor control emergency functions. Binding elections, ratification, and institution-level authority require future reviews and are not implemented here.

## Run locally

Use Node 24 and npm. Copy `.env.example` to `.env.local` only if you need the optional integrations; never commit secret values.

```bash
npm ci
npm run dev
```

Run `npm run verify` before a release. This checks lint, types, production and claim validation, signal/Guardian/Constitution tests, dependency audit, build, and PWA browser smoke. Browser tests require Playwright Chromium; CI runs them when a local browser is unavailable. See [deployment guidance](docs/DEPLOYMENT.md) and [project operations](docs/PROJECT_OPERATING_SYSTEM.md).

## License

MIT. Contributions do not confer ownership, employment, payment, or governance authority.
