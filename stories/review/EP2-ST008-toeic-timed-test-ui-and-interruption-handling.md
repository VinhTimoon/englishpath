---
id: EP2-ST008
title: TOEIC timed mini and half test UI with interruption handling
status: review
type: vertical-slice
priority: high
phase: phase-2-toeic-listening-reading
depends_on:
  - EP2-ST007
allowed_paths:
  - apps/web/src/app/toeic/test/**
  - apps/web/src/widgets/toeic-timed-test/**
  - apps/web/src/features/toeic-timed-test/**
  - apps/web/src/entities/toeic-timed-test/**
  - apps/web/src/shared/api/**
  - tests/e2e/**
  - tests/unit/**
  - docs/03_USER_FLOWS.md
  - docs/05_FRONTEND_ARCHITECTURE.md
  - docs/08_API_CONTRACT.md
  - docs/09_UI_DESIGN_SYSTEM.md
  - docs/10_TEST_STRATEGY.md
  - stories/**
  - _bmad-output/implementation-artifacts/sprint-status.yaml
  - _bmad-output/planning-artifacts/story-map.md
forbidden_paths:
  - apps/web/.env
  - apps/api/**
  - apps/web/src/app/admin/**
  - apps/api/src/generated/**
  - packages/**
  - package.json
  - pnpm-lock.yaml
  - main
requires_human_approval: false
max_fix_rounds: 2
risk: high
delivery_mode: full
---

# Story: TOEIC timed mini and half test UI with interruption handling

## Goal

Give an authenticated learner a usable timed TOEIC mini or half test at
`/toeic/test`, backed entirely by the server-owned EP2-ST007 session API. The
learner can start a server-shaped test, answer every selected question in order,
resume after refresh or a transient interruption, and see a safe final aggregate
result without receiving answer keys, correctness flags, or a client-owned timer.

This story is the learner-facing vertical slice for `UF-008` / `FR-014`. It does
not add scoring analysis, weakness analysis, Error Notebook writes, remediation
packs, a full exam, or any Phase 3 behavior.

## Scope and API contract

Use the existing authenticated learner API client and the exact EP2-ST007 routes:

- `POST /api/v1/toeic/tests/sessions` with only `{ clientSessionId, mode }`, where
  `mode` is `MINI` or `HALF`.
- `GET /api/v1/toeic/tests/sessions/:sessionId` for active resume/progress.
- `POST /api/v1/toeic/tests/sessions/:sessionId/answers` with one
  `{ questionId, selectedOption }`.
- `POST /api/v1/toeic/tests/sessions/:sessionId/submit` for explicit submit or
  server-determined expiry finalization.
- `GET /api/v1/toeic/tests/sessions/:sessionId/result` for refresh/final result.

Treat all responses as `unknown` until the shared API boundary validates the
safe envelope. The UI may use only `sessionId`, `mode`, `status`, `total`,
`answered`, `startedAt`, `deadlineAt`, `remainingSeconds`, safe question fields,
and the final aggregate `score` when the server has finalized the session. Never
add `correctAnswer`, `isCorrect`, `selectedOption`, private answer rows, source,
license, review, publication, or provider fields to learner contracts, state,
logs, URLs, or fixtures.

The server is authoritative for the MINI/HALF shape and clock: MINI is 20
questions/20 minutes and HALF is 50 questions/45 minutes. Render
`remainingSeconds` from the latest server response and use a local display tick
only as a presentation countdown; never use the client clock to authorize an
answer or submit. If the countdown reaches zero, re-fetch result or submit and
render the server outcome.

## Acceptance Criteria

1. Add an authenticated `/toeic/test` route with a thin App Router page and
   FSD-aligned widget/feature/entity/shared boundaries. The setup state lets the
   learner choose only MINI or HALF, explains the server-owned duration/count,
   and provides an accessible return link to the learner dashboard or TOEIC
   practice route.

2. Starting a test creates an actor-bound local client session ID, sends only the
   selected mode, disables duplicate starts while pending, and renders the exact
   server question order. The browser never creates questions, changes count,
   reorders questions, skips questions, or treats a client-supplied duration as
   authoritative.

3. The active state renders one question at a time with safe prompt/options,
   current position and total, text progress alternative, server-derived
   remaining-time status, keyboard-operable option controls, visible focus, and
   minimum 44px targets. The next/submit action stays disabled until the answer
   acknowledgement succeeds; an answer request cannot be sent twice while
   pending and an answer failure leaves the learner on the same question with a
   retry action.

4. The flow is resumable after reload, route navigation, or a transient network
   interruption. Persist only the non-sensitive client session ID and active
   session ID locally. On load, replay/start or GET the owner-bound session,
   restore the server's `answered` position and question order, discard malformed
   local state safely, and never persist answer keys or private grading data.

5. Interruption and deadline handling is deterministic: a refresh near expiry,
   a failed answer, a server `CONFLICT`, a `SUBMITTED` result, and an `EXPIRED`
   result each produce an explicit actionable UI state. The UI must not reopen a
   finalized session, accept an answer after expiry, or show a success state for a
   failed request. Repeated submit/result retrieval is safe and does not create
   duplicate browser side effects.

6. Final success renders only safe aggregate result fields approved by the API
   contract: mode, total, answered, score when present, timestamps, and a clear
   next action. Active state never renders score or correctness. Error messages
   are Vietnamese, actionable, and never expose API/provider/database details.

7. Implement explicit accessible loading, empty/insufficient-catalogue, request
   error with retry, setup success, answer pending, active, expired, submitted,
   and final error states. Use semantic live regions without an ambiguous global
   `role="alert"` selector that collides with the Next route announcer.

8. Follow `docs/09_UI_DESIGN_SYSTEM.md`: warm editorial canvas with approved
   green/amber tokens, readable Vietnamese copy and diacritics, 360px-first
   responsive layout, no horizontal overflow, visible focus, reduced-motion
   safety, no arbitrary colors/gradients/emoji, and no generic purple SaaS
   styling. Reuse shared API, button, form, and layout primitives before adding
   new ones.

9. Add deterministic unit/component and browser coverage for MINI/HALF setup,
   strict response parsing, server-derived countdown/progress, start/answer/
   submit/result request mapping, no-skip behavior, duplicate-request prevention,
   refresh/resume, malformed local state, network retry, conflict/expiry,
   finalized-result rendering, recursive forbidden-field absence, keyboard
   access, 360px layout, and no serious accessibility violations. Browser tests
   mock the API boundary and require no credentials, provider, network, or shared
   database.

10. Update the approved user-flow, frontend, API, UI, and test strategy
    documents with the `/toeic/test` route, interruption/resume state machine,
    server-clock invariant, safe projection, and verification evidence. Do not
    modify backend implementation or introduce a second timed-test contract.

## Technical guardrails

- Reuse `requestLearnerApi`/`readSession` patterns from `apps/web/src/shared/api`
  and the existing TOEIC practice client-session conventions. Do not scatter raw
  `fetch` calls or put business logic in the route file.
- Keep route composition in `apps/web/src/app/toeic/test/**`; orchestration and
  state belong below the route in the timed-test widget/feature/entity layers.
- Use explicit safe TypeScript schemas/types for API responses. Unknown or
  malformed payloads become a retryable sanitized error, never a partial success.
- Keep session identity owner-neutral in the browser: the API derives ownership
  from the verified principal. Do not add user IDs, role fields, deadlines, or
  correctness to local storage or request bodies.
- Do not modify Prisma, NestJS, generated output, credentials, dependencies, or
  the backend port in this story. EP2-ST007 is the sole timed-test backend
  authority; EP2-ST009 owns analysis and EP2-ST010 owns remediation.
- Preserve ports `3005` for API and `4173` for web in test/config references.

## Verification commands

- `pnpm --filter api exec prisma validate --schema prisma/schema.prisma`
- `pnpm --filter api exec jest --runInBand src/modules/toeic`
- `pnpm --filter api test:e2e -- --runInBand`
- `node tests/unit/toeic-timed-test.unit.mjs`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm format:check`
- `pnpm planning:traceability`
- `node scripts/story-doctor.mjs stories/in-progress/EP2-ST008-toeic-timed-test-ui-and-interruption-handling.md`
- `pnpm story:verify stories/in-progress/EP2-ST008-toeic-timed-test-ui-and-interruption-handling.md`
- `pnpm e2e`
- `git diff --check`

## Risk and review

Risk is high because this learner-facing UI handles assessment progress,
server-owned timing, interruption recovery, and answer secrecy. Use full
planning, build, review, targeted browser coverage, API checks, and all project
quality gates. Do not use the fast path or merge on partial checks.

## Dependency and lifecycle notes

EP2-ST007 is done and owns the timed-test API, policy, persistence, server clock,
safe projections, and race semantics. Do not recreate those rules in the web
client. Keep EP2-ST009 through EP2-ST012 in backlog until their dependencies are
complete; do not create competing Phase 2 stories while this dependency chain is
active.

## Completion evidence requirements

Before moving to review, record the actual planning/build/review outcomes, exact
test counts, browser viewport evidence, and any deferred risk in this story. A
timeout, missing command, or flaky browser run must be recorded as not verified,
never treated as pass.



## Implementation evidence (2026-08-06)

- The first bounded build attempt is preserved in commit `bda4d1a` with status
  `blocked` because it stopped after the core UI and did not provide the required
  coverage. The same story branch was reactivated; no recovery story was created.
- The completed implementation started at `d619202`; the bounded retry and
  coverage fixes are being finalized on this same story branch.
- Passed: web typecheck, web lint, web production build, the focused Playwright
  suite (10 tests, including the 360px viewport overflow assertion), 5 deterministic
  contract/persistence unit checks, the timed-test API E2E suite (12 tests),
  story verification, story doctor, formatting, planning traceability, and
  `git diff --check`.
- Final read-only review passed with no P0/P1 findings. The reviewer noted only
  optional duplicate-pending-request coverage as P2; existing mojibake in the
  repository is outside this story's diff and scope.
- Final browser gate: full Playwright suite passed, 62/62 tests.
- Final project gates: `pnpm lint`, `pnpm typecheck`, and `pnpm build` passed.
  `pnpm test` ran 52 suites / 380 tests; 51 suites and 379 tests passed, with
  one pre-existing EP2-ST007 repository source-string assertion failing because
  its expected indentation does not match the committed formatted source. The
  failing API source and test are forbidden by this story and were not changed.
- An existing EP2-ST007 repository-boundary source assertion fails in the API unit
  suite because its expected indentation no longer matches the committed source.
  That API source and test are outside this story's allowed implementation scope;
  neither was changed here. This remains an out-of-scope risk for the project-wide
  gate and is not evidence of a timed-test UI defect.

