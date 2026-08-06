---
id: EP1-ST033
title: Publish Reviewed Vocabulary Batch 3
status: done
type: content
priority: high
phase: phase-1-learning-core
risk: high
delivery_mode: full-review
depends_on:
  - EP1-ST032
allowed_paths:
  - apps/api/prisma/migrations/**
  - apps/api/src/modules/vocabulary/**
  - apps/api/test/**
  - docs/07_DATABASE_DESIGN.md
  - docs/10_TEST_STRATEGY.md
  - stories/ready/EP1-ST033-reviewed-vocabulary-batch-3.md
  - stories/in-progress/EP1-ST033-reviewed-vocabulary-batch-3.md
  - stories/review/EP1-ST033-reviewed-vocabulary-batch-3.md
  - stories/done/EP1-ST033-reviewed-vocabulary-batch-3.md
  - stories/blocked/EP1-ST033-reviewed-vocabulary-batch-3.md
  - _bmad-output/planning-artifacts/story-map.md
  - _bmad-output/implementation-artifacts/sprint-status.yaml
forbidden_paths:
  - apps/api/prisma/schema.prisma
  - apps/api/.env
  - apps/web/**
  - "**/package.json"
  - "**/pnpm-lock.yaml"
  - packages/**
  - production credentials
  - provider configuration
  - destructive migrations
  - main
  - client-authored review or publication state
max_fix_rounds: 2
requires_human_approval: false
---

# Story: Publish Reviewed Vocabulary Batch 3

## Goal

As a Vietnamese learner, I want a third governed vocabulary batch, so that the
learning catalogue keeps growing while every item remains traceable, public-safe,
and compatible with deterministic pagination and SRS.

## Acceptance Criteria

1. Add exactly 100 new stable `vocab-b3-*` IDs through one additive migration;
   no headword may overlap the foundation fixtures, batch 1, or batch 2.
2. Every row uses an existing approved taxonomy node, includes accurate Vietnamese
   meaning, useful example, and EnglishPath-original `CC0-1.0` provenance.
3. Rows are deterministically `REVIEWED` and `PUBLISHED`; public projections keep
   governance/source fields private and existing learner contracts unchanged.
4. Tests assert exact count, stable IDs, unique/non-overlapping headwords, taxonomy
   coverage, publication markers, redaction, pagination, and SRS regressions.
5. Documentation records provenance and owner-approved rollback; no schema rewrite,
   frontend/provider/credential change, or destructive SQL is introduced.

## Implementation Boundaries

- Reuse `GovernedVocabularyItem`, the existing Prisma repository, and the existing
  fixture taxonomy. Do not create a parallel catalogue or taxonomy.
- Use only original EnglishPath fixture data and never execute rollback SQL in tests.

## Verification

- `node scripts/story-doctor.mjs stories/ready/EP1-ST033-reviewed-vocabulary-batch-3.md --ready-only`
- `pnpm story:verify stories/ready/EP1-ST033-reviewed-vocabulary-batch-3.md`
- `pnpm format:check`
- `pnpm planning:traceability`
- `pnpm tool:test`
- `pnpm prisma:validate`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm --filter api test:e2e -- --runInBand`
- `pnpm build`
- `pnpm e2e -- tests/e2e/vocabulary-explorer.spec.ts tests/e2e/vocabulary-learner.spec.ts`
- `git diff --check`

## Dev Notes

- Follow the batch-2 `VALUES → SELECT` migration pattern and compare headwords
  against both prior migration files plus the five foundation terms.
- Rollback is owner-approved only and must target `vocab-b3-*` rows.

## Completion Evidence

- Story doctor and story verification passed.
- Batch invariants passed for all three vocabulary migrations: exact 100-row
  contracts, stable IDs, unique headwords, approved taxonomy coverage, original
  provenance, and no cross-batch overlap.
- API E2E passed: 7 suites, 48 tests.
- `pnpm format:check`, `pnpm planning:traceability`, and `pnpm tool:test` passed
  with 59/59 tool tests.
- Prisma validation, lint, and typecheck passed.
- `pnpm test` passed: 34 suites, 293 tests.
- `pnpm build` passed for API and web.
- `pnpm e2e` passed: 46/46 browser tests, including vocabulary learner,
  pagination, due review, auth, admin, and public regressions.
- `git diff --check` passed.
- Manual review verified additive SQL, no duplicate headwords across prior batches,
  fixed publication metadata, public redaction, and unchanged learner ownership/SRS
  behavior. No shared database reset, rollback, credential, or provider action ran.
