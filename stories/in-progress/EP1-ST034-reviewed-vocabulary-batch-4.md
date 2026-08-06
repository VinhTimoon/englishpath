---
id: EP1-ST034
title: Publish Reviewed Vocabulary Batch 4
status: in-progress
type: content
priority: high
phase: phase-1-learning-core
risk: high
delivery_mode: full-review
depends_on:
  - EP1-ST033
allowed_paths:
  - apps/api/prisma/migrations/**
  - apps/api/src/modules/vocabulary/**
  - apps/api/test/**
  - docs/07_DATABASE_DESIGN.md
  - docs/10_TEST_STRATEGY.md
  - stories/ready/EP1-ST034-reviewed-vocabulary-batch-4.md
  - stories/in-progress/EP1-ST034-reviewed-vocabulary-batch-4.md
  - stories/review/EP1-ST034-reviewed-vocabulary-batch-4.md
  - stories/done/EP1-ST034-reviewed-vocabulary-batch-4.md
  - stories/blocked/EP1-ST034-reviewed-vocabulary-batch-4.md
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

# Story: Publish Reviewed Vocabulary Batch 4

## Goal

As a Vietnamese learner, I want a fourth governed vocabulary batch, so that the
beta catalogue supports broader everyday, workplace, and technology practice.

## Acceptance Criteria

1. Add exactly 100 new stable `vocab-b4-*` IDs through an additive migration with
   no headword overlap against the foundation or batches 1–3.
2. Every row uses an existing taxonomy node, has accurate Vietnamese meaning and a
   useful example, and carries EnglishPath-original `CC0-1.0` provenance.
3. Rows are deterministically reviewed and published; public projections remain
   redacted and existing pagination/SRS contracts remain unchanged.
4. Tests prove exact count, IDs, non-overlap, taxonomy, provenance, publication,
   redaction, API E2E, and learner regressions.
5. Documentation records provenance and owner-approved rollback; no schema rewrite,
   frontend/provider/credential change, or destructive SQL is introduced.

## Implementation Boundaries

- Reuse the existing governed vocabulary model, repository, and fixture taxonomy.
- Use original EnglishPath fixture data only; rollback SQL is never executed by tests.

## Verification

- `node scripts/story-doctor.mjs stories/ready/EP1-ST034-reviewed-vocabulary-batch-4.md --ready-only`
- `pnpm story:verify stories/ready/EP1-ST034-reviewed-vocabulary-batch-4.md`
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

- Follow the deterministic batch migration and cross-batch invariant patterns from
  `EP1-ST031` through `EP1-ST033`.
- Rollback is owner-approved only and must target `vocab-b4-*` rows.
