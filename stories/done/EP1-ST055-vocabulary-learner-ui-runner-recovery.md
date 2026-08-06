---
id: EP1-ST055
title: Vocabulary Learner UI Recovery After Runner Cap
status: done
type: frontend
priority: highest
phase: phase-1-learning-core
risk: medium
delivery_mode: review-required
depends_on:
  - EP1-ST018
  - EP1-ST053
blocked_evidence:
  - EP1-ST019
  - blocked/ep1-st019-review-findings
  - EP1-ST052
  - EP1-ST054
  - notes/ai-req/2026-08-04-EP1-ST054-build-runner-timeout.md
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
  - stories/ready/EP1-ST055-vocabulary-learner-ui-runner-recovery.md
  - stories/in-progress/EP1-ST055-vocabulary-learner-ui-runner-recovery.md
  - stories/review/EP1-ST055-vocabulary-learner-ui-runner-recovery.md
  - stories/done/EP1-ST055-vocabulary-learner-ui-runner-recovery.md
  - stories/blocked/EP1-ST055-vocabulary-learner-ui-runner-recovery.md
  - stories/blocked/EP1-ST019-vocabulary-mindmap-item-and-review-ui.md
  - stories/blocked/EP1-ST052-vocabulary-learner-ui-review-remediation.md
  - stories/blocked/EP1-ST054-vocabulary-learner-ui-recovery.md
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

# Story: Vocabulary Learner UI Recovery After Runner Cap

## Goal

Deliver the bounded vocabulary learner experience after the external runner incident,
while preserving `EP1-ST054` as immutable blocked history. `EP1-ST054` must not be
resumed and commit `8efb8c8` must not be merged; this story is the only successor for
the implementation attempt.

## Runner Evidence

- The configured build timeout is `1200000ms` in `scripts/codex-models.json`.
- A direct repository subprocess survived for `245006ms`, so the generic shell runner
  did not enforce a 240-second cap.
- The repository harness passes the configured timeout to its child process; any new
  timeout must be recorded with the exact command and elapsed evidence.

## Functional Requirements

- Fix due-review progression so submission plus query invalidation cannot skip a due
  item and queue completion appears only after the server-backed queue is exhausted.
- Make item pagination operational: page state drives the query, next/previous
  navigation works, and node/detail/back-navigation context is preserved.
- At `/vocabulary/learn` without `node`, fetch and render the initial mindmap
  selection instead of assuming a hard-coded taxonomy identifier.
- Provide deterministic targeted frontend and browser evidence for loading, empty,
  recoverable error, submission/retry or replay, queue completion, pagination,
  detail/back navigation, initial mindmap selection, narrow-width, and keyboard use
  where relevant.

## Acceptance Criteria

- Each remaining due item is shown once in deterministic order after submission;
  invalidation cannot skip an item and completion appears only after the server-backed
  queue is exhausted.
- Pagination requests and displays the selected page, supports next/previous
  navigation, and preserves context without changing public explorer behavior or API
  contracts.
- `/vocabulary/learn` without `node` displays the fetched mindmap and permits node
  selection without assuming a taxonomy identifier.
- Targeted frontend and browser tests cover all four inherited P1 repairs and the
  declared operational states deterministically without backend or contract changes.
- Public vocabulary explorer routes and vocabulary API contracts remain unchanged;
  changed paths stay allowed; fresh review has no P0/P1 finding.
- The build phase produces a fresh terminal artifact using the configured timeout,
  and any timeout evidence is distinct from the stale 240-second incident log.

## Implementation Boundaries

- Keep routes thin and use existing FSD vocabulary entities, features, widgets, and
  shared UI. Preserve mobile-first accessibility and loading/empty/error/success
  states.
- Do not modify backend, Prisma, generated output, public explorer implementation,
  API contracts, package manifests, lockfiles, environment files, provider
  configuration, dependencies, or `main`.
- Do not resume `EP1-ST054`, cherry-pick or merge `8efb8c8`, or broaden this story to
  unrelated Phase 1 backlog.

## Verification

- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm e2e`
- `node scripts/story-doctor.mjs stories/ready/EP1-ST055-vocabulary-learner-ui-runner-recovery.md --ready-only`
- `pnpm story:verify stories/ready/EP1-ST055-vocabulary-learner-ui-runner-recovery.md`
- `git diff --check`

## Blocked Report

- Failed step: `node scripts/codex-runner.mjs debug .codex-debug-task.md`
- Exit code: `42`
- Attempts: `1`
- Summary: The Codex build produced implementation changes but no fresh terminal
  artifact before the external model execution limit; the bounded debug phase
  returned a valid blocked result. No implementation commit from this branch is
  mergeable.

### Evidence

- Full loop elapsed: `744.2s`.
- Build configuration: `scripts/codex-models.json`, `1200000ms`.
- Direct subprocess evidence: `245006ms` survived in the same repository shell.
- WIP implementation commit `9416553` remains only on `story/ep1-st055` and is not
  merged into `dev`.
- Original WIP commit `8efb8c8` remains historical and is not merged.
- Existing AI request: `notes/ai-req/2026-08-04-EP1-ST054-build-runner-timeout.md`.

### Recovery Split

`EP1-ST056` is the only ready successor and narrows the next implementation to the
mindmap and paginated item flow so it can finish within the observed external model
execution window. This blocked story must not be resumed.

