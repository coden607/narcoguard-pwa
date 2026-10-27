# Second brain

| Tier | File | Rule |
|---|---|---|
| STATE | `/MEMORY.md` | one line per key, overwrite when it changes, always `as-of`, `source`, `review-by` |
| EVENT | `memory/daily/YYYY-MM-DD.md` | append-only, ET times, one line per decision or outcome |
| KB | `memory/kb/*.md` | promoted, reusable lessons (what failed, why, the rule that prevents it) |

Rules: classify each new fact as STATE or EVENT before writing. When a new fact contradicts a STATE line,
overwrite the line and log the change as an EVENT. Public repo: no secrets, no personal, health or location
data. Audit: `continuity brain audit --root .` (ContinuityOS) flags stale or contradicted STATE lines.
Weekly: promote repeated EVENT patterns to `memory/kb/`.
