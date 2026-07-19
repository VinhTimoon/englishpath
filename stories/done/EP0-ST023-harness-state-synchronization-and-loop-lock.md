---
id: EP0-ST023
title: Harness State Synchronization And Loop Lock
status: done
type: tooling
allowed_paths:
  - .gitignore
  - scripts/codex-loop.mjs
  - scripts/lib/harness-state.mjs
  - scripts/tests/**
  - tests/e2e/error-notebook.spec.ts
  - tests/e2e/roadmap-today.spec.ts
  - _bmad-output/**
  - _bmad-output/planning-artifacts/sprint-change-proposal-2026-07-19-ep0-st023.md
  - stories/**
forbidden_paths:
  - apps/**
  - packages/**
  - docs/**
  - .github/**
  - .env
max_fix_rounds: 2
baseline_commit: 9d787b0adf5046a919bb48f388864e3d13b884c9
---

# Story: Harness State Synchronization And Loop Lock

## Goal

Prevent concurrent loop execution and keep BMAD sprint state synchronized with loop lifecycle transitions.

## Acceptance Criteria

1. Loop startup atomically acquires a repository-local lock; a live competing owner fails clearly.
2. Stale/malformed locks recover deterministically and owned locks release on every terminal path.
3. In-progress and review transitions update the matching sprint entry and both last_updated representations without reformatting YAML.
4. Blocked lifecycle maps to BMAD in-progress because the installed state machine has no blocked value; evidence stays in the story file.
5. Missing sprint files or story keys fail instead of silently diverging.
6. Focused tooling tests, planning traceability, repository checks, and diff checks pass.

## Tasks / Subtasks

- [x] Add atomic loop ownership and stale-lock recovery (AC: 1, 2).
- [x] Add comment-preserving sprint synchronization (AC: 3-5).
- [x] Integrate guards into all loop terminal paths (AC: 1-5).
- [x] Add focused tests and run verification (AC: 6).

### Review Findings

- [x] [Review][Patch] Make stale-lock acquisition and owner release race-safe [scripts/lib/harness-state.mjs:17]
- [x] [Review][Patch] Make lifecycle and sprint transitions rollback-safe [scripts/codex-loop.mjs:124]
- [x] [Review][Patch] Preserve blocked evidence when sprint synchronization fails [scripts/codex-loop.mjs:182]
- [x] [Review][Patch] Release the loop lock when no ready story exists [scripts/codex-loop.mjs:20]
- [x] [Review][Patch] Require both last_updated representations before writing [scripts/lib/harness-state.mjs:59]
- [x] [Review][Patch] Resolve default harness paths from the repository root and bound PID reuse [scripts/lib/harness-state.mjs:4]
- [x] [Review][Patch] Repair final story evidence and file inventory [stories/done/EP0-ST023-harness-state-synchronization-and-loop-lock.md]

## Dev Notes

Use Node built-ins only. The lock is an atomically-created `.codex-loop.lock` directory containing owner metadata. Map `EP1-ST018` to unique sprint prefix `1-18-`. Preserve current retry, review, verification, and dev-only merge behavior.

## Verification

- node scripts/story-doctor.mjs stories/ready/EP0-ST023-harness-state-synchronization-and-loop-lock.md --ready-only
- node --test scripts/tests/story-tools.test.mjs
- pnpm planning:traceability
- pnpm story:checks
- git diff --check

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `pnpm story:checks` passed after implementation and again after review patches.
- Three independent review layers completed: Blind Hunter, Edge Case Hunter, Acceptance Auditor.

### Completion Notes List

- Implemented repository-root atomic lock directories with stale quarantine, bounded PID reuse, and owner-safe release.
- Implemented validated, rollback-safe sprint/lifecycle synchronization and preserved blocker evidence on sync failure.
- Added focused regression coverage for contention, stale/malformed locks, empty queues, timestamp validation, and transition rollback.

### File List

- `.gitignore`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/planning-artifacts/epic-map.md`
- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-07-19-ep0-st023.md`
- `_bmad-output/planning-artifacts/story-map.md`
- `scripts/codex-loop.mjs`
- `scripts/lib/harness-state.mjs`
- `scripts/tests/story-tools.test.mjs`
- `stories/done/EP0-ST023-harness-state-synchronization-and-loop-lock.md`
- `tests/e2e/error-notebook.spec.ts`
- `tests/e2e/roadmap-today.spec.ts`

## Change Log

- 2026-07-19: Created implementation-ready harness reliability story.
- 2026-07-19: Owner approved formatting-only scope expansion for two blocking E2E files.
- 2026-07-19: Completed harness implementation and all repository gates; ready for review.
- 2026-07-19: Resolved all seven independent code-review findings.

