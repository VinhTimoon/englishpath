---
id: EP1-ST062
title: Vocabulary Mindmap Selection Recovery
status: review
type: frontend
priority: high
phase: phase-1-learning-core
risk: medium
delivery_mode: review-required
depends_on:
  - EP1-ST018
  - EP1-ST053
  - EP1-ST057
allowed_paths:
  - apps/web/src/app/vocabulary/learn/**
  - apps/web/src/entities/vocabulary/**
  - apps/web/src/features/learner-vocabulary/**
  - apps/web/src/widgets/learner-vocabulary/**
  - apps/web/src/shared/api/**
  - apps/web/src/shared/ui/**
  - apps/web/test/**
  - apps/web/tests/**
  - tests/e2e/**
  - docs/05_FRONTEND_ARCHITECTURE.md
  - docs/09_UI_DESIGN_SYSTEM.md
  - docs/10_TEST_STRATEGY.md
  - stories/blocked/EP1-ST062-vocabulary-mindmap-selection-recovery.md
  - stories/review/EP1-ST062-vocabulary-mindmap-selection-recovery.md
  - stories/blocked/EP1-ST057-vocabulary-mindmap-selection.md
  - _bmad-output/planning-artifacts/story-map.md
  - _bmad-output/implementation-artifacts/sprint-status.yaml
forbidden_paths:
  - apps/api/**
  - apps/api/prisma/**
  - apps/api/src/generated/**
  - packages/**
  - "**/package.json"
  - "**/pnpm-lock.yaml"
  - "**/package-lock.json"
  - "**/yarn.lock"
  - .env
  - .env.*
  - "**/.env"
  - "**/.env.*"
  - provider configuration
  - main
  - public vocabulary explorer implementation
  - API contracts
  - SRS submission or due-review progression
requires_human_approval: false
max_fix_rounds: 2
---

# Story: Vocabulary Mindmap Selection Recovery

## Goal

Historical recovery attempt after blocked `EP1-ST057`; do not resume, cherry-pick,
or merge its implementation WIP. The repository-local recovery is now closed by the
verified implementation already merged to `dev`; no new successor story is created.

## Acceptance Criteria

- The recovered implementation independently proves mindmap loading, operational
  states, keyboard selection, dynamic URL state, responsive behavior, and targeted
  tests.
- Public vocabulary routes and API contracts remain unchanged.

## Verification

- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm e2e`
- `git diff --check`

## Blocked Report

- Build passed, but the repository checks stopped at `pnpm format:check`.
- `scripts/run-checks.mjs` and `story-map.md` were CRLF while the formatter gate
  required LF. The defect was fixed separately on `dev` in commit `78f7637`.
- The implementation WIP commit `2651b97` remains unmerged on its story branch.

## Resolution Evidence

The formatting-gate defect and the local runner interruption are resolved without
resuming the historical WIP. The learner route now loads the server-provided
mindmap, handles loading/empty/error/success states, preserves URL context, uses
server node IDs for keyboard selection, and remains safe at 360px. Browser evidence
also covers item pagination/detail/back navigation and retry recovery.

Verified on `dev`:

- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm e2e tests/e2e/vocabulary-learner.spec.ts`
- `git diff --check`

This story is in `review`; it must not be marked `done` without human approval.
