---
id: EP1-ST031
title: Publish Reviewed Vocabulary Batch 1
status: review
type: content
priority: high
phase: phase-1-learning-core
risk: high
delivery_mode: full-review
depends_on:
  - EP1-ST029
  - EP1-ST030
allowed_paths:
  - apps/api/prisma/migrations/**
  - apps/api/src/modules/vocabulary/**
  - apps/api/test/**
  - docs/07_DATABASE_DESIGN.md
  - docs/08_API_CONTRACT.md
  - docs/10_TEST_STRATEGY.md
  - stories/ready/EP1-ST031-reviewed-vocabulary-batch-1.md
  - stories/in-progress/EP1-ST031-reviewed-vocabulary-batch-1.md
  - stories/review/EP1-ST031-reviewed-vocabulary-batch-1.md
  - stories/done/EP1-ST031-reviewed-vocabulary-batch-1.md
  - stories/blocked/EP1-ST031-reviewed-vocabulary-batch-1.md
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

# Story: Publish Reviewed Vocabulary Batch 1

## Goal

As a Vietnamese learner, I want a useful first vocabulary catalogue with real
examples and stable taxonomy links, so that mindmap navigation, item pagination,
and due-review SRS have enough governed content for a beta learning loop.

This story delivers the first reviewed batch of exactly 100 EnglishPath-authored,
CC0 vocabulary fixtures on top of the persisted vocabulary and CMS governance
foundations. It does not add a new taxonomy, alter learner progress, or resume any
historical blocked story.

## Acceptance Criteria

1. The migration adds exactly 100 new, stable vocabulary item IDs for batch 1;
   IDs and words are unique, deterministic, and the migration is additive and
   rerunnable only through the normal migration history.
2. Every item uses an existing approved vocabulary taxonomy node, has a bounded
   English word/phrase, accurate Vietnamese meaning, useful example sentence,
   pronunciation when available, and explicit `EnglishPath original` provenance
   with `CC0-1.0` license metadata. No external provider, copyrighted import, or
   unverified source is introduced.
3. All batch items are persisted as reviewed and published with a fixed review and
   publication timestamp suitable for deterministic tests. Learner responses
   expose only the public word, meaning, example, and pronunciation projection;
   source/license/review metadata remains server-side.
4. The existing public vocabulary API returns the batch through the existing
   backend-ordered taxonomy and pagination contract. Page size, total items,
   total pages, item order, and the no-skip due-review flow remain correct.
5. Tests prove the exact batch count, stable IDs, taxonomy coverage, published
   filtering, redaction of governance fields, deterministic ordering, and the
   existing SRS submission behavior. Existing vocabulary, learner, auth, and CMS
   tests remain green.
6. Database and test documentation records the batch provenance, deterministic
   fixture policy, and owner-approved rollback note. No destructive migration,
   schema rewrite, credential change, or frontend change is made.

## Implementation Boundaries

- Reuse `GovernedVocabularyItem`, `PrismaVocabularyItemRepository`, the current
  vocabulary fixture taxonomy, and `isPublicLearningContentVersion`; do not create
  a second content store or hard-code a parallel taxonomy.
- Keep controllers thin and preserve the existing public response envelope. Do not
  return `source`, `license`, review timestamps, or database fields to learners.
- Treat the migration as additive. Do not run `prisma migrate reset`, `db push`,
  destructive SQL, or a shared-database data rewrite.
- Content is original EnglishPath fixture data only. If a requested item needs a
  third-party source, a legal decision, or uncertain linguistic fact, omit it and
  record the issue rather than silently publishing it.

## Verification

- `node scripts/story-doctor.mjs stories/ready/EP1-ST031-reviewed-vocabulary-batch-1.md --ready-only`
- `pnpm story:verify stories/ready/EP1-ST031-reviewed-vocabulary-batch-1.md`
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

- Canonical vocabulary persistence and public projection were established by
  `EP1-ST050` and hardened by `EP1-ST040`; CMS governance was persisted by
  `EP1-ST029` and its authoring surface by `EP1-ST030`.
- The current taxonomy fixture is the source of truth for valid node IDs. Do not
  invent level/topic/track/skill/TOEIC values in the batch.
- The migration must carry a concise rollback comment stating that removal is
  owner-approved only and identifying the batch IDs; normal verification must not
  execute rollback SQL.

## Completion Evidence

- Story doctor and story verification passed on the in-progress lifecycle file.
- Targeted batch invariant and vocabulary service tests passed: 2 suites, 31 tests;
  after the final data correction the batch invariant passed with 100 unique IDs,
  100 unique headwords, four approved taxonomy nodes, CC0 provenance, and published
  markers.
- API E2E passed: 7 suites, 48 tests.
- `pnpm format:check` passed.
- `pnpm planning:traceability` passed.
- `pnpm tool:test` passed: 59/59.
- `pnpm prisma:validate` passed.
- `pnpm lint` passed.
- `pnpm typecheck` passed.
- `pnpm test` passed: 32 suites, 291 tests.
- `pnpm build` passed for API and web.
- `pnpm e2e` passed: 46/46 browser tests, including learner vocabulary,
  pagination, due-review ordering, admin, auth, and public-route regressions.
- `git diff --check` passed.
- Manual adversarial review verified additive-only migration scope, no duplicate
  headwords against the five existing fixtures, deterministic ordering inputs,
  published-state filtering, public projection redaction, and no changes to
  learner progress or authorization paths. No external provider or credential was
  used; rollback SQL was not executed.
