---
id: EP1-ST047
title: Daily Sentence Learning Bundle
status: ready
type: fullstack
priority: high
phase: phase-1-learning-core
allowed_paths:
  - apps/api/prisma/schema.prisma
  - apps/api/prisma/migrations/**
  - apps/api/src/generated/**
  - apps/api/src/modules/daily-sentence/**
  - apps/api/src/app.module.ts
  - apps/api/test/**
  - apps/web/src/app/daily-sentence/**
  - apps/web/src/widgets/learner-entry/dashboard-page.tsx
  - apps/web/src/widgets/learning/**
  - tests/e2e/**
  - docs/07_DATABASE_DESIGN.md
  - docs/08_API_CONTRACT.md
  - _bmad-output/planning-artifacts/story-map.md
  - _bmad-output/implementation-artifacts/sprint-status.yaml
  - stories/**
forbidden_paths:
  - apps/api/.env
  - apps/web/.env.local
  - package.json
  - pnpm-lock.yaml
  - main
requires_human_approval: false
max_fix_rounds: 1
---

# Story: Daily Sentence Learning Bundle

## Goal

Deliver the complete authenticated Daily Sentence loop from governed local content to
owner-scoped completion and responsive learner UI.

## Business Rules

- Select one published and reviewed sentence deterministically for the learner's local
  date using the stored profile timezone with the existing safe fallback.
- Never expose the expected answer before submission.
- Submission is idempotent per user and local date, and revisiting returns persisted
  feedback without awarding progress twice.
- Ship at least 20 original project-authored fixtures with stable IDs, source, license,
  review, and publish metadata.

## FE Requirements

- Add a thin `/daily-sentence` route and a learning widget with loading, empty, error,
  prompt, submitting, feedback, and completed states.
- Link Daily Sentence from the learner dashboard.
- Keep the form keyboard accessible and usable at 360px.

## BE Requirements

- Keep controller -> service -> repository boundaries and validate mutation DTOs.
- Add additive Prisma models/migration for governed sentences and owner completions,
  regenerate Prisma, update database documentation, and include rollback notes.
- Protect endpoints with the existing JWT/application-principal boundary.
- Test ownership, timezone selection, answer protection, and idempotency.

## API Contract

- `GET /api/v1/daily-sentences/today`
- `POST /api/v1/daily-sentences/:sentenceId/submit`

## Acceptance Criteria

- An authenticated learner can complete today's sentence once and revisit its feedback.
- Prompt responses never contain the expected answer before persisted completion.
- At least 20 governed fixtures work without external secrets or new dependencies.
- Another learner cannot read or mutate the owner's completion.
- Existing learner dashboard and all current regression checks remain green.
- Migration validation, browser coverage, full checks, story verification, and
  independent Codex review pass with no P0/P1 findings.

## Verification

- `pnpm prisma:validate`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm e2e`
- `pnpm story:verify stories/in-progress/EP1-ST047-daily-sentence-learning-bundle.md`
- `git diff --check`
