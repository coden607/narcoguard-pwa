# Production deployment and secret handling

## Current production gate

Every main-branch deployment must pass the GitHub CI workflow:

- lint and TypeScript checks;
- Supabase migration/RLS static validation;
- unsupported public-claim scan;
- deterministic sensor-fusion regression test;
- `npm audit --audit-level=high`;
- production build;
- Playwright PWA smoke tests;
- Lighthouse collection and assertions.

The current verified Vercel project is `airbearmes-projects/narcoguard-pwa`, with `https://narcoguard.app` as its production alias.

## Automatic deployment

The Vercel project is connected to the `coden607/narcoguard-pwa` GitHub repository. Successful pushes to `main` are deployed by Vercel's native Git integration after the project build completes. The repository does not duplicate that deployment with a token-based GitHub workflow; this avoids storing or exposing a Vercel API token in CI.

If a token-based deployment is required in a different environment, add `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` through GitHub Settings or `gh secret set`. Never commit, log, or place these values in `.env.example`.

## Vercel environment variables

Vercel stores production values encrypted. Public `NEXT_PUBLIC_*` values may be included in browser bundles; database URLs, Supabase service-role/JWT secrets, API keys, and provider credentials must remain server-only. The repository contains only variable names and safe placeholders in `.env.example`.

## Supabase verification evidence

The live production REST endpoint was checked without printing credentials. All 11 expected tables responded to a service-role schema smoke query, while anonymous reads to protected tables returned empty RLS-filtered results. A full authenticated user-flow test remains required when the application authentication/session integration is enabled.
