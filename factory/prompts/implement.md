# Implement (the owner's process, approvals removed)

Target: one `factory:accepted` issue.

1. Read the issue. Restate the change in one sentence and list the files you expect to touch. If any is in
   `PROTECTED` in `factory/guard.py`, stop: label the issue `factory:needs-human` with your proposed change and
   escalate.
2. `git checkout -b factory/issue-<N> origin/main`.
3. Read the relevant code and AGENTS.md sections first. Use the repo's skills as you would interactively
   (prime, plan, implement). Keep the change minimal (§2): at most 500 lines and 12 files.
4. Write a test that fails without your change (unit test in `tests/feature-*.test.ts` or a Playwright test in
   `tests/pwa.spec.ts`). Never edit or delete an existing test to make it pass.
5. Run `bash factory/validate.sh --quick` until it prints `VALIDATE_OK`, then `npm run verify`. Then run
   `python3 factory/guard.py` and fix anything it reports.
6. Commit (message ends with the attribution lines from your session), push the branch, and open a PR to `main`
   titled with the outcome. Body: what changed and why, `Fixes #<N>`, and `## Assumptions` listing any product
   value you chose (§7.1). Labels: `factory:built`, plus `factory:assumption` if you listed any.
7. Never read `.factory/holdout/`. The hidden scenarios run in CI; you get only a count.
