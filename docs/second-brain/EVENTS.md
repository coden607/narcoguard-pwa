# NarcoGuard Second Brain — EVENTS

Append dated entries. Do not rewrite prior events. No credentials or sensitive personal data.

## 2026-10-27 — Factory stays human-on-merge; history becomes rebase
- Request: run the software factory and second brain so enhancements happen without manual implementation. Owner stays in the loop for merge requests and important upgrades.
- Decision: keep autonomy at 2. Factory opens and validates PRs. Owner rebase-merges.
- Decision: switch factory merge method from squash to rebase so `main` stays one straight line.
- Decision: route substantive work through ContinuityOS and Jev when actually available; otherwise use the documented local fallback and say so.

## 2026-10-28 — Autonomy raised to 3, rebase-only merges by the factory or anyone
- Decision (Stephen): the factory may rebase-merge green, validated PRs; anyone may merge by rebase only. History stays one straight line: no squash, no merge commit.
- Human approval stays for guard-protected paths, repository settings and secrets, and the irreversible list. The merge script fails closed and a live-check failure reverts the whole PR range.
- Supersedes the 2026-10-27 hold at dial 2.
