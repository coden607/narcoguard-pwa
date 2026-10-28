# NarcoGuard Second Brain — STATE

Only verified current facts. Replace a stale line; do not add a second line for the same key. History lives in EVENTS.md. Never store secrets.

- Repository: `coden607/narcoguard-pwa`. Default branch: `main`. Live app: [narcoguard-pwa.vercel.app](https://narcoguard-pwa.vercel.app). Source: GitHub, 2026-10-27.
- Control plane: ContinuityOS (`coden607/continuity-os`, `coden607/continuityos`) plus pinned skills from `coden607/skills`. If the ContinuityOS router or Jev endpoint is not connected, use the AGENTS.md fallback and say so. Source: AGENTS.md, 2026-10-27.
- Factory: `factory/` plus `.github/workflows/factory-*.yml` already exist. Extend them. Do not add a second factory. Source: FACTORY.md, 2026-10-27.
- Autonomy dial: 3. Factory may triage, implement, validate and rebase-merge green PRs; anyone may merge by rebase only. Source: `.factory/locks/autonomy`, owner decision 2026-10-28.
- History policy: rebase-and-merge only. No merge commits. Never squash. Source: owner request, 2026-10-27.
- Human still approves: guard-protected paths, important upgrades, production or safety-critical changes, auth, migrations, repository settings and secrets, deployments, and external communications. Source: owner decision, 2026-10-28.
