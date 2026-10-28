# Factory backlog (owner-curated, safe, in-scope ideas)

`factory/proposals.py` turns the first unchecked item into one `factory:proposed` issue at a time.
The owner promotes it by adding `factory:accepted` + a `priority:*` label. Out-of-scope or protected-path
work never belongs here (MISSION.md, FACTORY_RULES.md 5).

Format: `- [ ] <title> | <one-line why> | <size: S/M/L>`

- [ ] Low-data mode: text-first resource lists with no images or map tiles on slow or metered networks | score 86/100 (impact 9, risk low, reuses the existing offline cache); fits the people most likely to be on weak signal; opt-in toggle, nothing sent anywhere | M
- [ ] Offline-readiness page showing cache version, saved resources count and last sync time | score 82/100 (impact 8, risk low); lets a user or helper confirm the app will work with no signal before they need it; local-only | S
- [ ] Naloxone kit expiry and restock reminders using local notifications only | score 78/100 (impact 8, risk medium: touches the Feature 28 kit journal); no server, no data leaves the device; needs owner review of wording | M
- [ ] Printable one-page naloxone steps card generated offline (no account, no tracking) | score 74/100 (impact 7, risk low); useful when a phone is dead or the helper has no app; content must be copied verbatim from the reviewed response guide | S
- [ ] High-contrast and large-text option for the Find Help and resource screens | score 72/100 (impact 7, risk low); extends the 200% zoom a11y pass; emergency screens excluded (protected) | M
- [ ] Resource freshness stamps ("verified N days ago") with a stale warning | score 70/100 (impact 8, risk medium: relies on the resource data source); stale hours or addresses waste time in a crisis | M
- [ ] Hands-free read-aloud for the response steps using on-device speech only | score 64/100 (impact 9, risk HIGH: safety-critical emergency path, protected); propose only, owner and clinical review required before any build | L
- [ ] Add regression tests for uncovered resource-search failure states | stale-result and empty-result paths are explicit failures | S
- [ ] Lighthouse accessibility pass on /find-help at 200% zoom | measurable a11y gain on the core path | M
- [ ] Bundle-size audit of the three heaviest routes | measurable performance work | M
