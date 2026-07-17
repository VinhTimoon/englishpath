# AI Request: Production Site Origin

## Context

EP1-ST002 implements the public blog index and three statically generated article
pages on commit `54fa149` of `story/ep1-st002`. Lint, typecheck, build, unit tests,
API e2e tests, and story checks pass.

The SEO review correctly requires absolute canonical URLs and an absolute Article
`mainEntityOfPage`. The repository does not currently define the production web origin,
and the product spec still lists domain selection as unfinished work.

## Decision Recorded

On 2026-07-17, the project owner confirmed that no Vercel deployment or production
domain exists yet and approved a temporary local origin:

```text
http://localhost:3000
```

The implementation will read `NEXT_PUBLIC_SITE_URL` when configured and otherwise
fall back to the local origin above. This keeps local canonical and JSON-LD URLs
absolute without hard-coding localhost as the future production domain.

## Deployment Follow-up

Before the first public deployment, set `NEXT_PUBLIC_SITE_URL` in the Vercel project
to the final HTTPS origin without a trailing slash, for example:

```text
https://englishpath.example
```

## Impact

The decision blocker is resolved and EP1-ST002 may resume. Local builds use
`http://localhost:3000`; production must not launch until the deployment variable is
set to the real public origin.
