# NarcoGuard — Anticipated Feature Roadmap

Execution rule: implement and validate **one feature at a time**. Each feature must preserve privacy, explicit consent, uncertainty, accessibility, offline safety, and emergency-path isolation. A later item may move earlier only for a verified blocker or safety dependency.

1. **Known resource inventory + freshness** — remember previously discovered resources locally, track first/last seen, listed hours, open/closed/unknown state, and refresh public sources while the app is open.
2. **Predicted-need background watch opt-in** — let a user explicitly allow selected learned/predicted needs to create short-lived coarse-area resource watches while the app is closed.
3. **Resource change alerts** — notify when a watched resource appears, disappears from source results, materially changes hours/contact details, or becomes stale; never claim confirmed availability without provider evidence.
4. **Provider verification workflow** — add structured “called/confirmed” status with who/when/source and expiration; keep user-entered verification distinct from public-directory data.
5. **Resource calendar windows** — extract/record recurring meal, shower, pantry, clinic, meeting, and transportation windows where machine-readable or manually verified.
6. **Route-aware planning** — let users attach upcoming plans/appointments and rank resources that plausibly fit before/after them without background precise-location tracking.
7. **Need-chain forecasting** — extend local transition/neural models from one-step forecasts to bounded two- and three-step descriptive chains with minimum evidence and abstention.
8. **Intervention outcome learning** — locally learn which user-chosen interventions/resources were followed by a need being marked met, without claiming causation.
9. **Adaptive reward personalization** — let users choose what kinds of healthy/stability actions feel rewarding and tune local milestones without penalties or manipulative streaks.
10. **Achievement journal** — private timeline of completed stability actions, resources that worked, appointments kept, and user-selected wins.
11. **Hero practical-help offers** — Heroes can publish time-limited practical help categories separate from certified emergency Hero status.
12. **Hero-resource handoff** — accepting a practical request can hand off resource details, meeting point, and user-approved contact method without exposing unrelated profile data.
13. **Mutual trust/reputation signals** — opt-in, bounded post-interaction feedback focused on reliability/helpfulness; no public recovery-risk score.
14. **Resource contributor mode** — non-Hero users/organizations can submit or update resources with provenance and moderation status.
15. **Resource moderation queue** — reports, duplicates, stale listings, unsafe content, and provider corrections move through an auditable moderation workflow.
16. **Offline known-resource pack** — cache a bounded set of recently useful resources and safety fallbacks for offline access with clear stale timestamps.
17. **Personal preparedness plan** — user-selected naloxone, charger/battery, transit, food, hygiene, medications/appointments, and support-person checklist.
18. **Context-aware gentle prompts** — user-configurable timing windows for food, sleep, hygiene, appointments, connection, and resource follow-through; no punitive notifications.
19. **Model transparency dashboard** — show what signals each local learner used, training counts, abstention reason, and what changed since the last model update.
20. **Safety/fairness calibration harness** — offline evaluation suite for false alarms, missed cues, subgroup-independent feature behavior, calibration drift, deletion/pause behavior, and notification privacy before stronger predictive claims.
21. **On-device model changelog + rollback** — versioned local learner bundles with signed manifests; revert to the previous learner when the calibration harness reports regression, with the reason shown in the transparency dashboard.
22. **Support-circle check-ins (opt-in)** — user-approved, bounded read-only view for a trusted contact: prepared plans, "I'm safe" check-ins, and resource follow-through nudges they can see; nothing about predictions or need history.
23. **Supply exchange board** — local, moderated listings for naloxone kits, chargers, hygiene packs, and transit help between users and organizations, reusing contributor provenance and the moderation queue.
24. **Severe-weather resource overlay** — seasonal warming/cooling centers and shelter windows layered onto the existing watch framework, with weather-triggered escalation and the same no-confirmed-availability rule.
25. **Anonymous quality telemetry (opt-in)** — aggregate, k-anonymized counters for feature usefulness, abstention rates, and moderation outcomes to guide the roadmap without user profiling or content payloads.

## Current execution state

- Feature 1: **complete and merged**
- Feature 2: **complete and merged**
- Feature 3: **complete and merged**
- Feature 4: **complete and merged**
- Feature 5: **complete and merged**
- Feature 6: **complete and merged**
- Feature 7: **complete and merged**
- Feature 8: **complete and merged**
- Feature 9: **complete and merged**
- Feature 10: **complete and merged**
- Feature 11: **complete and merged**
- Feature 12: **complete and merged**
- Feature 13: **complete and merged**
- Feature 14: **complete in this change**
- Feature 15: **complete and merged**
- Feature 16: **complete and merged**
- Feature 17: **complete and merged**
- Feature 18: **complete and merged**
- Feature 19: **complete and merged**
- Feature 20: **complete and merged**
- Feature 21: **complete and merged**
- Feature 22: **complete and merged**
- Feature 23: **complete and merged**
- Feature 24: **complete and merged**
- Feature 25: **next**

## Anticipated features 26–75 (planning horizon)

Same rules apply: privacy, explicit consent, uncertainty, accessibility, offline safety, emergency-path isolation. No clinical claims.

