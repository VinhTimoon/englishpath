---
id: EP1-ST042
title: Learner Entry Auth Onboarding Placement Vertical Slice
status: done
type: fullstack
priority: critical
phase: phase-1-learning-core
allowed_paths:
  - apps/api/prisma/**
  - apps/api/src/generated/**
  - apps/api/src/modules/auth/**
  - apps/api/src/modules/onboarding/**
  - apps/api/src/app.module.ts
  - apps/api/test/**
  - apps/api/.env.example
  - apps/web/src/app/**
  - apps/web/src/features/auth/**
  - apps/web/src/features/onboarding/**
  - apps/web/src/entities/learner/**
  - apps/web/src/shared/api/**
  - apps/web/src/widgets/learner-entry/**
  - apps/web/.env.example
  - apps/web/package.json
  - docs/07_DATABASE_DESIGN.md
  - docs/08_API_CONTRACT.md
  - docs/10_TEST_STRATEGY.md
  - tests/e2e/**
  - _bmad-output/planning-artifacts/story-map.md
  - stories/**
  - notes/ai-req/**
forbidden_paths:
  - .env
  - main
requires_human_approval: false
max_fix_rounds: 2
---

# Story: Learner Entry Auth Onboarding Placement Vertical Slice

## Goal

Deliver one coherent learner entry journey from auth screens through persisted onboarding
and a basic placement result, replacing the former micro-story sequence `EP1-ST009–013`.

## Product Scope

- Provide register, login, logout, and password-recovery UI through an auth gateway.
- Keep a credential-free local adapter for browser tests; production Supabase SDK wiring
  remains isolated behind the same gateway and requires the approved dependency.
- Persist one primary learning goal, optional secondary goals, current level, daily study
  minutes, target days, priority skills, and onboarding completion per authenticated user.
- Provide a deterministic 10-question placement flow spanning vocabulary, grammar, and
  reading, with server-owned answer keys, one final submission, score, CEFR-like level,
  skill breakdown, and conservative fallback.
- Route a learner through `/auth` -> `/onboarding` -> `/placement-test` -> `/dashboard`.
- Keep roadmap generation, social OAuth, email delivery infrastructure, and production
  Supabase credentials out of this bundle.

## Acceptance Criteria

- The full local journey works at 360px and desktop without credentials or network.
- Authenticated API routes remain owner-only and never accept user IDs or roles from UI.
- Placement answer keys are never returned before submission.
- Onboarding and placement submissions are idempotent and validated.
- Migration is additive with rollback notes; generated Prisma client is synchronized.
- Focused tests run during implementation; one full gate and one independent review run
  only after the vertical slice is complete, with no P0/P1 findings.

## Verification

- `pnpm story:checks`
- `pnpm story:verify stories/done/EP1-ST042-learner-entry-vertical-slice.md`
- `git diff --check`

## Completion Evidence

- Delivered the local `/auth` -> `/onboarding` -> `/placement-test` -> `/dashboard`
  journey with owner-scoped persistence and server-side placement grading.
- Added additive migration `20260717170000_learner_entry`, synchronized Prisma output,
  protected API endpoints, responsive UI, and product/API/test documentation.
- Independent read-only Codex review reported no P0. Its two P1 findings were resolved:
  generated output now passes `git diff --check`, and placement retry preserves one
  client submission ID with browser plus repository replay/race regression coverage.
- Final `pnpm story:checks` passed with 260 unit tests, 36 API e2e tests, 26 Playwright
  tests, Prisma validation, lint, typecheck, and both production builds.
- `pnpm story:verify stories/review/EP1-ST042-learner-entry-vertical-slice.md` and
  `git diff --check` passed before completion.

## Remaining Decision

Production Supabase browser auth remains behind the approved dependency request in
`notes/ai-req/2026-07-17-ep1-st042-supabase-js.md`; local auth is hard-disabled when
`NODE_ENV=production`.
