---
id: EP1-ST063
title: Vocabulary Mindmap Selection Gate Recovery
status: ready
type: frontend
priority: high
phase: phase-1-learning-core
risk: medium
delivery_mode: review-required
depends_on:
  - EP1-ST018
  - EP1-ST053
  - EP1-ST062
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
  - stories/ready/EP1-ST063-vocabulary-mindmap-selection-gate-recovery.md
  - stories/in-progress/EP1-ST063-vocabulary-mindmap-selection-gate-recovery.md
  - stories/review/EP1-ST063-vocabulary-mindmap-selection-gate-recovery.md
  - stories/done/EP1-ST063-vocabulary-mindmap-selection-gate-recovery.md
  - stories/blocked/EP1-ST063-vocabulary-mindmap-selection-gate-recovery.md
  - stories/blocked/EP1-ST062-vocabulary-mindmap-selection-recovery.md
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
  - historical EP1-ST062 WIP
requires_human_approval: false
max_fix_rounds: 2
---

# Story: Vocabulary Mindmap Selection Gate Recovery

## Goal

Complete the learner vocabulary mindmap selection slice after `EP1-ST062` was
blocked by a repository formatting-gate defect. Do not resume or merge `EP1-ST062`;
the current story must independently prove both implementation and targeted tests.

## Acceptance Criteria

- `/vocabulary/learn` requests the existing published mindmap when no node is
  selected and renders deterministic loading, empty, retryable error, and success
  states.
- Every server-returned node is keyboard-operable; activation writes the exact
  server node ID to URL state without hard-coded taxonomy IDs.
- The route remains thin, uses existing FSD/shared boundaries and design tokens,
  has visible focus and 360px-safe layout, and preserves public `/vocabulary`.
- Targeted frontend/browser tests cover dynamic IDs, all operational states,
  retry recovery, keyboard selection, URL preservation, and narrow width.
- No backend, database, dependency, environment, provider, API-contract, public
  explorer, or `main` changes occur; review has no P0/P1 finding.

## Verification

- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm e2e`
- `node scripts/story-doctor.mjs stories/ready/EP1-ST063-vocabulary-mindmap-selection-gate-recovery.md --ready-only`
- `pnpm story:verify stories/ready/EP1-ST063-vocabulary-mindmap-selection-gate-recovery.md`
- `git diff --check`
