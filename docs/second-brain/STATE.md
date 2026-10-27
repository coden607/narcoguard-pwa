# NarcoGuard Second Brain — STATE

Only verified, durable current facts belong here. Replace stale facts rather than appending duplicates. Keep dated history in EVENTS.md. Never store secrets or credentials.

- Repository: `coden607/narcoguard-pwa`; default branch: `main`.
- Stack and project constraints are documented in the root `AGENTS.md`; consult it before implementation.
- ContinuityOS is the required control plane. If its router/Jev endpoint is unavailable in the current execution surface, use the documented local fallback and disclose that fact.
- Shared agent skills source: `coden607/skills`; use the pinned `.agent-skills/manifest.json` as the reproducibility source of truth.
- The repository already contains a `factory/` pipeline and `.github/workflows/factory-*.yml` workflows. Extend and verify these rather than introducing a competing factory.
- Preferred history: linear; use rebase-and-merge for approved PRs where repository settings permit it.
- Human approval remains required for material upgrades, production/safety-critical changes, security/auth architecture, destructive migrations, secret changes, deployments/releases, and external communications.
