---
id: EP5-ST013
title: Exam, AI, community security, evaluation, load, browser, and phase exit review
status: done
type: quality
priority: critical
phase: phase-5-full-test-adaptive-ai-and-community
risk: high
delivery_mode: full-review
depends_on:
  - EP5-ST003
  - EP5-ST004
  - EP5-ST005
  - EP5-ST006
  - EP5-ST007
  - EP5-ST008
  - EP5-ST009
  - EP5-ST010
  - EP5-ST011
  - EP5-ST012
allowed_paths:
  - apps/api/**
  - apps/web/**
  - tests/e2e/**
  - docs/**
  - stories/**
  - _bmad-output/implementation-artifacts/sprint-status.yaml
  - _bmad-output/planning-artifacts/story-map.md
forbidden_paths:
  - apps/web/.env*
  - apps/api/.env*
  - package.json
  - pnpm-lock.yaml
  - .github/**
  - production credentials or provider configuration
  - paid provider activation or external billing
  - destructive migrations
  - shared Supabase changes
  - main
  - Phase 6
requires_human_approval: false
max_fix_rounds: 2
---

# Story: Phase 5 security, evaluation, browser, and exit review

## Goal

Prove that the completed Phase 5 full-test, adaptive-roadmap, AI, and community
surfaces are secure, server-owned, redacted, browser-covered, and ready for the
approved local/beta release boundary without activating paid providers or Phase 6.

## Acceptance Criteria

- EP5-ST001 through EP5-ST012 are done or have explicit owner-deferred evidence;
  no Phase 5 story remains ready, in-progress, review, or blocked without a
  successor or owner decision.
- Full TOEIC session/timer/finalization/scoring boundaries preserve answer-key
  secrecy, owner scoping, server time, integrity evidence, and safe analysis.
- Error Notebook, adaptive roadmap, AI explanation/speaking/writing, community
  moderation, and AI operations remain server-owned, redacted, and advisory-only.
- Auth, authorization, data ownership, quota, idempotency, replay/conflict,
  abuse/unavailable semantics, and no-migration/provider boundaries have no known
  P0/P1 defects.
- Unit, API E2E, browser, accessibility/mobile, format, typecheck, Prisma,
  traceability, build, and story checks pass with recorded counts.
- No paid provider, production credential, external billing, destructive
  migration, shared-data change, or Phase 6 feature is introduced.

## Verification commands

- `pnpm prisma:validate`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm --filter api test:e2e`
- `pnpm e2e`
- `pnpm build`
- `pnpm format:check`
- `pnpm planning:traceability`
- `pnpm story:checks`
- `git diff --check`

## Exit evidence

The review must record the actual command results, changed paths, lifecycle
state, known risks, and any owner-deferred production/provider decision. This
story closes Phase 5 only for the approved local/beta boundary; it must not
claim production promotion or paid provider activation.

## Dependency and review evidence

EP5-ST001 through EP5-ST011 were already done on `dev`. EP5-ST012 was reviewed
as a high-risk story after the owner approved Option 1: `DENIED` is quota
denial, while `REPLAYED` and abuse metrics are unavailable. Its implementation
uses no migration and does not infer from idempotency keys, fingerprints, audit
rows, or learner data. The independent review found no remaining P1 after the
fix round; its final commit is `32baad6`.

## Exit Review Evidence

- Prisma validation passed.
- API and web lint and typecheck passed.
- Formatting and planning traceability passed.
- API unit suite passed: 78 suites / 555 tests.
- API E2E suite passed: 26 suites / 149 tests.
- Targeted ST012 Playwright passed: 4 / 4 tests at clean port 4177.
- Full Playwright suite passed: 129 / 129 tests at clean port 4177, including
  learner, TOEIC, community, admin, accessibility, and vocabulary journeys.
- Production build passed for API and web.
- `pnpm story:checks`, ST013 story verification, and `git diff --check` passed.
- No Prisma schema/migration, package, lockfile, environment, credential, CI,
  provider, shared Supabase, or `main` change was made.

## Phase 5 Decision

Phase 5 is complete for the approved local/beta boundary. The repository does
not claim production deployment, paid AI/provider activation, production
observability activation, external billing/quota, or promotion to `main`.
Those actions remain owner-controlled and Phase 6 stays suspended/backlog until
the product has many production users. No unresolved Phase 5 P0/P1 remains.

## Final lifecycle review

The final exit diff is governance/documentation-only and stays inside the
story's allowed paths. The existing Phase 5 application and test code was not
changed by ST013. Review found no P0/P1 issue and no owner action blocking the
approved local/beta exit.
