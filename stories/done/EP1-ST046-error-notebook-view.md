---
id: EP1-ST046
title: Error Notebook Review View
status: done
type: fullstack
priority: high
phase: phase-1-learning-core
allowed_paths:
  - apps/api/src/modules/practice/**
  - apps/web/src/app/error-notebook/**
  - apps/web/src/widgets/practice/**
  - apps/web/src/widgets/learner-entry/dashboard-page.tsx
  - docs/08_API_CONTRACT.md
  - tests/e2e/**
  - _bmad-output/planning-artifacts/story-map.md
  - stories/**
forbidden_paths:
  - .env
  - main
requires_human_approval: false
max_fix_rounds: 1
---

# Story: Error Notebook Review View

## Goal

Let an authenticated learner revisit the latest private errors captured by Daily Practice.

## Acceptance Criteria

- API returns at most 20 newest owner errors.
- UI handles loading, empty, error, and success at 360px.
- Focused typecheck, lint, build, browser, story verify, and diff check pass.

## Verification

- `pnpm story:verify stories/done/EP1-ST046-error-notebook-view.md`
- `git diff --check`

## Completion Evidence

- Added owner-scoped latest-error API, dashboard link, and responsive Error Notebook view.
- API typecheck/lint, web lint/build, focused 360px browser test, story verify, and diff
  check passed without schema, dependency, credential, migration, or `main` changes.

