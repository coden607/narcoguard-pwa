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
- Feature 25: **complete and merged**
- Features 1–25: **all merged. The original roadmap is fully shipped.**
- Feature 26: **complete and merged**
- Features 26–150: anticipated; Feature 27 **next**

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
76. **Refusal-safe practice mode** — scripted simulation walks with scripted risk outcomes so drills never touch live detection thresholds.
77. **Needs-trend honesty chart** — weekly sparkline of detected vs self-reported needs, with the uncertainty envelope always drawn.
78. **Resource visit log (local)** — private, on-device log of sites contacted with outcome tags; feeds follow-up reminders without leaving the device.
79. **Check-in geofence options** — optional arrival confirmation using coarse geofence regions, never raw coordinate storage.
80. **Circle availability windows** — trusted contacts publish quiet hours so nudges and requests only land inside agreed windows.
81. **Supply board expiry** — listings auto-close after a configurable TTL with a "still available?" owner nudge before expiry.
82. **Moderator appeal window** — moderated users see the standing rule, the action, and a one-time appeal path with the same audit trail.
83. **Emergency card translations** — community-reviewed translations of the emergency card into the top locally requested languages.
84. **Offline map tiles** — bounding-box tile packs for the drill and evacuation walk-through features, with explicit storage cost.
85. **Watch battery drill mode** — drills that specifically rehearse the low-battery escalation path end to end.
86. **Resource wheelchair detail expansion** — capture entrance, restroom, and parking access notes as separate verified fields.
87. **Shelter bed-count skepticism label** — public bed counts displayed with source age and a standing "call first" rule.
88. **Anonymous peer reassurance** — k-anonymized "others completed this step today" counts on drills and plan milestones.
89. **Notification budget** — a daily cap per category with overflow queued visibly instead of silently dropped or spammed.
90. **Data diet mode** — one toggle that trims retention windows, map detail, and telemetry to the minimum across all features.
91. **Home-screen risk glance** — a widget-sized summary of readiness score, next drill, and supply expirations; no predictions.
92. **Plan handoff packet** — a portable, printable summary of the preparedness plan for case managers, with consent-gated contact info.
93. **Local policy explainer** — plain-language explainers of Good Samaritan and 911 immunity for the user's state, with source links.
94. **Resource outage reporting** — one-tap "this site is closed" reports flowing into the moderation queue with photo-optional evidence.
95. **Supply request board** — the inverse of the supply board: posted needs that owners can claim, same lifecycle and moderation.
96. **Check-in streak honesty** — streaks that pause rather than break during declared low-capacity periods, by explicit user declaration only.
97. **Audio calm-down tool** — short, locally stored audio grounding exercises; no streaming, no analytics.
98. **Reader-mode resource pages** — high-contrast, large-type rendering of resource details for low-vision and crisis states.
99. **Multi-language needs vocabulary** — the needs taxonomy translated so non-English self-reports map to the same learner labels.
100. **Trusted-device management** — named devices with per-device sign-out, visible in one list; pairs with Feature 8 sessions.
101. **Resource cost transparency** — track and display typical cost bands (free, low, sliding) as verified fields, never guesses.
102. **Drill difficulty adaptation** — drills shorten or extend based on the last completed drill's self-reported difficulty, capped and reversible.
103. **Offline first-run packet** — a static, bundled explanation of the app's safety posture readable before any account exists.
104. **Supply board moderation presets** — one-tap moderator actions (escalate, warn, close) with reason codes wired to Feature 15's audit trail.
105. **Weekly readiness digest (email-opt)** — a plain-text weekly summary of drills, check-ins, and expiring supplies; off by default.
106. **Transportation rehearsal** — drills for reading transit routes to a chosen resource under time pressure, fully offline.
107. **Resource photo verification** — volunteer-verified exterior photos with moderation review, replacing stale directory images.
108. **Quiet-hours-aware notifications** — the notification pipeline respects per-category quiet hours before dispatch.
109. **Plan duplication for families** — fork a trusted contact's plan template with their explicit share consent.
110. **Moderator workload visibility** — aggregate open-queue counts for moderators so staffing decisions are data-informed.
111. **Crisis-language detection opt-in** — local, on-device scan of user's own journal notes for crisis phrases offering resources, never uploaded.
112. **Supply kind expansion pass** — community-proposed new supply kinds through the same provenance and moderation gates.
113. **Drill completion certificates** — shareable, non-identifying completion records for programs that require proof of practice.
114. **Resource comparison view** — side-by-side comparison of two sites across verified fields with the uncertainty column kept visible.
115. **Low-storage resilience** — graceful degradation ordering: what gets pruned first, shown to the user before it happens.
116. **Check-in location label picker** — choose from saved labels instead of typing, reducing accidental precision leaks.
117. **Weekly plan review nudge** — a single weekly prompt to re-read and adjust the preparedness plan; snoozable, never forced.
118. **Abstention reason follow-up (opt-in)** — optional one-tap reason capture when abstaining, feeding Feature 25 counters only.
119. **Emergency-contact rehearsal** — scripted practice call/text flows to a chosen contact so the real moment is not the first run.
120. **Resource notes (private)** — user-private annotations on resource records stored on-device only.
121. **Moderation SLA display** — public queue-health indicator (median time-to-review) with no individual moderator identity.
122. **Supply handoff confirmation** — both parties confirm a handoff happened; unconfirmed claims auto-release after the TTL.
123. **Seasonal checklist rotation** — the preparedness checklist rotates seasonal hazards (heat, cold, storms) by local alert state.
124. **Screen-reader drill mode** — drills validated against screen-reader flows with an explicit pass/fail checklist in CI.
125. **Local referral code of conduct** — a visible, versioned conduct text governing supply board and peer interactions, acknowledged at first use.
126. **Notification mirroring opt-in** — mirror high-severity notifications to a second device the user owns, with per-device toggles.
127. **Resource data provenance page** — per-source freshness and coverage report, including known gaps, linked from resource details.
128. **Plan milestones** — split the preparedness plan into ordered milestones with small, completable steps and honest effort estimates.
129. **Offline glossary** — plain-language definitions of every clinical term the app surfaces, bundled for offline use.
130. **Supply board saved searches** — local saved filters with optional notification when a matching listing appears.
131. **Moderator shadow mode** — new moderators act in shadow (recommend-only) for their first N reviews; agreement tracked.
132. **Check-in mood tag** — optional one-tap mood tag on check-ins, stored locally, never transmitted.
133. **Resource event feed** — public events (naloxone trainings, outreach tables) as time-boxed, source-attributed records.
134. **Data export scheduling** — recurring encrypted exports to user-chosen storage on a schedule the user sets.
135. **App-locked quick actions** — configurable lock-screen actions (call contact, show emergency card) that work under duress quickly.
136. **Verification expiry sweep** — verified fields that age out on a schedule, returning to "unverified" until re-confirmed.
137. **Peer drill invite** — invite a trusted contact to complete the same drill on their device; completion shared only as yes/no.
138. **Language detection for resources** — tag resources offering non-English service; stored as a verified field.
139. **Notification batching window** — user-set windows where non-urgent notifications collapse into one digest dispatch.
140. **Moderation queue triage sort** — order the queue by severity, report count, and source reliability instead of arrival order.
141. **Readiness plan export variants** — clinician, family, and emergency-room variants of the plan export with different field subsets.
142. **Supply board location radius** — expand matching beyond ZIP equality to a coarse radius label (same neighborhood), still no coordinates stored.
143. **Drill interruption recovery** — drills resume cleanly after app restarts mid-drill without double-counting steps.
144. **Watchlist watch-dog** — alert the user when a watched resource's data changes materially (hours, phone, status).
145. **Anonymous completion heatmap** — k-anonymized aggregate drill completion by day of week to help programs schedule trainings.
146. **Resource multilingual feedback** — feedback on resources accepted in any language, translated client-side, moderated centrally.
147. **Account-less guest mode** — a bounded guest session for one-off resource lookups with clear upgrade prompts, no persistence tricks.
148. **Supply handoff safety script** — a short, scripted safety checklist shown to both parties before marking a handoff complete.
149. **Plan seasonal review** — a twice-yearly full-plan review prompt with a diff view of what changed since last review.
150. **Community roadmap digest** — a periodic, public summary of shipped features and queue depth, generated from the repo itself.
