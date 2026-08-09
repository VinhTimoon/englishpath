---
id: EP3-ST010
title: Roadmap, Vocabulary, Quiz, and Content Linking
status: ready
type: fullstack
priority: high
phase: phase-3-licensed-content-library-and-listening
depends_on:
  - EP3-ST007
  - EP3-ST008
allowed_paths:
  - apps/api/src/modules/library/**
  - apps/api/src/modules/roadmap/**
  - apps/api/src/modules/vocabulary/**
  - apps/api/src/modules/practice/**
  - apps/api/test/**
  - apps/web/src/app/library/**
  - apps/web/src/features/library/**
  - apps/web/src/widgets/library/**
  - apps/web/src/widgets/roadmap/**
  - apps/web/src/shared/**
  - tests/e2e/library-links.spec.ts
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
  - apps/api/src/modules/auth/**
  - apps/api/src/modules/toeic/**
  - apps/web/src/app/admin/**
  - package.json
  - pnpm-lock.yaml
  - .github/**
  - main
requires_human_approval: false
max_fix_rounds: 2
risk: medium
delivery_mode: full
---

# Story: Roadmap, Vocabulary, Quiz, and Content Linking

## Goal

Help a learner move from a governed library lesson to the next approved
roadmap, vocabulary, and quiz activity without losing context or bypassing
existing ownership and access rules.

## Scope

Add a server-owned, provider-neutral related-learning projection for an
eligible library content version. The projection may expose bounded links to
the learner's roadmap, vocabulary item/explorer, and quiz practice using
approved internal routes. The browser renders an explicit related-learning
panel and preserves the current library item context when the learner returns.
Use existing roadmap, vocabulary, practice, and library contracts; do not
invent taxonomy, expose private source IDs, or create a second progress system.
No AI, TOEIC changes, external providers, credentials, or Phase 4/5 features.

## Acceptance Criteria

- `GET /api/v1/library/items/:versionId/links` requires authentication,
  rechecks the existing library eligibility policy, and returns a bounded safe
  projection with link kind, learner-facing label, stable internal route, and
  optional completion state. It fails closed for unknown, withdrawn, expired,
  or ineligible content and never returns provider locators, source evidence,
  admin-only data, or arbitrary client URLs.
- Link selection is server-governed and deterministic. It uses existing
  roadmap/vocabulary/practice ownership and access checks; a client cannot
  change target IDs or use the endpoint to read another learner's roadmap or
  progress. Empty related content is represented explicitly rather than as a
  fabricated success state.
- The library item page renders loading, empty, unavailable, error/retry, and
  success states for related learning. Links are keyboard accessible, preserve
  the current content version in the return context, meet mobile 360px layout
  and visible-focus requirements, and do not regress player, drill, or
  shadowing states.
- A learner can follow a vocabulary link, quiz link, or roadmap link only to
  an approved internal route. The API response and browser network payloads
  contain no private source/provider fields or unrestricted href values.
- Add unit, API E2E, and browser coverage for authentication, eligibility and
  owner isolation, deterministic link ordering, empty/unavailable/error
  states, safe redaction, keyboard navigation, return-context preservation,
  mobile layout, and accessibility smoke checks.
- Update approved API/UI/security/test documentation. Do not add a database
  migration, credential, provider activation, or alternate progress store
  unless the approved architecture explicitly requires it.

## Verification

- `node scripts/story-doctor.mjs stories/ready/EP3-ST010-learning-content-linking.md`
- `pnpm story:verify stories/in-progress/EP3-ST010-learning-content-linking.md`
- `pnpm --filter api exec node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand src/modules/library/**/*.spec.ts src/modules/roadmap/**/*.spec.ts src/modules/vocabulary/**/*.spec.ts src/modules/practice/**/*.spec.ts`
- `pnpm --filter api test:e2e -- library-links.e2e-spec.ts`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm exec playwright test tests/e2e/library-links.spec.ts`
- `git diff --check`

## Implementation Guardrails

- Keep controllers thin and use the library service/repository or a dedicated
  link port; do not reach into Prisma or another module's repository from the
  frontend or controller.
- Reuse `LibraryCatalogueService` eligibility and safe projection, existing
  roadmap current/today semantics, vocabulary route/query conventions, and
  quiz session entry contract. Do not duplicate business rules.
- Construct route targets from a server allow-list of route kinds and bounded
  query parameters. Never accept or echo a client-provided URL.
- Preserve existing library-player, listening-drill, shadowing, bookmark,
  note, vocabulary, roadmap, and quiz browser mocks and journeys.
- If a real cross-domain/provider link or product decision is required, stop
  and create the governed AI request instead of inventing an integration.

## Definition of Done

The learner can discover and follow safe related learning from an eligible
library item, return without losing context, and see honest empty/unavailable
states. Ownership, redaction, route allow-listing, and existing progress
behavior remain enforced, all quality gates pass, and no known P0/P1 issue
remains.
