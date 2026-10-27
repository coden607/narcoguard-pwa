# Factory backlog (owner-curated, safe, in-scope ideas)

`factory/proposals.py` turns the first unchecked item into one `factory:proposed` issue at a time.
The owner promotes it by adding `factory:accepted` + a `priority:*` label. Out-of-scope or protected-path
work never belongs here (MISSION.md, FACTORY_RULES.md 5).

Format: `- [ ] <title> | <one-line why> | <size: S/M/L>`

- [ ] Add regression tests for uncovered resource-search failure states | stale-result and empty-result paths are explicit failures | S
- [ ] Lighthouse accessibility pass on /find-help at 200% zoom | measurable a11y gain on the core path | M
- [ ] Bundle-size audit of the three heaviest routes | measurable performance work | M
