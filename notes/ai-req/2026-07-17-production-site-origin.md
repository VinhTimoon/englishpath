# AI Request: Production Site Origin

## Context

EP1-ST002 implements the public blog index and three statically generated article
pages on commit `54fa149` of `story/ep1-st002`. Lint, typecheck, build, unit tests,
API e2e tests, and story checks pass.

The SEO review correctly requires absolute canonical URLs and an absolute Article
`mainEntityOfPage`. The repository does not currently define the production web origin,
and the product spec still lists domain selection as unfinished work.

## Decision Needed

Please provide the canonical production origin, including scheme and without a trailing
slash, for example:

```text
https://example.com
```

Also confirm one configuration approach:

1. Add `NEXT_PUBLIC_SITE_URL` to `.env.example` and deployment environments (recommended).
2. Approve a fixed production origin in web source/config.

## Impact

Until this is decided, EP1-ST002 remains blocked and its source will not be merged into
`dev`. No placeholder or guessed domain has been published.
