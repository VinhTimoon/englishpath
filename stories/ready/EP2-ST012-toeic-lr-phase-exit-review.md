---
id: EP2-ST012
title: TOEIC L&R security, browser, accessibility, and content-license exit review
status: ready
type: exit-review
priority: critical
phase: phase-2-toeic-listening-reading
depends_on:
  - EP2-ST003
  - EP2-ST004
  - EP2-ST005
  - EP2-ST006
  - EP2-ST007
  - EP2-ST008
  - EP2-ST009
  - EP2-ST010
  - EP2-ST011
allowed_paths:
  - apps/api/src/modules/access/**
  - apps/api/src/modules/admin/**
  - apps/api/src/modules/practice/**
  - apps/api/src/modules/toeic/**
  - apps/api/src/modules/vocabulary/**
  - apps/api/test/**
  - apps/web/src/entities/toeic-timed-test/**
  - apps/web/src/widgets/toeic-practice/**
  - apps/web/src/widgets/toeic-timed-test/**
  - apps/web/src/shared/api/**
  - tests/e2e/**
  - tests/unit/**
  - docs/01_PRODUCT_SCOPE.md
  - docs/02_PRD.md
  - docs/03_USER_FLOWS.md
  - docs/04_SYSTEM_ARCHITECTURE.md
  - docs/05_FRONTEND_ARCHITECTURE.md
  - docs/06_BACKEND_ARCHITECTURE.md
  - docs/08_API_CONTRACT.md
  - docs/09_UI_DESIGN_SYSTEM.md
  - docs/10_TEST_STRATEGY.md
  - docs/11_SECURITY_PLAN.md
  - docs/12_DEPLOYMENT_PLAN.md
  - docs/13_DECISION_LOG.md
  - _bmad-output/planning-artifacts/epic-map.md
  - _bmad-output/planning-artifacts/story-map.md
  - _bmad-output/implementation-artifacts/sprint-status.yaml
  - stories/**
forbidden_paths:
  - apps/api/.env
  - apps/web/.env
  - apps/api/prisma/schema.prisma
  - apps/api/prisma/migrations/**
  - apps/api/src/generated/**
  - packages/**
  - package.json
  - pnpm-lock.yaml
  - .github/workflows/**
  - main
requires_human_approval: false
max_fix_rounds: 2
risk: high
delivery_mode: full
---

# Story: TOEIC L&R security, browser, accessibility, and content-license exit review

## Goal

Close the Phase 2 TOEIC Listening & Reading exit gate after the governed Parts
1-7 practice APIs/UI, timed MINI/HALF tests, scoring, Error Notebook capture,
and remediation packs are merged. The story is an evidence-driven security,
quality, and content-governance review. It may make narrowly scoped fixes for
real findings, but it must not introduce Phase 3 features, a new provider, a
schema/migration change, production credentials, or a production deployment.

## Product and exit contract

The exit review must prove that the E02 promise is true: governed TOEIC L&R
content can be practiced and finalized safely, official timing and score
analysis remain server-authoritative, and finalized weaknesses route to safe
remediation without exposing answers or private governance data.

The review covers the approved Phase 2 requirements and flows represented by
`FR-012` to `FR-015`, `UF-006` to `UF-008`, and the Phase 2 quality/security
requirements in the epic map. It must preserve the owner-approved EP2-ST010
Option 1 Error Notebook schema/ownership decision and the EP2-ST011 pack
contract. External PostHog/Sentry activation remains deferred under the
approved local/no-op observability decision; this story records that boundary
and does not activate providers.

## Acceptance Criteria

1. Produce a traceability and exit checklist covering EP2-ST001 through
   EP2-ST011, their acceptance criteria, the E02 epic outcome, and the mapped
   FR/UF/NFR requirements. Every item is `verified`, `owner-deferred` with an
   existing approved request, or `not met` with an actionable blocker; no item
   is silently omitted.

2. Verify authentication, authorization, and ownership boundaries for the
   learner practice, timed-test, analysis, Error Notebook, vocabulary, and
   admin governance surfaces. Confirm guards are present, repository lookups
   bind the authenticated application user, admin actions require the admin
   role, cross-owner IDs fail closed, and sanitized errors do not reveal
   identity, provider, database, or governance details.

3. Verify answer and content protection end to end. Active responses never
   expose `correctAnswer`, `isCorrect`, raw answer rows, scoring internals,
   source/license evidence, reviewer data, user IDs, provider fields, or
   client-controlled timing. Finalized analysis and remediation remain
   deterministic, owner-scoped, replay-safe, and safe when content lookups or
   Error Notebook capture are unavailable.

4. Verify content and license eligibility against the approved server-owned
   governance predicate: only reviewed/published/current content from the
   approved beta source allowlist reaches learner practice or remediation;
   unreviewed, expired, disallowed-scope, or missing-content cases fail closed
   or return an explicit safe empty state. Record that no licensed-library
   runtime behavior from Phase 3 is added here.

5. Run and pass the full local-equivalent learner/browser gate on API port
   `3005` and web port `4173`, without credentials, network dependencies, or a
   shared database. Evidence must include TOEIC listening/reading practice,
   MINI/HALF timed tests, Error Notebook, remediation links, loading/empty/
   error/success/retry states, keyboard navigation, visible focus, reduced
   motion, 360px layout, and axe checks. Any external process or staging
   limitation is recorded honestly and is not called a pass.

6. Verify production-readiness boundaries without promoting to `main` or
   changing credentials: build, lint, type safety, Prisma validation, API/E2E
   isolation, deployment configuration consistency, health/readiness behavior,
   correlation/error envelopes, and local/no-op observability evidence pass.
   Real staging/production credentials, domains, provider activation, or
   deployment promotion are explicitly outside this story unless an existing
   approved owner decision grants them.

7. Fix any in-scope P0/P1 defect found by the review, add a regression test,
   rerun all affected gates, and obtain a read-only review result of `pass`.
   If an owner decision or external authority is required, create the dated
   AI request, mark only the dependent exit item owner-deferred, and do not
   claim Phase 2 completion without that decision.

8. Update the relevant security, API, test-strategy, deployment, decision-log,
   epic-map, story-map, and sprint-status evidence. When all criteria pass,
   mark EP2-ST012 `done`, mark Epic 2/E02 `Completed`, and leave all Phase 3
   stories in `backlog`; do not modify `main`.

## Technical guardrails

- Treat the NestJS backend as the authority for identity, role, ownership,
  content eligibility, timing, answers, scoring, and remediation selection.
- Reuse existing guards, principals, repositories, safe projections, contract
  parsers, catalogue services, and test fixtures. Do not create a parallel
  authorization or content-governance path.
- Do not change Prisma schema, migrations, generated output, credentials,
  package dependencies, CI/CD, firewall, domains, or external providers.
- Keep Next.js routes thin and preserve loading, empty, error, success, retry,
  keyboard, responsive, focus, and reduced-motion behavior.
- Preserve historical blocked/superseded story evidence. Do not resume old WIP
  commits or create a recovery story for this exit review.

## Verification commands

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm format:check`
- `pnpm planning:traceability`
- `pnpm --filter api exec prisma validate --schema prisma/schema.prisma`
- `pnpm --filter api exec jest --runInBand src/modules/access src/modules/admin src/modules/practice src/modules/toeic src/modules/vocabulary`
- `pnpm --filter api test:e2e -- --runInBand --testPathPatterns="(practice|toeic|error-notebook|admin)"
- `node tests/unit/toeic-timed-test.unit.mjs`
- `pnpm e2e`
- `node scripts/story-doctor.mjs stories/ready/EP2-ST012-toeic-lr-phase-exit-review.md`
- `pnpm story:verify stories/ready/EP2-ST012-toeic-lr-phase-exit-review.md`
- `git diff --check`
- `git status --short --branch`

## Risk and review

Risk is high because this is the final security, ownership, content-license,
and learner-journey gate for Phase 2. Full planning, targeted backend/API
tests, full browser coverage, documentation traceability, and independent
read-only review are mandatory. Do not use the fast path.

## Completion evidence requirements

Record the exact story-to-criterion traceability, command outputs/counts,
browser/accessibility evidence, content/license eligibility evidence, owner
decisions or AI requests, known risks, and the final commits merged to `dev`.
The final repository must be clean on `dev`, synchronized with `origin/dev`,
and must not contain any automatic change to `main`.
