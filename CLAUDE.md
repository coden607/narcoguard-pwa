@AGENTS.md

## Claude Code tooling in this repo

- `.claude/hooks/session-start.sh` (cloud sessions): switches to Node 24, installs dependencies from the lockfile, and sets `PLAYWRIGHT_CHROMIUM_EXECUTABLE` when Playwright's bundled Chromium is missing, so `npm run verify` works immediately, and installs every shared skill from coden607/skills at the pinned commit, so each new session starts with the full library.
- `.claude/settings.json`: pre-approves the read-only and gate commands, blocks reading real `.env*` files (use `.env.example` for names), and blocks force-pushes.
- `/validate` (`.claude/commands/validate.md`): comprehensive validation and repair of confirmed regressions.
- `release` skill (`.claude/skills/release/SKILL.md`): branch, gate, preview, PR, merge, production deploy and live verification, with the required human approval before production.
- Dark factory: `MISSION.md`, `FACTORY_RULES.md` and `FACTORY.md` govern the hourly factory; a PreToolUse hook keeps every session out of the hidden scenarios (FACTORY_RULES.md 9).
- `.mcp.json`: `next-devtools` (Next.js 16 docs and diagnostics) and `playwright` (browser checks), both pinned. Vercel and GitHub access come from the session's connectors; locally, add your own with `claude mcp add`.

## Shared agent skills

Read and follow `AGENTS.md` before planning, editing, testing or committing. Use the complete canonical https://github.com/coden607/skills library under its shared-skills policy.

## Links for the owner

- Every link given to the owner must be a full, clickable `https://` URL that opens the exact page or setting meant (for example the project's Vercel environment-variables page, not the Vercel homepage).
- Never hand over placeholder links such as `https://<project-ref>.supabase.co`. When the exact URL depends on something you cannot see, give the closest real clickable link (Supabase's `https://supabase.com/dashboard/project/_/...` routes ask which project to open) and say what is missing.
