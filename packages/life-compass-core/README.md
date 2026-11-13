# Life Compass shared core inside NarcoGuard

**License:** PolyForm Noncommercial License 1.0.0 (new original files). Existing NarcoGuard software remains MIT.
This folder is a **reusable extraction boundary**, not a claim that a standalone GitHub repository has already been published.

Design:
- Browser-only encryption: PBKDF2-SHA256 310,000 iterations, per-vault salt and AES-256-GCM nonce. No plaintext logging/storage.
- A user may voluntarily enter a decision with a measurable but uncalibrated hypothesis and later record outcomes; all remain person-reported.
- The literature adapter retrieves bibliographic metadata from NCBI PubMed on explicit request, only after the person types a separate research query. It does not evaluate studies.
- No clinical diagnosis, efficacy claim, mental-health risk score, or automatic decision/action.
- No external data transmissions from the encrypted vault; password not stored.

The standalone source-available Life Compass Commons package is distributed separately as a ZIP until a new repository is deliberately created. Do not replace the licensing in existing MIT files or copy private user data into the public package.
