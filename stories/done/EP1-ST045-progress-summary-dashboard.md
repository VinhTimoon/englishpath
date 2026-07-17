---
id: EP1-ST045
title: Persisted Progress Summary Dashboard
status: done
type: fullstack
priority: high
phase: phase-1-learning-core
allowed_paths:
  - apps/api/src/modules/practice/**
  - apps/web/src/widgets/learner-entry/**
  - docs/08_API_CONTRACT.md
  - docs/10_TEST_STRATEGY.md
  - tests/e2e/**
  - _bmad-output/planning-artifacts/story-map.md
  - stories/**
forbidden_paths:
  - .env
  - main
requires_human_approval: false
max_fix_rounds: 1
---

# Story: Persisted Progress Summary Dashboard

## Goal

Show persisted XP, streak, completed sessions, and review-error count on the authenticated
dashboard after Daily Practice.

## Acceptance Criteria

- Summary is owner-derived and returns safe zero defaults.
- Dashboard handles loading, error, and success without credentials in browser tests.
- Focused lint, typecheck, unit/browser tests, build, story verify, and diff check pass.

## Verification

- `pnpm story:verify stories/done/EP1-ST045-progress-summary-dashboard.md`
- `git diff --check`

## Completion Evidence

- Added owner-derived progress aggregate API and dashboard loading/error/success states.
- API typecheck/lint, web lint/production build, focused 360px browser journey, story
  verification, and diff check passed.
- Scope reused existing persisted practice data; no schema, dependency, credential,
  migration, or production branch change was required.

