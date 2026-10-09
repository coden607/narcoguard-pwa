# Fix a PR

Target: a factory PR with failing checks or `factory:changes-requested`.

1. Count existing `factory:fix-*` labels; add the next one (`factory:fix-1`, then `factory:fix-2`).
2. Check out the PR branch. Read the failing check logs and the validator's findings (not the hidden scenario
   names, which are withheld on purpose; a `HOLDOUT_FAILED` count means re-read the issue and MISSION Gate 3).
3. Fix the source, never the test. Run `bash factory/validate.sh --quick`, `npm run verify`,
   `python3 factory/guard.py`.
4. Push to the same branch. Remove `factory:changes-requested`. Comment **Factory · fix-pr** with what changed.
