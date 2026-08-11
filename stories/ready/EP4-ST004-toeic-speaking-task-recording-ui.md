---
id: EP4-ST004
title: TOEIC Speaking Task And Recording UI
status: ready
type: frontend
priority: high
phase: phase-4-toeic-speaking-writing-and-four-skills
depends_on:
  - EP4-ST003
allowed_paths:
  - apps/web/**
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
blocked_by: notes/ai-req/2026-08-10-ep4-st003-recording-storage-controlled-playback.md
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
server-owned recording and playback contracts.
