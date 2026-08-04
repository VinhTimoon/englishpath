---
id: EP1-ST057
title: Vocabulary Mindmap Selection Slice
status: ready
type: frontend
priority: high
phase: phase-1-learning-core
risk: medium
delivery_mode: review-required
depends_on:
  - EP1-ST018
  - EP1-ST053
blocked_evidence:
  - EP1-ST019
  - EP1-ST052
  - EP1-ST054
  - EP1-ST055
  - EP1-ST056
allowed_paths:
  - apps/web/src/app/vocabulary/**
  - apps/web/src/entities/vocabulary/**
  - apps/web/src/features/vocabulary/**
  - apps/web/src/widgets/vocabulary/**
  - apps/web/src/shared/**
  - apps/web/test/**
  - apps/web/tests/**
  - tests/e2e/**
  - docs/05_FRONTEND_ARCHITECTURE.md
  - docs/09_UI_DESIGN_SYSTEM.md
  - docs/10_TEST_STRATEGY.md
  - stories/ready/EP1-ST057-vocabulary-mindmap-selection.md
  - stories/in-progress/EP1-ST057-vocabulary-mindmap-selection.md
  - stories/review/EP1-ST057-vocabulary-mindmap-selection.md
  - stories/done/EP1-ST057-vocabulary-mindmap-selection.md
  - stories/blocked/EP1-ST057-vocabulary-mindmap-selection.md
  - stories/blocked/EP1-ST056-vocabulary-mindmap-paginated-item-flow.md
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

# Story: Vocabulary Mindmap Selection Slice

## Goal

Deliver the smallest learner-facing vocabulary slice after blocked `EP1-ST056`:
`/vocabulary/learn` fetches the governed mindmap, renders its operational states,
and lets the learner select any returned node without hard-coded taxonomy.

All blocked recovery stories and WIP commits remain historical evidence and must not
be resumed, cherry-picked, or merged.

## Acceptance Criteria

- The learner route fetches and renders the server-returned mindmap when no node is
  selected, with loading, empty, recoverable error/retry, and success states.
- Every returned node is keyboard-operable and selecting it preserves the returned
  node identifier in learner-owned route/query state; no taxonomy ID is hard-coded.
- The route remains thin, uses existing FSD/shared UI and design tokens, and does not
  modify public vocabulary explorer routes or API contracts.
- Targeted frontend/browser tests cover dynamic node IDs, operational states,
  keyboard interaction, and a narrow viewport.
- No backend, database, dependency, environment, API-contract, or `main` changes;
  fresh review has no P0/P1 finding.

## Implementation Boundaries

- Do not implement paginated items or SRS due-review submission; those are successors
  after this slice passes.
- Keep all changes inside the allowed frontend/test paths.

## Verification

- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm e2e`
- `node scripts/story-doctor.mjs stories/ready/EP1-ST057-vocabulary-mindmap-selection.md --ready-only`
- `pnpm story:verify stories/ready/EP1-ST057-vocabulary-mindmap-selection.md`
- `git diff --check`
