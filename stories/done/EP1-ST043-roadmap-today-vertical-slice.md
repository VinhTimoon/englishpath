---
id: EP1-ST043
title: Personalized Roadmap And Today Dashboard Vertical Slice
status: done
type: fullstack
priority: critical
phase: phase-1-learning-core
allowed_paths:
  - apps/api/prisma/**
  - apps/api/src/generated/**
  - apps/api/src/modules/roadmap/**
  - apps/api/src/app.module.ts
  - apps/api/test/**
  - apps/web/src/app/dashboard/**
  - apps/web/src/app/roadmap/**
  - apps/web/src/shared/api/**
  - apps/web/src/widgets/learner-entry/**
  - apps/web/src/widgets/roadmap/**
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

# Story: Personalized Roadmap And Today Dashboard Vertical Slice

## Goal

Turn completed learner entry data into a deterministic 30/60/90/120-day roadmap and
an actionable today dashboard, replacing the former micro-story sequence
`EP1-ST014–016`.

## Product Scope

- Generate one active, versioned roadmap from authenticated onboarding and placement.
- Use four phases: Foundation, Skill Building, Practice & Correction, and Simulation &
  Final Review.
- Cap each day at three tasks below 30 study minutes and use four to five tasks at 60
  minutes.
- Ensure TOEIC Listening & Reading roadmaps cover Parts 1–7 and communication roadmaps
  include speaking plus daily sentences.
- Return the current roadmap, recalculate it as a new version, and allow owner-only task
  status updates.
- Provide `/roadmap` and upgrade `/dashboard` to show today's tasks and progress.
- Keep adaptive evidence, content assignment, XP/streak, notifications, and AI generation
  out of this bundle.

## Acceptance Criteria

- Generation is deterministic, validated, owner-only, and does not accept user IDs.
- Roadmaps are limited to 30/60/90/120 days and retain version lineage.
- API and UI handle missing onboarding/placement/current-roadmap states safely.
- A credential-free 360px browser journey generates a roadmap, completes a task, and
  reflects updated progress.
- Migration is additive with rollback notes; no destructive migration is applied.
- Focused tests precede one final quality gate and one read-only review of the bundle.

## Verification

- `pnpm story:checks`
- `pnpm story:verify stories/done/EP1-ST043-roadmap-today-vertical-slice.md`
- `git diff --check`

## Completion Evidence

- Delivered deterministic 30/60/90/120-day roadmap generation, four phases, owner-only
  versioned persistence, current/recalculate/task-status APIs, `/roadmap`, and an
  actionable today dashboard.
- Rule tests cover all duration boundaries, short/60-minute task limits, TOEIC Parts 1-7,
  and communication speaking plus daily-sentence requirements.
- Independent compact Codex review reported no P0. Its three P1 findings were resolved
  with a partial unique active-roadmap index plus conflict replay, atomic owner-active
  task mutation, and parent progress synchronization. Both residual P2 risks were also
  closed with duration boundary tests and a single roadmap-page current fetch.
- Final `pnpm story:checks` passed with the complete unit suite, 42 API e2e tests, 27
  Playwright tests, Prisma validation, lint, typecheck, and both production builds.
- No dependency, credential, paid service, remote migration, or production branch change
  was required.
