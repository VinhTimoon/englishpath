---
id: EP1-ST018
title: Vocabulary SRS And Mastery API
status: ready
type: backend
priority: high
phase: phase-1-learning-core
allowed_paths:
  - apps/api/prisma/schema.prisma
  - apps/api/prisma/migrations/**
  - apps/api/src/generated/**
  - apps/api/src/modules/vocabulary/**
  - apps/api/src/app.module.ts
  - apps/api/test/**
  - docs/07_DATABASE_DESIGN.md
  - docs/08_API_CONTRACT.md
  - docs/10_TEST_STRATEGY.md
  - stories/ready/EP1-ST018-vocabulary-srs-and-mastery-api.md
  - stories/in-progress/EP1-ST018-vocabulary-srs-and-mastery-api.md
  - stories/review/EP1-ST018-vocabulary-srs-and-mastery-api.md
  - stories/done/EP1-ST018-vocabulary-srs-and-mastery-api.md
  - stories/blocked/EP1-ST018-vocabulary-srs-and-mastery-api.md
  - _bmad-output/implementation-artifacts/sprint-status.yaml
forbidden_paths:
  - apps/web/**
  - package.json
  - pnpm-lock.yaml
  - main
requires_human_approval: false
max_fix_rounds: 2
---

# Story: Vocabulary SRS And Mastery API

## Goal

Give an authenticated learner an owner-scoped vocabulary review queue and durable
mastery state, with server-owned scheduling updates based on validated recall quality.

## Business Rules

- A learner can read and mutate only their own vocabulary review state.
- Due vocabulary is ordered deterministically by next-review time then stable item ID.
- Review quality is an allowlisted bounded value; the client never authors mastery,
  interval, repetitions, or next-review time directly.
- A review submission is idempotent by learner, vocabulary item, and client submission
  identifier. Concurrent retries must award one state transition.
- Missing optional media/example data never prevents a basic review response.

## API Contract

- `GET /api/v1/vocabulary/reviews/due?limit=`
- `POST /api/v1/vocabulary/reviews/:vocabularyId`

## Acceptance Criteria

- Protected APIs return due reviews and persist server-calculated mastery/scheduling.
- Ownership, validation, duplicate replay, empty due state, and deterministic ordering
  have service and API E2E coverage.
- Existing public taxonomy/mindmap responses remain unchanged and contain no learner
  state or answer material.
- Schema/migration is additive, Prisma output is synchronized, and database/API/test
  documentation is updated with rollback notes.

## Verification

- `pnpm prisma:validate`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm --filter api test:e2e`
- `pnpm build`
- `pnpm story:verify stories/ready/EP1-ST018-vocabulary-srs-and-mastery-api.md`
- `git diff --check`

## Blocked

The existing public taxonomy has classification nodes only and no canonical vocabulary
item record. SRS cannot correctly store mastery against a topic/subtopic identifier.
`EP1-ST050` must first provide governed vocabulary items with stable IDs and item-to-
taxonomy links; this story resumes after that foundation is verified.
