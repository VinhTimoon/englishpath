---
id: EP1-ST050
title: Governed Vocabulary Item Foundation
status: review
type: backend
priority: critical
phase: phase-1-learning-core
allowed_paths:
  - apps/api/prisma/**
  - apps/api/src/generated/**
  - apps/api/src/modules/vocabulary/**
  - apps/api/src/app.module.ts
  - apps/api/test/**
  - docs/07_DATABASE_DESIGN.md
  - docs/08_API_CONTRACT.md
  - docs/10_TEST_STRATEGY.md
  - stories/**
  - _bmad-output/implementation-artifacts/sprint-status.yaml
forbidden_paths:
  - apps/web/**
  - package.json
  - pnpm-lock.yaml
  - main
requires_human_approval: false
max_fix_rounds: 2
---

# Story: Governed Vocabulary Item Foundation

## Goal

Persist canonical, reviewed vocabulary items with stable IDs and taxonomy links so
learner SRS/mastery can safely reference real learning content.

## Acceptance Criteria

- Add additive schema/migration for governed vocabulary items and taxonomy linkage.
- Each item has word, meaning, optional example/pronunciation, source/license, review
  and publication state; published learner reads exclude private governance fields.
- Seed a small original, reviewed, published fixture set without external credentials.
- Service/repository/API tests prove deterministic published reads and reject
  unpublished content.
- Update database/API/test documentation and record rollback notes.

## Verification

- `pnpm prisma:validate`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm --filter api test:e2e`
- `pnpm build`
- `git diff --check`
