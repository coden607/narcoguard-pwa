# NarcoGuard — Next 20 Anticipated Features

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

## Current execution state

- Feature 1: **complete and merged**
- Feature 2: **complete and merged**
- Feature 3: **in implementation / validation**
- Features 4–20: queued in this order
