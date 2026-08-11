---
id: EP5-ST003
title: Strict FULL exam UI and interruption handling
status: done
type: frontend
priority: highest
phase: phase-5-full-test-adaptive-ai-and-community
depends_on:
  - EP5-ST002
allowed_paths:
  - apps/web/src/entities/toeic-timed-test/**
  - apps/web/src/features/toeic-timed-test/**
  - apps/web/src/widgets/toeic-timed-test/**
  - apps/web/src/app/toeic/test/**
  - tests/e2e/toeic-timed-test.spec.ts
  - docs/05_FRONTEND_ARCHITECTURE.md
  - docs/09_UI_DESIGN_SYSTEM.md
  - docs/10_TEST_STRATEGY.md
  - stories/**
  - _bmad-output/implementation-artifacts/sprint-status.yaml
  - _bmad-output/planning-artifacts/story-map.md
forbidden_paths:
  - apps/api/**
  - packages/**
  - package.json
  - pnpm-lock.yaml
  - apps/web/.env
  - main
  - shared Supabase or production data
requires_human_approval: false
max_fix_rounds: 2
risk: medium
delivery_mode: full
---

# Story: Strict FULL exam UI and interruption handling

## Goal

Extend the existing authenticated `/toeic/test` learner journey from MINI/HALF to
the approved server-owned FULL session. The learner must see the server-shaped 200
question snapshot, answer in order without skipping, resume after refresh, and
reconcile expiry through the existing result boundary without inventing client
progress or timing authority.

## User value

As a learner preparing for the full TOEIC test, I want a clear, keyboard-friendly
exam surface that survives refreshes and interruptions, so that I can complete the
server-approved attempt without losing answers or seeing misleading progress.

## Scope

This story changes only the existing timed-test frontend contract, widget, and its
critical browser journey. It adds FULL as a client-recognized mode and preserves the
existing MINI/HALF behavior. It does not change the backend, database, content,
scoring policy, integrity telemetry, AI, or Phase 6.

## Existing implementation and contracts

- EP5-ST002 is merged into `dev` and exposes authenticated `POST /toeic/tests/sessions`
  with `mode: FULL`, server-owned `total: 200`, `remainingSeconds: 7200`, ordered
  safe questions, owner-bound resume, answer acknowledgement, submit, result, and
  analysis routes.
- `apps/web/src/entities/toeic-timed-test/model/contracts.ts` is the client
  allowlist. It must reject recursive sensitive fields and malformed session shapes;
  it must not derive business progress from question types or local counters.
- `apps/web/src/features/toeic-timed-test/api/timed-test-api.ts` already routes all
  calls through `requestLearnerApi`; do not add raw fetches or credentials.
- `apps/web/src/features/toeic-timed-test/model/client-session.ts` may persist only
  the existing client session ID and active session ID. Never persist questions,
  answers, score, answer keys, or user data.
- The existing widget uses the server `answered` count and `remainingSeconds`. A
  local countdown is presentation-only; when it reaches zero, reconcile through the
  server result route instead of declaring a local result.
- The existing browser suite already covers MINI/HALF setup, no-skip behavior,
  refresh/resume, retries, expiry reconciliation, result redaction, 360px layout,
  keyboard operation, and axe checks. Preserve those tests and extend the same
  conventions for FULL.

## Acceptance Criteria

1. The client timed-test contract accepts exactly `MINI`, `HALF`, and `FULL`.
   `FULL` has the server-approved shape of 200 questions and 120 minutes. The
   parser rejects unknown modes, mismatched totals, incomplete active snapshots,
   score leakage before finalization, recursive forbidden fields, malformed options,
   and invalid envelopes. MINI/HALF parsing remains backward compatible.

2. The setup state presents MINI, HALF, and FULL with clear question/time values and
   one primary start action. Labels explain that the server controls allocation and
   timing; the UI does not expose or invent quotas, content taxonomy, or answer keys.
   A pending start disables duplicate requests, and a 404/empty catalogue remains an
   explicit actionable empty state.

3. A FULL active session renders the server-provided ordered question at the
   acknowledged `answered` index, exposes text progress and a native progress
   indicator, requires an option before answering, and prevents skipping or client
   advancement. After a successful answer acknowledgement the widget advances using
   the server `answered` value. Duplicate clicks cannot create duplicate requests.

4. Refresh/resume remains owner-bound through the existing active session ID. Local
   storage contains only the approved identifiers. A transient resume failure keeps
   a valid session retryable; confirmed not-found may retire the stale active ID.
   The UI never reconstructs a question list or answer state from local storage.

5. The visible FULL countdown is formatted from server `remainingSeconds` as
   `MM:SS` and is presentation-only. At zero, or after a visibility/reconnect
   interruption, the UI requests the server result and renders the authoritative
   `SUBMITTED` or `EXPIRED` state. It never marks a test expired, submitted, scored,
   or complete from client time alone.

6. Active, loading, empty/insufficient-content, retryable-error, pending-answer,
   expired, submitted, and analysis-unavailable states remain explicit and
   actionable. Expected errors use learner-safe messages and do not expose response
   internals. A valid final result remains visible when optional analysis fails.

7. The finalized FULL result renders only the safe server projection already
   accepted by the entity parser. It does not show per-question correctness,
   `correctAnswer`, `isCorrect`, selected answers, provider/license/governance
   fields, or client-derived TOEIC conversion scores.

8. The UI is mobile-first at 360px, has no horizontal overflow, visible keyboard
   focus, semantic labels, 44px touch targets, reduced-motion behavior, and no
   color-only status communication. Existing EnglishPath timed-test design tokens
   and CSS-module conventions are preserved; route files remain thin.

9. Browser coverage extends `tests/e2e/toeic-timed-test.spec.ts` to prove FULL setup
   request shape, 200-question active rendering, no-skip/answer acknowledgement,
   resume after refresh, server expiry reconciliation, retryable failure, safe final
   result, 360px overflow, keyboard access, and axe health. Existing MINI/HALF tests
   continue to pass unchanged. Add focused client contract tests only if the
   repository's existing frontend test convention supports them; do not add a new
   test runner or package.

10. No backend, Prisma, migration, package, credential, content, or production file
    changes are introduced. Do not modify the approved API semantics to accommodate
    the UI.

## Allowed implementation paths

- Entity types, safe parsers, and FULL shape constants under
  `apps/web/src/entities/toeic-timed-test/**`.
- Existing API adapter and client-session helpers under
  `apps/web/src/features/toeic-timed-test/**`.
- Existing timed-test widget, CSS module, route loading boundary, and metadata under
  `apps/web/src/widgets/toeic-timed-test/**` and `apps/web/src/app/toeic/test/**`.
- The existing Playwright journey `tests/e2e/toeic-timed-test.spec.ts`.

## Verification commands

```text
pnpm story:doctor -- stories/done/EP5-ST003-strict-exam-ui-and-interruption-handling.md
pnpm planning:traceability
pnpm --filter web lint
pnpm --filter web typecheck
pnpm e2e --grep "TOEIC timed test learner journey"
pnpm story:verify stories/done/EP5-ST003-strict-exam-ui-and-interruption-handling.md
pnpm story:checks
git diff --check
```

The repository currently has no frontend Vitest executable or configured frontend
unit-test runner, so no invented test command is added. Frontend lint/typecheck,
the focused Playwright journey, and the project-wide quality gate are the evidence
for this story; an unavailable command must never be reported as passed.

## Required skills

- `englishpath-frontend-quality` for state, architecture, responsive, and
  accessibility requirements.
- `design-taste-frontend-v1`, `gpt-taste`, and `minimalist-ui` for the visual
  refinement within the approved EnglishPath design system; motion remains quiet,
  purposeful, and reduced-motion safe in a study flow.
- `bmad-dev-story` for implementation and `bmad-code-review` for the mandatory
  medium-risk review.

## Risk controls

- `risk: medium`; review is mandatory because this is a learner-facing state/query
  flow that can lose perceived progress or mishandle expiry.
- `max_fix_rounds: 2`; if the backend contract is insufficient, stop and record the
  exact contract blocker rather than editing EP5-ST002 or creating a recovery story.
- Do not add a FULL browser journey that requires fake backend behavior to claim a
  production result; mock only the existing API boundary following current E2E
  conventions.
- Do not delete blocked/superseded story history.

## Dependency and lifecycle notes

EP5-ST001 and EP5-ST002 are done and merged into `dev`. This is the sole
dependency-ready Phase 5 implementation story. EP5-ST004 and later remain backlog
until their direct dependencies pass. Phase 6 remains suspended indefinitely until
production has many users.



## Blocked Report

- Failed step: "node" "scripts/codex-runner.mjs" "build" ".codex-build-task.md"
- Exit code: 42
- Attempts: 1
- Summary: The automated loop produced a valid blocked outcome and stopped without further retries.

### Evidence

```text
Child process returned blocked exit code 42.
Command failed with exit code 42: "node" "scripts/codex-runner.mjs" "build" ".codex-build-task.md"
```

## Recovery Evidence

- Recovery completed on the same story branch after the external 240-second Codex
  runner failure; the historical blocked attempt was not resumed as a new story.
- Added strict FULL client parsing (200 questions, 120 minutes), interruption-safe
  reconciliation, monotonic server-acknowledged progress, and synchronous duplicate
  answer protection.
- Added FULL browser coverage for setup, ordered no-skip answering, stale-result
  reconciliation, refresh/resume, expiry/retry, safe result redaction, mobile
  overflow, keyboard focus, and axe checks.
- Review result: `Status: pass`, no P0/P1 findings.
- Verification evidence: `pnpm story:checks` passed with 59 tooling tests, 519 API
  unit tests, 124 API E2E tests, and 104 Playwright browser tests; format,
  traceability, Prisma validation, lint, typecheck, build, and `git diff --check`
  also passed. Focused timed-test E2E passed 20/20.

## Completion Evidence

- Commit `e5aa963` was fast-forward merged into `dev` and pushed to `origin/dev`.
- No production `main` checkout, merge, promotion, credential, or environment
  change was performed.
