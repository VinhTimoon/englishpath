---
id: EP1-ST062
title: Vocabulary Mindmap Selection Recovery
status: ready
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
  - stories/ready/EP1-ST062-vocabulary-mindmap-selection-recovery.md
  - stories/in-progress/EP1-ST062-vocabulary-mindmap-selection-recovery.md
  - stories/review/EP1-ST062-vocabulary-mindmap-selection-recovery.md
  - stories/done/EP1-ST062-vocabulary-mindmap-selection-recovery.md
  - stories/blocked/EP1-ST062-vocabulary-mindmap-selection-recovery.md
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

Recover the smallest learner-facing vocabulary slice after blocked `EP1-ST057`.
At `/vocabulary/learn`, a learner sees the governed server-returned mindmap,
understands its operational states, and selects any returned node without a
hard-coded taxonomy identifier.

`EP1-ST057` and all earlier vocabulary WIP branches remain historical evidence;
do not resume, cherry-pick, or merge them.

## Acceptance Criteria

- With no `node` query, the route requests the existing published mindmap endpoint
  and renders loading, empty, recoverable error/retry, and success states.
- Every returned node is keyboard-operable and selecting it writes that exact server
  node identifier to URL state; no learner route/query code hard-codes taxonomy IDs.
- Existing public `/vocabulary` explorer behavior and API contracts remain unchanged.
- The route is thin and the interactive boundary uses existing FSD/shared patterns,
  design tokens, visible focus, mobile layout, and meaningful accessible labels.
- Targeted tests cover dynamic node IDs, loading/empty/error/retry/success states,
  keyboard selection, and a 360px viewport.
- No backend, database, dependency, environment, provider, public explorer, or
  `main` changes occur; review has no P0/P1 finding.

## Verification

- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm e2e`
- `node scripts/story-doctor.mjs stories/ready/EP1-ST062-vocabulary-mindmap-selection-recovery.md --ready-only`
- `pnpm story:verify stories/ready/EP1-ST062-vocabulary-mindmap-selection-recovery.md`
- `git diff --check`