26. **Medication and appointment reminder anchors** — record clinician-prescribed times and places; local reminders only, no adherence scoring.
27. **Travel-mode resource planning** — temporarily rank resources for a destination ZIP with an automatic return-home switch and expiry.
28. **Naloxone kit location journal** — user-recorded where each kit lives (bag, glovebox, friend's house) with freshness dates; local only.
29. **Document and ID vault** — encrypted storage for ID, insurance, and clinic cards with emergency-contact release rules.
30. **Crisis plan versioning** — user-authored crisis plan with version history and rollback; shareable read-only to the support circle.
31. **Recovery meeting finder** — public meeting schedules with verification status and lightweight "changed" feedback; never claims attendance.
32. **Peer support matching (opt-in)** — mutual-consent introduction cards between users with shared self-described goals; no direct messaging until both opt in.
33. **Sponsor bridge** — reuse support-circle scopes so a sponsor or mentor sees safe check-ins and plan follow-through only.
34. **Volunteer driver windows** — organizations publish bounded ride windows; requests mediated through the moderation and trust framework.
35. **Multi-language resource labels** — crowd-contributed translations of resource names and kinds with moderation; source language always shown.
36. **Accessibility ratings for resources** — wheelchair access, quiet space, pets allowed; user-contributed with provenance.
37. **Provider claim-your-listing** — verified providers can claim and correct their own listing; corrections keep provenance visible.
38. **Hours-accuracy voting** — "as listed / different / unknown" lightweight signals feeding the resource change watch.
39. **Resource duplicate merge tooling** — moderator-side merge with preserved provenance and undo.
40. **Moderation appeals** — submitters and reporters can appeal decisions; appeals enter the same auditable queue.
41. **Organization trust badges** — verified organization accounts with explicit badge scope and expiry; no service endorsement.
42. **Printable emergency sheet** — one-page sheet of emergency card, contacts, crisis plan, and kit locations for fridge or glovebox.
43. **Lock-screen emergency widget** — OS widget surfacing emergency card actions without opening the app; works offline.
44. **App PIN with emergency-path bypass** — optional app lock where the emergency screen stays reachable without the PIN.
45. **Data export and deletion receipts** — full local data export (JSON/PDF) and verified deletion with an auditable receipt.
46. **Low-bandwidth mode** — text-only resource views, skip images and maps, cache-first loading.
47. **SMS fallback check-ins** — opt-in SMS "I'm safe" publishing for the support circle when data service is unavailable.
48. **Voice-note journaling** — encrypted local voice notes attached to the achievement journal; any transcription is explicit opt-in.
49. **Seasonal pattern review** — quarterly on-device summary of stability patterns with abstention when evidence is thin; user-deletable.
50. **Supply forecasting** — bounded estimate of when a user-logged consumable may run out, with uncertainty shown and no auto-purchasing.
51. **Budget-aware supply and resource ranking** — extend cost signals (free only, sliding scale) to the supply exchange and recommendations.
52. **Local safety notices** — opt-in, manually curated public safety notices near known resources with source links and timestamps.
53. **Shelter-bed availability signals** — display machine-readable bed counts where providers publish them; never invent availability.
54. **Transit assistance tracker** — log which fare-assistance programs were applied to, their status, and renewal dates.
55. **ID replacement checklist** — guided local checklist for replacing lost identification with office hours and required documents.
56. **Clinic intake preparation** — user-authored notes on what to bring and say at specific clinics, with a day-before reminder.
57. **Response practice mode** — step-by-step response drills with a training timer; labeled as training, not medical advice.
58. **Support-circle drill sharing** — share a simple response drill checklist with approved contacts so they know the plan.
59. **Watch critical-alert audit** — hardware-button and escalation-path audit for Apple Watch and Wear OS flows.
60. **Offline map tiles for known resources** — cached map region around home and saved places, bounded size with stale labels.
61. **Home-screen gentle prompt widget** — next planned action or follow-through item, glanceable; no streaks and no guilt copy.
62. **Alert accessibility profiles** — distinct tones and vibration patterns for emergency versus gentle nudges, WCAG-minded.
63. **Screen-reader audit pass** — automated plus manual accessibility audit of resource and guardian flows with tracked findings.
64. **Reduced-motion mode** — disable animations and transitions across guardian and watch surfaces.
65. **Large-text and high-contrast themes** — theme integration that also follows system accessibility settings.
66. **Ephemeral resource presence** — opt-in, coarse "ask me about this resource today" signals at resource level only; k-anonymized and auto-expiring.
67. **Organization needs board** — organizations post bounded volunteer and supply needs discoverable locally under moderation.
68. **Kit assembly checklist builder** — user-configurable kit contents with local inventory counts and freshness dates.
69. **Power preparedness** — phone and watch battery thresholds enter the preparedness checklist with offline charging reminders.
70. **Local data dashboard** — show what each feature stores, its size, and one-tap prune; extends deletion and export work.
71. **Progressive onboarding** — set scopes, notification categories, and accessibility preferences up front without dark patterns.
72. **Recovery-friendly job connector** — public, verified listings from partner organizations under the moderation framework; no application tracking claims.
73. **Legal-aid connector** — public legal-aid resources (records, housing) using the same verification and freshness framework.
74. **Offline drill scheduler** — scheduled local drills for response and evacuation walk-throughs, logged to the achievement journal.
75. **Roadmap voting (opt-in)** — anonymous, k-anonymized feature-priority signals feeding this roadmap; pairs with Feature 25 telemetry.
