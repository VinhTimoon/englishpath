---
id: EP1-ST035
title: Publish Reviewed Vocabulary Batch 5
status: done
type: content
priority: high
phase: phase-1-learning-core
risk: high
delivery_mode: full-review
depends_on:
  - EP1-ST034
allowed_paths:
  - apps/api/prisma/migrations/**
  - apps/api/src/modules/vocabulary/**
  - apps/api/test/**
  - docs/07_DATABASE_DESIGN.md
  - docs/10_TEST_STRATEGY.md
  - stories/ready/EP1-ST035-reviewed-vocabulary-batch-5.md
  - stories/in-progress/EP1-ST035-reviewed-vocabulary-batch-5.md
  - stories/review/EP1-ST035-reviewed-vocabulary-batch-5.md
  - stories/done/EP1-ST035-reviewed-vocabulary-batch-5.md
  - stories/blocked/EP1-ST035-reviewed-vocabulary-batch-5.md
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

# Story: Publish Reviewed Vocabulary Batch 5

## Goal

As a Vietnamese learner, I want the fifth governed vocabulary batch, so that the
Phase 1 vocabulary baseline is broad enough for a useful beta catalogue.

## Acceptance Criteria

1. Add exactly 100 new stable `vocab-b5-*` IDs through additive SQL with no
   headword overlap against the foundation or batches 1–4.
2. Every row uses an existing taxonomy node, accurate Vietnamese meaning, useful
   example, and EnglishPath-original `CC0-1.0` provenance.
3. Rows are deterministically reviewed/published; public projections stay redacted
   and existing pagination, ownership, and SRS contracts stay unchanged.
4. Tests prove exact count, IDs, cross-batch uniqueness, taxonomy, provenance,
   publication, API E2E, and learner regressions.
5. Documentation records provenance and owner-approved rollback; no schema rewrite,
   frontend/provider/credential change, or destructive SQL is introduced.

## Implementation Boundaries

- Reuse the governed vocabulary model, repository, and fixture taxonomy.
- Use original EnglishPath fixture data only; tests never execute rollback SQL.

## Verification

- `node scripts/story-doctor.mjs stories/ready/EP1-ST035-reviewed-vocabulary-batch-5.md --ready-only`
- `pnpm story:verify stories/ready/EP1-ST035-reviewed-vocabulary-batch-5.md`
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

## Completion Evidence

- Story doctor and story verification passed for the lifecycle artifact.
- The batch invariant test passed: exactly 100 stable IDs, unique headwords with no overlap against the foundation and batches 1-4, existing taxonomy nodes, governed provenance, and `REVIEWED`/`PUBLISHED` state.
- API E2E passed: 7 suites, 48 tests.
- Full gates passed: formatting, planning traceability, tool tests (59/59), Prisma validation, lint, typecheck, unit tests (36 suites/295 tests), API and web builds, browser E2E (46/46), and diff check.
- Manual review confirmed additive SQL only; no schema, credentials, provider configuration, public projection, ownership, pagination, or SRS contract changes.

## Dev Notes

- Follow the cross-migration invariants established by `EP1-ST031`–`EP1-ST034`.
- Rollback is owner-approved only and must target `vocab-b5-*` rows.
