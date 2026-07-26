---
id: EP1-ST049
title: Daily Sentence Assignment Integrity
status: done
type: backend
priority: critical
phase: phase-1-learning-core
allowed_paths:
  - apps/api/src/modules/daily-sentence/**
  - apps/api/test/daily-sentence.e2e-spec.ts
  - tests/e2e/daily-sentence.spec.ts
  - scripts/tests/story-tools.test.mjs
  - stories/blocked/EP1-ST048-format-gate-and-daily-sentence-closure.md
  - docs/08_API_CONTRACT.md
  - docs/10_TEST_STRATEGY.md
  - stories/in-progress/EP1-ST049-daily-sentence-assignment-integrity.md
  - stories/review/EP1-ST049-daily-sentence-assignment-integrity.md
  - stories/done/EP1-ST049-daily-sentence-assignment-integrity.md
  - stories/review/EP1-ST047-daily-sentence-learning-bundle.md
  - stories/done/EP1-ST047-daily-sentence-learning-bundle.md
  - stories/done/EP1-ST048-format-gate-and-daily-sentence-closure.md
  - _bmad-output/planning-artifacts/story-map.md
  - _bmad-output/implementation-artifacts/sprint-status.yaml
forbidden_paths:
  - apps/api/prisma/**
  - apps/web/**
  - package.json
  - pnpm-lock.yaml
  - main
requires_human_approval: false
max_fix_rounds: 1
---

# Story: Daily Sentence Assignment Integrity

## Goal

Ensure a learner who has completed a Daily Sentence always sees the exact persisted
sentence and feedback for that local date, even if the published eligible sentence set
changes later that day.

## Inherited Maintenance Context

This branch also carries the formatting-only `EP1-ST048` remediation needed for the
repository gate. Its tool-test formatting and blocked story record are explicitly
included only so path verification evaluates the complete worktree; they do not alter
the Daily Sentence product behavior or this story's acceptance criteria.

## Business Rules

- Existing `DailySentenceCompletion.sentenceId` is the authoritative assignment after
  completion; do not recalculate or replace it from the mutable eligible set.
- A learner with no completion continues to receive the deterministic current eligible
  sentence for their local date.
- Submit replay and concurrent winner paths return the persisted completion's sentence.
- Expected answers remain server-only before a successful submission.

## Acceptance Criteria

- A completed learner revisits the same sentence after the eligible set changes.
- A replayed submission returns the originally assigned sentence and stored feedback.
- Owner isolation, answer protection, idempotency, and the existing browser journey
  remain green.
- No Prisma schema or migration change is made: the existing completion `sentenceId`
  foreign key supplies the immutable assignment.

## Verification

- `pnpm --filter api test -- daily-sentence.service.spec.ts`
- `pnpm --filter api test:e2e -- daily-sentence.e2e-spec.ts`
- `pnpm e2e -- tests/e2e/daily-sentence.spec.ts`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `git diff --check`
