---
id: EP4-ST004
title: TOEIC Speaking Task And Recording UI
status: done
type: frontend
priority: high
phase: phase-4-toeic-speaking-writing-and-four-skills
depends_on:
  - EP4-ST003
allowed_paths:
  - apps/web/**
  - apps/api/src/modules/toeic/**
  - apps/api/test/**
  - tests/e2e/**
  - docs/05_FRONTEND_ARCHITECTURE.md
  - docs/09_UI_DESIGN_SYSTEM.md
  - docs/10_TEST_STRATEGY.md
  - _bmad-output/implementation-artifacts/sprint-status.yaml
  - _bmad-output/planning-artifacts/story-map.md
  - stories/**
  - notes/ai-req/**
forbidden_paths:
  - apps/api/.env*
  - direct provider/storage credentials
  - main
requires_human_approval: true
max_fix_rounds: 2
risk: high
delivery_mode: full
---

# Story: TOEIC Speaking Task And Recording UI

## Goal

Give learners a mobile-safe Speaking task, recording, playback, retry, and
submission journey using the approved backend recording boundary.

## Acceptance Criteria

- The UI consumes server-owned task/session/playback contracts only.
- Recording permissions, loading, empty, error, retry, cancellation, and success
  states are explicit and do not lose learner state.
- No provider locator, credential, hidden prompt, or ownership decision is made
  in the browser.
- Browser accessibility and responsive evidence passes.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm e2e`
- `git diff --check`

## Dependency resolution

EP4-ST003 and its approved Option 1 storage boundary passed full quality gates
and were merged to `dev` on 2026-08-11. This story may proceed against the
server-owned recording and playback contracts. The additive `recordingId`
projection is part of that contract consumption boundary; it contains no
provider locator, credential, or storage decision.

## Tasks/Subtasks

- [x] Add typed Speaking task/session, submission, recording, and playback API
  contracts through the existing frontend API boundary.
- [x] Add a browser recording controller with explicit permission, lifecycle,
  cancellation, retry, and cleanup states.
- [x] Build the mobile-first Speaking task view with controlled playback and
  accessible loading, empty, error, and success states.
- [x] Add focused unit/component coverage and deterministic browser journeys.
- [x] Run the full frontend quality gates and record evidence.

## Implementation Summary

- Added typed, allowlisted Speaking task/session/submission/playback contracts
  and an authenticated API client; the browser never derives ownership,
  provider, rubric, or storage decisions.
- Added a MediaRecorder controller with explicit permission, unsupported,
  cancellation, retry, cleanup, max-duration, and local preview states.
- Added a mobile-first `/toeic/speaking` journey with retryable submission and
  upload failures, controlled capability playback, accessible state messaging,
  and best-effort IndexedDB draft recovery without persisting credentials or
  provider locators.
- Extended the existing recording boundary additively with safe recordingId
  projection, owner-scoped binary upload/read, exact content metadata checks,
  and controller-level authenticated playback streaming.

## Verification Evidence

- Review result: pass; P0/P1 findings: none. Remaining reviewer findings were
  P2 coverage expansion opportunities only.
- Targeted checks: API lint, web lint, API/web typecheck, 18 focused unit tests,
  3 Speaking API E2E tests, 4 browser Speaking/recording tests, and web build
  all passed.
- Full gate on 2026-08-11 with `ENGLISHPATH_E2E_PORT=4179`: formatting,
  planning traceability, 59 harness tests, Prisma validation, lint, typecheck,
  71 API unit suites / 497 tests, 22 API E2E suites / 121 tests, build, and 99
  browser tests all passed.
- `git diff --check` passed. No Prisma schema, environment, credential, or
  production configuration was changed.

## Operational Boundary

The approved Option 1 remains credential-free local/test storage. Production
activation still requires the owner-controlled durable storage adapter, bucket
and RLS configuration, deployment secrets, retention/deletion policy, and a
staging smoke test. This story does not claim those external actions are done.
