---
id: EP1-ST047
title: Vocabulary SRS and Daily Sentence Learning Bundle
status: ready
type: fullstack
priority: high
phase: phase-1-learning-core
allowed_paths:
  - apps/api/prisma/schema.prisma
  - apps/api/prisma/migrations/**
  - apps/api/src/generated/**
  - apps/api/src/modules/vocabulary/**
  - apps/api/src/modules/daily-sentence/**
  - apps/api/src/app.module.ts
  - apps/api/test/**
  - apps/web/src/app/vocabulary/**
  - apps/web/src/app/daily-sentence/**
  - apps/web/src/entities/vocabulary/**
  - apps/web/src/features/explore-vocabulary/**
  - apps/web/src/widgets/public-vocabulary/**
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
max_fix_rounds: 2
---

# Story: Vocabulary SRS and Daily Sentence Learning Bundle

## Goal

Complete the remaining Phase 1 learner repetition loop with owner-scoped vocabulary
reviews and one governed daily sentence per local date.

## Business Rules

- Vocabulary review state is private to the authenticated application user.
- The server owns review scheduling. A deterministic bounded SM-2-style rule records
  rating, repetitions, interval, ease, and next review date; invalid or duplicate
  submissions cannot inflate progress.
- Due reviews are ordered oldest-due first and are capped at 20 per request.
- Daily Sentence selects one published and reviewed sentence deterministically for the
  learner's local date and never exposes its expected answer before submission.
- Submission is idempotent per user, sentence, and local date and awards progress once.
- Ship at least 20 original project-authored daily sentence fixtures with source,
  license, review, and publish metadata. Do not claim the 500-vocabulary or 100-quiz
  launch gates in this story.

## FE Requirements

- Extend the vocabulary experience with authenticated due-review states and rating
  controls without regressing the public taxonomy explorer.
- Add a thin `/daily-sentence` route and a learning widget with loading, empty, error,
  prompt, feedback, and completed states.
- Link Daily Sentence from the learner dashboard.
- Keep controls keyboard accessible and usable at 360px.

## BE Requirements

- Keep controller -> service -> repository boundaries and validate every mutation DTO.
- Add additive Prisma models/migration for SRS state and daily-sentence completion;
  update generated client and database documentation, with rollback notes.
- Add protected `/api/v1/vocabulary/reviews` and `/api/v1/daily-sentences/*` contracts
  using the existing JWT/application-principal boundary.
- Add service tests and authenticated API E2E tests for ownership, idempotency,
  answer protection, due ordering, and scheduling edge cases.

## API Contract

- `GET /api/v1/vocabulary/reviews/due`
- `POST /api/v1/vocabulary/reviews/:vocabularyId`
- `GET /api/v1/daily-sentences/today`
- `POST /api/v1/daily-sentences/:sentenceId/submit`

## Acceptance Criteria

- An authenticated learner can complete a due vocabulary review and observe its next
  review date; another learner cannot read or mutate that state.
- An authenticated learner can complete today's sentence once and revisit its feedback.
- Daily-sentence prompt responses do not contain expected answers before submission.
- At least 20 governed daily sentence fixtures are available without external secrets.
- Existing guest, auth, roadmap, practice, progress, Error Notebook, blog, and public
  vocabulary behavior remains green.
- Migration validation, rollback notes, focused browser coverage, full checks, story
  verification, and independent Codex review pass with no P0/P1 findings.

## Verification

- `pnpm prisma:validate`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm e2e`
- `pnpm story:verify stories/in-progress/EP1-ST047-srs-daily-sentence-learning-bundle.md`
- `git diff --check`
