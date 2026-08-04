---
id: EP1-ST056
title: Vocabulary Mindmap and Paginated Item Flow
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
  - stories/ready/EP1-ST056-vocabulary-mindmap-paginated-item-flow.md
  - stories/in-progress/EP1-ST056-vocabulary-mindmap-paginated-item-flow.md
  - stories/review/EP1-ST056-vocabulary-mindmap-paginated-item-flow.md
  - stories/done/EP1-ST056-vocabulary-mindmap-paginated-item-flow.md
  - stories/blocked/EP1-ST056-vocabulary-mindmap-paginated-item-flow.md
  - stories/blocked/EP1-ST055-vocabulary-learner-ui-runner-recovery.md
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
requires_human_approval: false
max_fix_rounds: 2
---

# Story: Vocabulary Mindmap and Paginated Item Flow

## Goal

Deliver the first smaller vertical slice of the vocabulary learner flow after blocked
`EP1-ST055`: the learner can select taxonomy from the fetched mindmap, browse paged
items, and open/close item detail without hard-coded taxonomy or broken context.

`EP1-ST055`, `EP1-ST054`, and commit `8efb8c8` are historical blocked evidence and
must not be resumed, cherry-picked, or merged.

## Functional Requirements

- At `/vocabulary/learn` without `node`, fetch and render the initial mindmap with
  loading, empty, recoverable error, and success states.
- Selecting a mindmap node drives the item query without hard-coded taxonomy IDs.
- Page state drives item requests and visible pagination; invalid or absent pages
  resolve to page 1.
- Next/previous navigation preserves selected node and item detail/back-navigation
  context, including narrow-width and keyboard operation.
- Preserve public vocabulary explorer routes and all existing API contracts.

## Acceptance Criteria

- A learner opening `/vocabulary/learn` sees the fetched mindmap and can select any
  returned node; no taxonomy identifier is hard-coded in the learner route or query.
- Item loading, empty, recoverable error/retry, success, pagination, detail, and
  back-navigation states are rendered deterministically.
- Changing page requests the selected node plus page, displays the returned page,
  and next/previous controls preserve node context.
- Targeted frontend and browser tests cover initial mindmap selection, pagination,
  detail/back navigation, keyboard use, narrow width, and operational states.
- No backend, database, dependency, API-contract, public-explorer, environment, or
  `main` changes are made; fresh review has no P0/P1 finding.

## Implementation Boundaries

- Keep the route thin and use existing FSD vocabulary entities, features, widgets,
  shared UI, TanStack Query, and approved design-system tokens.
- Do not implement SRS submission or due-review progression in this story; that is a
  separate successor after this slice passes.
- Do not resume or merge any blocked recovery branch.

## Verification

- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm e2e`
- `node scripts/story-doctor.mjs stories/ready/EP1-ST056-vocabulary-mindmap-paginated-item-flow.md --ready-only`
- `pnpm story:verify stories/ready/EP1-ST056-vocabulary-mindmap-paginated-item-flow.md`
- `git diff --check`
