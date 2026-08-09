---
id: EP3-ST005
title: Learner Catalog, Search, Filters, and Access Policy
status: review
type: fullstack
priority: high
phase: phase-3-licensed-content-library-and-listening
depends_on:
  - EP3-ST003
allowed_paths:
  - apps/api/src/modules/library/**
  - apps/api/src/modules/access/**
  - apps/api/src/app.module.ts
  - apps/api/test/**
  - apps/web/src/app/library/**
  - apps/web/src/features/library/**
  - apps/web/src/shared/**
  - apps/web/src/widgets/library/**
  - tests/e2e/library-catalog.spec.ts
  - docs/04_SYSTEM_ARCHITECTURE.md
  - docs/06_BACKEND_ARCHITECTURE.md
  - docs/08_API_CONTRACT.md
  - docs/09_UI_DESIGN_SYSTEM.md
  - docs/10_TEST_STRATEGY.md
  - docs/11_SECURITY_PLAN.md
  - stories/**
  - _bmad-output/implementation-artifacts/sprint-status.yaml
  - _bmad-output/planning-artifacts/story-map.md
forbidden_paths:
  - apps/api/.env
  - apps/api/prisma/**
  - apps/api/src/generated/**
  - apps/api/src/modules/toeic/**
  - apps/api/src/modules/auth/**
  - apps/web/src/app/admin/**
  - package.json
  - pnpm-lock.yaml
  - .github/**
  - main
requires_human_approval: false
max_fix_rounds: 2
risk: high
delivery_mode: full
---

# Story: Learner Catalog, Search, Filters, and Access Policy

## Goal

Give an authenticated learner a useful, server-owned catalog of approved
licensed library items that can be searched and filtered without exposing
private source data or bypassing rights and access policy.

## Scope

Add the provider-neutral learner catalog query boundary over the existing
governed content model. The API must use an injectable local catalog port or
fixture-backed adapter until approved persistence/import wiring exists; it must
not invent taxonomy, call Drive/Supabase, or add a schema/migration. Add the
responsive learner catalog route with explicit loading, empty, error, and
success states. Controlled media delivery remains EP3-ST006.

## Acceptance Criteria

- `GET /api/v1/library/catalogue` requires the existing authenticated learner
  guard and returns only versions that are reviewed, published, license
  approved, unexpired, `library` usage, and an allowed `authenticated` access
  tier; draft, rejected, expired, private, or unsupported records fail closed.
- The query supports bounded `page`/`size` pagination and server-owned search
  and taxonomy filters. Unknown fields, invalid pagination, and unsupported
  filter values are rejected; ordering and pagination are deterministic.
- Filter options/facets are derived from the eligible catalog projection rather
  than hard-coded in the web client. Empty results are distinct from an empty
  catalog and from an unavailable catalog adapter.
- Learner responses contain only safe catalog fields such as stable item/version
  identity, title/summary, taxonomy, content type, duration/level, and safe
  availability state. They never include Drive URLs, object keys, checksums,
  rights evidence, reviewer/actor IDs, raw manifests, credentials, or provider
  internals.
- The web catalog is reachable only after authentication, preserves query state
  in the URL, supports keyboard navigation, visible focus, 44px controls, and
  360px layouts without horizontal overflow. Status is not conveyed by color
  alone and reduced-motion users receive the same usable states.
- Browser/API coverage proves authenticated denial, eligible filtering,
  deterministic pagination, search/filter propagation, safe-field redaction,
  catalog/filtered empty states, adapter error/retry, responsive layout, and an
  accessibility smoke check.
- Documentation records the learner access predicate, response redaction,
  provider-neutral adapter boundary, and the fact that catalog visibility does
  not grant media delivery authority.

## Verification

- `pnpm --filter api exec node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand src/modules/library/**/*.spec.ts src/modules/access/**/*.spec.ts`
- `pnpm --filter api test:e2e -- library-catalog.e2e-spec.ts`
- `pnpm --filter web typecheck`
- `pnpm --filter web lint`
- `pnpm --filter web exec next build`
- `pnpm e2e -- tests/e2e/library-catalog.spec.ts`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `git diff --check`
- `node scripts/story-doctor.mjs stories/in-progress/EP3-ST005-learner-catalog-search-filters-and-access.md`
- `pnpm story:verify stories/in-progress/EP3-ST005-learner-catalog-search-filters-and-access.md`

## Risk and Review

High risk because the catalog is a learner-facing authorization and disclosure
boundary. Full review and full quality gates are mandatory. Review must check
owner authentication, eligibility predicates, pagination/filter correctness,
safe response projection, and the separation between catalog visibility and
controlled media delivery.

## Definition of Done

An authenticated learner can discover eligible licensed library content through
the local approved harness with correct access filtering, safe projections,
responsive states, and evidence that no provider secret or private source
reference crosses the API or browser boundary. No real provider activation or
production deployment is claimed.



## Blocked Report

- Failed step: "node" "scripts/codex-runner.mjs" "build" ".codex-build-task.md"
- Exit code: 42
- Attempts: 1
- Summary: The automated loop produced a valid blocked outcome and stopped without further retries.

### Evidence

```text
Child process returned blocked exit code 42.
Command failed with exit code 42: "node" "scripts/codex-runner.mjs" "build" ".codex-build-task.md"
```

## Recovery Record

The initial build result at commit `e87e43e` is historical evidence only. The
same story is being recovered in place; no competing recovery story is created
and the blocked build is not blindly retried.

The initial implementation established the route and policy skeleton but left
the fixture-backed eligible/error scenarios, API/browser evidence, and required
boundary documentation incomplete. Recovery will complete those acceptance
criteria within the existing allowed paths before review.

## Recovery Verification and Manual Review

Recovery completed the provider-neutral catalogue port, strict query
validation, server-owned eligibility/facet ordering, explicit safe projection,
authenticated API envelope/error handling, learner URL-state UI, and fixture
coverage. No Prisma/schema, credential, Drive, Supabase, media-delivery, or
production configuration was changed.

The automated review invocation was not usable for this story: the existing
`.codex-review-task.md` remained a stale EP3-ST004 prompt, and its Codex read
attempts ended with the Windows sandbox error `CreateProcessWithLogonW failed:
2`. It is not treated as an EP3-ST005 review result. Manual high-risk review
therefore checked the actual EP3-ST005 diff for authentication, fail-closed
eligibility before facets/search, strict pagination/filter validation, safe
response allowlisting, provider/media boundary separation, scope compliance,
and browser state/accessibility evidence.

Targeted evidence:

- API policy/catalogue unit tests — 11 passed
- API catalogue E2E — 2 passed
- web typecheck, lint, and Next build — passed
- learner catalogue browser suite — 4 passed, including 360px and axe checks
- full `pnpm story:checks` — passed: formatting, planning/tooling, Prisma
  validation, 60 API unit suites / 436 tests, 13 API E2E suites / 92 tests,
  build, and 79 browser tests
