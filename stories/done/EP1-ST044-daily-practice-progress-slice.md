---
id: EP1-ST044
title: Daily Practice Progress And Error Review Vertical Slice
status: done
type: fullstack
priority: critical
phase: phase-1-learning-core
allowed_paths:
  - apps/api/prisma/**
  - apps/api/src/generated/**
  - apps/api/src/modules/practice/**
  - apps/api/src/app.module.ts
  - apps/api/test/**
  - apps/web/src/app/daily-practice/**
  - apps/web/src/widgets/practice/**
  - apps/web/src/widgets/learner-entry/dashboard-page.tsx
  - apps/web/src/shared/api/**
  - docs/07_DATABASE_DESIGN.md
  - docs/08_API_CONTRACT.md
  - docs/10_TEST_STRATEGY.md
  - tests/e2e/**
  - _bmad-output/planning-artifacts/story-map.md
  - stories/**
forbidden_paths:
  - .env
  - main
requires_human_approval: false
max_fix_rounds: 2
---

# Story: Daily Practice Progress And Error Review Vertical Slice

## Goal

Deliver a short authenticated daily-learning loop from roadmap to five quiz cards,
immediate feedback, persisted result, XP/streak, and basic error review.

## Product Scope

- Start or replay one active five-card practice session for the authenticated learner.
- Keep answer keys server-side until each answer is submitted.
- Persist one answer per question, return concise feedback, and submit a final result.
- Award deterministic XP, update a daily streak idempotently, and capture incorrect
  answers in a private Error Notebook projection.
- Provide `/daily-practice` with loading, question, feedback, result, and error states.
- Keep advanced SRS, content CMS/import, audio, adaptive scheduling, and rewards out of
  this bundle.

## Acceptance Criteria

- Session and answer mutations are owner-only and retry-safe.
- Pre-answer payloads never expose correct options.
- Final result includes score, XP, streak, and incorrect-review entries.
- A credential-free 360px browser journey completes all five cards and reaches summary.
- Migration is additive with rollback notes; full project gates pass.

## Verification

- `pnpm story:checks`
- `pnpm story:verify stories/done/EP1-ST044-daily-practice-progress-slice.md`
- `git diff --check`

## Completion Evidence

- Delivered five-card daily practice, server grading, immediate feedback, persisted
  results, XP/streak, private error review, dashboard CTA, and `/daily-practice` UI.
- Full quality gate passed with 42 API e2e and 28 browser tests before final review fixes;
  post-review API typecheck/lint, production web build, focused unit test, browser journey,
  and diff check passed.
- Compact Codex review reported no P0. Both P1 findings were resolved: one session per
  Vietnam-local practice day is enforced in PostgreSQL/backend, and streak boundaries use
  UTC+7. Atomic submit prevents concurrent double XP.
- No dependency, credential, remote migration, paid service, or `main` change was needed.
