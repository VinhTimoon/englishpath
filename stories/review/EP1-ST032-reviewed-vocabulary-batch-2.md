---
id: EP1-ST032
title: Publish Reviewed Vocabulary Batch 2
status: in-progress
type: content
priority: high
phase: phase-1-learning-core
risk: high
delivery_mode: full-review
depends_on:
  - EP1-ST031
allowed_paths:
  - apps/api/prisma/migrations/**
  - apps/api/src/modules/vocabulary/**
  - apps/api/test/**
  - docs/07_DATABASE_DESIGN.md
  - docs/08_API_CONTRACT.md
  - docs/10_TEST_STRATEGY.md
  - stories/ready/EP1-ST032-reviewed-vocabulary-batch-2.md
  - stories/in-progress/EP1-ST032-reviewed-vocabulary-batch-2.md
  - stories/review/EP1-ST032-reviewed-vocabulary-batch-2.md
  - stories/done/EP1-ST032-reviewed-vocabulary-batch-2.md
  - stories/blocked/EP1-ST032-reviewed-vocabulary-batch-2.md
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

# Story: Publish Reviewed Vocabulary Batch 2

## Goal

As a Vietnamese learner, I want a second governed vocabulary batch with useful
daily communication and technology terms, so that the learner catalogue grows
without weakening taxonomy, publication, or SRS invariants.

This story adds exactly 100 new EnglishPath-authored CC0 fixtures after
`EP1-ST031`. It does not add taxonomy, change learner progress, or resume any
historical blocked story.

## Acceptance Criteria

1. An additive migration adds exactly 100 stable batch-2 IDs and no word already
   present in the existing five foundation fixtures or batch 1. IDs are deterministic
   and the migration does not execute destructive SQL.
2. Each item uses an existing approved vocabulary taxonomy node, has a bounded word
   or phrase, accurate Vietnamese meaning, useful example, pronunciation when
   available, and explicit EnglishPath-original `CC0-1.0` provenance.
3. Every row is fixed as `REVIEWED` and `PUBLISHED` with deterministic timestamps;
   learner projections expose only permitted public fields and never governance
   metadata.
4. Existing public vocabulary pagination, deterministic ordering, mindmap selection,
   due-review ordering, ownership, and response envelopes remain unchanged.
5. Tests assert exact count, stable IDs, unique headwords against all prior batches,
   valid taxonomy coverage, provenance/publication markers, redaction, and existing
   SRS behavior.
6. Database and test documentation record provenance and owner-approved rollback;
   no schema rewrite, frontend change, credential, provider, or shared-data reset is
   introduced.

## Implementation Boundaries

- Reuse `GovernedVocabularyItem`, the existing Prisma repository, and the current
  vocabulary fixture taxonomy. Do not create a parallel catalogue or taxonomy.
- Keep public response contracts and private governance redaction unchanged.
- Use only original EnglishPath fixture data. Do not silently use third-party source
  text or claim a review that cannot be represented in the migration evidence.

## Verification

- `node scripts/story-doctor.mjs stories/ready/EP1-ST032-reviewed-vocabulary-batch-2.md --ready-only`
- `pnpm story:verify stories/ready/EP1-ST032-reviewed-vocabulary-batch-2.md`
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

- `EP1-ST050`, `EP1-ST040`, `EP1-ST029`, `EP1-ST030`, and `EP1-ST031` establish
  the persistence, projection, governance, authoring, and first-batch patterns.
- The test must compare batch-2 headwords against the five foundation terms and
  batch-1 migration rather than only checking uniqueness inside batch 2.
- Rollback is owner-approved only and must target batch-2 IDs; verification must
  never execute rollback SQL.

## Completion Evidence

- Story doctor and story verification passed on the in-progress lifecycle file.
- Targeted batch invariant tests passed: batch 1 and batch 2 fixtures each satisfy
  their exact 100-row contracts; batch 2 has unique IDs/headwords and no headword
  overlap with the foundation or batch 1.
- API E2E passed: 7 suites, 48 tests.
- `pnpm format:check` passed.
- `pnpm planning:traceability` passed.
- `pnpm tool:test` passed: 59/59.
- `pnpm prisma:validate` passed.
- `pnpm lint` passed.
- `pnpm typecheck` passed.
- `pnpm test` passed: 33 suites, 292 tests.
- `pnpm build` passed for API and web.
- `pnpm e2e` passed: 46/46 browser tests, including vocabulary exploration,
  learner pagination/due review, auth, admin, and public-route regressions.
- `git diff --check` passed.
- Manual adversarial review verified additive-only SQL, deterministic metadata
  projection, taxonomy coverage, duplicate-headword protection across migrations,
  public governance redaction, and no learner-progress or authorization changes.
