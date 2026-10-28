# Owner decisions (humans only; protected path)

| Date | Decision | By |
|---|---|---|
| 2026-10-09 | Target autonomy level 3, guarded; dial held by `.factory/locks/autonomy` | Stephen |
| 2026-10-27 | `main` history is linear; rebase-merge only (FACTORY_RULES §12) | Stephen |
| 2026-10-28 | Autonomy dial set to 3: the factory (and anyone) may rebase-merge green, validated PRs; history stays linear (no squash, no merge commit). Human approval only for guard-protected paths, repo settings and secrets. Supersedes the same-day hold at 2. | Stephen |
