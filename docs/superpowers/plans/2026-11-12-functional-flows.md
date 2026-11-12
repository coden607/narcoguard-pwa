# Functional flow repairs

Goal: repair reproducible failures in existing software flows without claiming that hardware or unconfigured external services work.

Base: `ffb7189`; branch: `fix/functional-flows-20261112`. ContinuityOS MCP/board tools are unavailable; apply the repository's local routing and approval fallback. Shared skill bootstrap failed because its Git source requires authentication; the pinned compress-token-spend instructions were read through the authorized GitHub connector instead.

- [x] Reproduce preference corruption and blocked-storage failures with behavior tests.
- [x] Normalize saved preferences, preserve existing values on setup edits, and make Settings reopen setup without deleting data.
- [x] Make saved setup contacts and naloxone locations usable from the contacts page without requiring SMS or an account. Keep manual calls distinct from separately consented server texts.
- [x] Test account backup error handling and fix false success or unhandled restore/logout failures.
- [x] Run feature, Guardian, signal, vitals, Constitution, lint, types, build and validation checks; attempt browser smoke and document environment or provider blockers.
- [ ] Review the complete diff, commit, and prepare a reviewable PR. Production deployment, service activation, database writes and external messages require separate approval.

Review cases: partial/invalid stored JSON; denied storage access and quota failures; existing contacts when editing setup; failed network logout; damaged encrypted backup; unavailable optional providers; emergency guidance remaining accessible.
