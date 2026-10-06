# Shared agent skills

NarcoGuard consumes the shared skill catalog from `coden607/skills` through a pinned manifest.

## Source of truth

- Repository: `https://github.com/coden607/skills.git`
- Pinned commit: see `.agent-skills/manifest.json`
- Bootstrap: `bash scripts/bootstrap-agent-skills.sh`
- Validation: `npm run validate:agent-skills`

The bootstrap is idempotent. It checks out the exact pinned commit, copies each required skill folder into `.agent-skills/vendor`, and mirrors those skills into repo-local `.claude/skills` and `.codex/skills` directories for compatible CLIs.

Do not silently track the upstream `main` branch. Updating shared skills is an explicit repository change: review the upstream diff, update the pinned commit in the manifest, run the bootstrap, then run the full NarcoGuard verification gate.

The currently required set is the seven core shared skills plus `adaptive-persona` and `jev-gate`. Project-specific rules in `AGENTS.md` remain authoritative when they are more specific.
