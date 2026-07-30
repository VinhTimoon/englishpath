---
id: EP1-ST019
title: Vocabulary Mindmap, Item, And Review UI
status: blocked
type: frontend
priority: high
phase: phase-1-learning-core
allowed_paths:
  - apps/web/src/app/**
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
  - stories/ready/EP1-ST019-vocabulary-mindmap-item-and-review-ui.md
  - stories/in-progress/EP1-ST019-vocabulary-mindmap-item-and-review-ui.md
  - stories/review/EP1-ST019-vocabulary-mindmap-item-and-review-ui.md
  - stories/done/EP1-ST019-vocabulary-mindmap-item-and-review-ui.md
  - stories/blocked/EP1-ST019-vocabulary-mindmap-item-and-review-ui.md
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
  - main
  - dependencies
  - provider configuration
requires_human_approval: false
max_fix_rounds: 1
---

# Story: Vocabulary Mindmap, Item, And Review UI

## Goal

Deliver the authenticated learner UI for navigating the vocabulary mindmap, viewing a
vocabulary item, and completing due review against the existing vocabulary APIs.

## Dependencies And Scope

- `EP1-ST050` supplied the canonical vocabulary-item prerequisite for completed
  `EP1-ST018`; the dependency route is `EP1-ST050 -> EP1-ST018 -> EP1-ST019`.
- Consume the existing authenticated taxonomy, item, and SRS/mastery API contracts.
  This story does not change backend behavior or API contracts.
- Keep routes thin and place query/mutation orchestration in FSD-aligned entities,
  features, widgets, and shared UI. Reuse existing shared components and state/query
  conventions.

## Functional Requirements

- Authenticated learners can open the vocabulary mindmap, select a node, inspect its
  item list, open an item, and start due review when due items exist.
- Review submission uses the existing API and renders the returned outcome without
  inventing client-side mastery or scheduling rules.
- Each relevant mindmap, item-list/item-detail, and due-review view has explicit
  loading, empty, error, and success states; mutation states include submitting and
  completion feedback where applicable.
- The experience is mobile-first, usable at narrow widths, keyboard accessible, and
  consistent with the project frontend architecture and UI design system.

## Acceptance Criteria

- An authenticated learner can navigate from the mindmap to a vocabulary item and
  return without losing the selected context.
- Empty taxonomies, empty item lists, and no-due-review results are clear and actionable.
- API failures are recoverable, do not expose sensitive data, and do not fabricate
  review results.
- Due review submits only through the existing authenticated endpoint and displays the
  server response; no correct answer or scheduling authority is added to the frontend.
- Keyboard focus, labels, touch targets, and responsive layout meet the existing UI
  and accessibility conventions.
- Targeted frontend tests and relevant browser coverage verify success and operational
  states without changing backend, Prisma, dependency, environment, or production files.

## Implementation Boundaries

- Allowed implementation is limited to the bounded frontend, documentation, and test
  paths in `allowed_paths`.
- Do not modify backend source, API contracts, Prisma schema/migrations/generated
  output, package manifests, lockfiles, dependencies, provider configuration,
  environment files, or `main`.
- Do not add frontend-owned business authority for mastery, scheduling, ownership, or
  authentication; use existing API and shared auth/query boundaries.

## Verification

- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm e2e`
- `node scripts/story-doctor.mjs stories/ready/EP1-ST019-vocabulary-mindmap-item-and-review-ui.md --ready-only`
- `git diff --check`

## Blocked Evidence

- Retained review evidence: locked/ep1-st019-review-findings and .codex-review.result.md.
- P1: review queue skips after invalidation; pagination stays on page one; /vocabulary/learn lacks initial mindmap loading; targeted frontend/browser operational-state tests are missing.
- EP1-ST052 is the sole recovery story; preserve the public explorer and API contracts.
