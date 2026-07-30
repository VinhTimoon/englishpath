---
id: EP1-ST052
title: Vocabulary Learner UI Review Remediation
status: ready
type: frontend
priority: high
phase: phase-1-learning-core
depends_on:
  - EP1-ST018
blocked_evidence:
  - EP1-ST019
  - blocked/ep1-st019-review-findings
  - .codex-review.result.md
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
  - stories/ready/EP1-ST052-vocabulary-learner-ui-review-remediation.md
  - stories/in-progress/EP1-ST052-vocabulary-learner-ui-review-remediation.md
  - stories/review/EP1-ST052-vocabulary-learner-ui-review-remediation.md
  - stories/done/EP1-ST052-vocabulary-learner-ui-review-remediation.md
  - stories/blocked/EP1-ST052-vocabulary-learner-ui-review-remediation.md
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
  - provider configuration
  - main
requires_human_approval: false
max_fix_rounds: 2
---

# Story: Vocabulary Learner UI Review Remediation

## Goal

Recover blocked `EP1-ST019`, close its four bounded P1 findings, and add targeted frontend and browser evidence while preserving the public vocabulary explorer and every existing API contract.

## Dependencies And Evidence

- Depends on completed `EP1-ST018` for the existing authenticated SRS/mastery API.
- `EP1-ST019` remains immutable blocked evidence; inspect `blocked/ep1-st019-review-findings` and `.codex-review.result.md` before changes.
- This is frontend-only; do not add client-owned scheduling, mastery, ownership, authentication, or answer authority.

## Functional Requirements

- Fix due-review progression so submission plus query invalidation cannot skip a due item and queue completion stays reliable.
- Make item pagination operational: page state drives the query and next/previous navigation preserves node, detail, and back-navigation context.
- At `/vocabulary/learn` without `node`, fetch and render initial mindmap selection instead of redirecting to a hard-coded node.
- Add targeted frontend and browser tests for loading, empty, recoverable error, submission/retry or replay, queue completion, pagination, detail/back navigation, initial mindmap selection, narrow-width, and keyboard interaction where relevant.

## Acceptance Criteria

- Each remaining due item is shown once in deterministic order after submission; invalidation cannot skip an item and completion appears only after the server-backed queue is exhausted.
- Pagination requests and displays the selected page, supports next/previous navigation, and preserves context without changing public explorer behavior or API contracts.
- `/vocabulary/learn` without `node` displays the fetched mindmap and permits node selection without assuming a taxonomy identifier.
- Targeted frontend and browser tests cover all four P1 repairs and declared operational states deterministically without backend or contract changes.
- Public vocabulary explorer routes and vocabulary API contracts remain unchanged; changed paths stay allowed; fresh review has no P0/P1 finding.

## Implementation Boundaries

- Keep routes thin and use existing FSD vocabulary entities, features, widgets, and shared UI. Preserve mobile-first accessibility and loading/empty/error/success states.
- Do not modify backend, Prisma, generated output, public explorer implementation, API contracts, package manifests, lockfiles, environment files, provider configuration, dependencies, or `main`.

## Verification

- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm e2e`
- `node scripts/story-doctor.mjs stories/ready/EP1-ST052-vocabulary-learner-ui-review-remediation.md --ready-only`
- `pnpm story:verify stories/ready/EP1-ST052-vocabulary-learner-ui-review-remediation.md`
- `git diff --check`