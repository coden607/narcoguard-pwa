# What works, and what still needs a person, a device, or a credential

Checked against the repository on 2026-11-18. Names below are environment variables. Do not put secret values in this file.

## Working without extra credentials

- Step-by-step naloxone and CPR guides at `/ar`, including the second-dose timer and compression beat. The camera is an optional local preview. It is not recorded, and it is not augmented-reality tracking.
- Practice lessons on the same page. Progress stays in this browser. The graded Hero test is `/hero-signup` and is scored on the server when `HERO_CERT_SECRET` is set.
- Find-help search uses public SAMHSA and OpenStreetMap directories. Call 911, 988, and 211 stay available when a search has no listing.
- Phone pulse and breathing estimates, and standard Bluetooth heart-rate or pulse-oximeter readings, stay on screen. They are not overdose detection and they are not stored.

## Needs hardware or a credential before it can do more

| Capability | What is implemented | What is still required |
| --- | --- | --- |
| Wearable vitals | `GET /api/vitals` and `POST /api/vitals` refuse to invent readings. The dashboard says there is no live sensor. | A verified ingest provider, plus `NG_WATCH_API_KEY` and `NG_WATCH_ENDPOINT` for that provider. No NG watch has shipped. |
| Watch owner lock | Pairing code exists and safety actions are not gated. | `WATCH_REGISTRY_PRIVATE_JWK`, `SUPABASE_SERVICE_ROLE_KEY`, and a real watch. |
| Contact texts | The contacts screen can store consented contacts and show manual call links. | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` or `TWILIO_MESSAGING_SERVICE_SID`, `CONTACT_ALERTS_SECRET`, and `SMS_ALERTS_ENABLED=true` after consent, delivery, and opt-out review. |
| Nearby Hero requests | Built and switched off. | A separate safety and privacy review before `HERO_ALERTS_ENABLED=true`, plus Supabase and `HERO_CERT_SECRET`. Do not apply that migration to production before the review. |
| Optional account backup | End-to-end encrypted in the browser. Sessions last 30 days via an httpOnly refresh cookie. | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and for Google sign-in `AUTH_GOOGLE_ID` plus `AUTH_GOOGLE_SECRET`. Set `AUTH_URL=https://www.narcoguard.app`. Apple sign-in stays hidden until `AUTH_APPLE_ENABLED=true` and `AUTH_APPLE_ID` / `AUTH_APPLE_SECRET` are set. Emergency features do not require an account. |
| Angel AI | Relays a chat after in-page consent. | One of `MOONSHOT_API_KEY` or `KIMI_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`, or the Vercel AI Gateway. Retention terms for Moonshot stay unverified until checked. |

Virtual-reality training is not part of this app. A local class is the right place for hands-on CPR and naloxone practice.
