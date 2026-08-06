---
id: EP2-ST009
title: TOEIC scoring, Part and skill weakness, and time analysis
status: done
type: vertical-slice
priority: high
phase: phase-2-toeic-listening-reading
depends_on:
  - EP2-ST007
  - EP2-ST008
allowed_paths:
  - apps/api/src/modules/toeic/**
  - apps/api/test/**
  - apps/web/src/app/toeic/test/**
  - apps/web/src/widgets/toeic-timed-test/**
  - apps/web/src/features/toeic-timed-test/**
  - apps/web/src/entities/toeic-timed-test/**
  - apps/web/src/shared/api/**
  - tests/e2e/**
  - tests/unit/**
  - docs/03_USER_FLOWS.md
  - docs/05_FRONTEND_ARCHITECTURE.md
  - docs/06_BACKEND_ARCHITECTURE.md
  - docs/08_API_CONTRACT.md
  - docs/09_UI_DESIGN_SYSTEM.md
  - docs/10_TEST_STRATEGY.md
  - docs/11_SECURITY_PLAN.md
  - docs/13_DECISION_LOG.md
  - stories/**
  - _bmad-output/implementation-artifacts/sprint-status.yaml
  - _bmad-output/planning-artifacts/story-map.md
forbidden_paths:
  - apps/api/.env
  - apps/web/.env
  - apps/api/src/generated/**
  - apps/api/prisma/schema.prisma
  - apps/api/prisma/migrations/**
  - apps/web/src/app/admin/**
  - packages/**
  - package.json
  - pnpm-lock.yaml
  - main
requires_human_approval: false
max_fix_rounds: 2
risk: high
delivery_mode: full
---

# Story: TOEIC scoring, Part and skill weakness, and time analysis

## Goal

After a server-finalized MINI or HALF attempt, give the learner an accurate,
actionable analysis of score, accuracy, Part/skill weaknesses, and time use. The
analysis must be computed from the authoritative EP2-ST007 session snapshot and
answer rows, must never expose per-question correctness or answer keys, and must
remain safe across refresh, repeated reads, and owner isolation.

This is Phase 2 `FR-015` / `UF-008` work. It does not create Error Notebook rows,
remediation packs, official score conversion, adaptive recommendations, or any
Phase 3+ feature; EP2-ST010 owns the remediation integration.

## Scope and analysis contract

Extend the existing authenticated TOEIC timed-test boundary with a read-only
analysis projection for `GET /api/v1/toeic/tests/sessions/:sessionId/analysis`.
The route must reuse the verified principal and existing timed-test service and
repository boundaries. It may read the immutable selected question versions and
private answer correctness internally, but the response is an allowlisted
aggregate only.

The server owns the definitions:

- `score`: correct answers in the finalized answer snapshot; `total` and
  `answered` come from the session, never from a client payload.
- `accuracy`: `correct / answered` as a bounded percentage, with zero when no
  answers are present.
- `skills`: exactly `LISTENING` for Parts 1-4 and `READING` for Parts 5-7,
  reporting `total`, `answered`, `correct`, and bounded `accuracy`.
- `parts`: one aggregate for every Part represented by the server-selected
  snapshot, in deterministic Part order, with the same safe counters. No
  question IDs, prompts, selected options, correctness flags, answer keys,
  source, license, review, publication, or private timing rows may appear.
- `time`: `limitSeconds` from the persisted server policy, `usedSeconds` from
  the persisted `startedAt`/`finalizedAt` boundary and clamped to the limit,
  `remainingSeconds`, and `averageSecondsPerAnswered`. The server must not use
  client timestamps or a browser timer as evidence.
- `weaknesses`: deterministic safe summaries for the lowest-accuracy
  Part/skill aggregates with stable tie-breaking. Do not label a weakness when
  its aggregate has no answered questions; do not duplicate the full `parts` or
  `skills` payload unnecessarily.

Only `SUBMITTED` or `EXPIRED` sessions may return analysis. An active session,
cross-owner ID, malformed snapshot, missing governed question, or repository
failure must use the existing sanitized TOEIC error conventions. Repeated reads
must be side-effect free and return the same finalized snapshot.

## Acceptance Criteria

1. Add the authenticated analysis endpoint through the existing TOEIC controller,
   service, and repository layers without putting aggregation rules in the
   controller. The route is owner-scoped and reuses the existing correlation and
   sanitized error envelope.

2. Compute score, accuracy, Part aggregates, Listening/Reading skill aggregates,
   deterministic weaknesses, and server-clock time analysis from the finalized
   session and its immutable question/answer snapshot. Verify that MINI and HALF
   policy totals remain server-owned and that rounding/clamping rules are
   explicitly documented and tested.

3. Keep the learner response allowlisted. The analysis response must not contain
   `correctAnswer`, `isCorrect`, `selectedOption`, per-question correctness,
   question IDs, raw answer rows, source/license/review/publication/provider
   metadata, user IDs, or client-authored score/time fields, including nested
   objects. Active session reads and the existing timed-test UI remain unchanged
   and never show analysis or score before finalization.

4. Extend `/toeic/test` final-result rendering to fetch and display the safe
   analysis with explicit loading, empty/unavailable, retryable error, and
   success states. Show score/accuracy, Part and skill summaries, the weakest
   areas, and time use in Vietnamese with approved responsive tokens. Do not
   claim official TOEIC conversion or create remediation links before EP2-ST010.

5. Preserve interruption and ownership behavior: refresh/repeated analysis is
   idempotent, an active or expired-finalization race reconciles through the
   server result, an analysis failure never replaces a valid final result with a
   false success state, and a finalized session cannot be reopened or rescored.

6. Add deterministic backend unit/repository/API E2E and browser/unit coverage
   for both modes, zero-answer expiry, mixed Parts, skill mapping, accuracy and
   rounding boundaries, deterministic tie-breaking, time clamping, repeated
   reads, active/incomplete/owner isolation, malformed/private-field rejection,
   sanitized repository failures, analysis loading/error/success UI, mobile
   layout, keyboard access, and no serious accessibility violations. Tests must
   use no credentials, provider, network, or shared database.

7. Update the approved user-flow, frontend, backend, API, UI, security, decision
   log, and test-strategy documents with the analysis projection, server-clock
   invariant, aggregate-only disclosure boundary, and actual verification
   evidence. Do not modify Prisma schema, migrations, generated output, or
   introduce a second timed-test persistence model.

## Technical guardrails

- Reuse `ToeicTimedTestService`, `ToeicTimedTestRepository`, the existing
  `privateQuestionsByIds`/safe projection boundary, `AuthenticationGuard`,
  `AuthenticatedRequest`, and `ApplicationPrincipal`.
- Controllers stay transport-only; analysis aggregation belongs in a service or
  dedicated pure analysis policy module, and database reads remain in the
  repository with explicit selects.
- Analysis is a finalized-result projection only. Never accept score, accuracy,
  elapsed time, part, skill, or weakness values from the browser.
- Keep `/toeic/test` route composition thin and preserve loading/empty/error/
  success states, 360px responsiveness, visible focus, reduced motion, approved
  colors, and the 3005 API / 4173 web ports.
- No direct provider calls, credentials, schema/migration changes, destructive
  operations, or production promotion.

## Verification commands

- `pnpm --filter api exec prisma validate --schema prisma/schema.prisma`
- `pnpm --filter api exec jest --runInBand src/modules/toeic`
- `pnpm --filter api test:e2e -- --runInBand --testPathPatterns=toeic-timed-test`
- `node tests/unit/toeic-timed-test.unit.mjs`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm format:check`
- `pnpm planning:traceability`
- `node scripts/story-doctor.mjs stories/in-progress/EP2-ST009-toeic-scoring-weakness-and-time-analysis.md`
- `pnpm story:verify stories/in-progress/EP2-ST009-toeic-scoring-weakness-and-time-analysis.md`
- `pnpm e2e`
- `git diff --check`

## Risk and review

Risk is high because this story computes learner-visible assessment results
from private correctness and server timing data. Use full planning, build,
review, backend/API tests, browser checks, and all quality gates. Do not use the
fast path or merge on partial checks.

## Dependency and lifecycle notes

EP2-ST007 owns the authoritative timed session, score, policy, and answer
snapshot. EP2-ST008 owns the timed learner surface and final-result shell. Keep
EP2-ST010 through EP2-ST012 in backlog until this story is done; do not create
competing Phase 2 stories while this dependency chain is active.

## Completion evidence requirements

Before moving to review, record actual planning/build/review outcomes, exact
backend/browser/unit counts, response disclosure checks, mobile evidence, and
any pre-existing out-of-scope gate failure. A timeout, missing command, or flaky
run must be recorded as not verified, never treated as pass.

## Implementation and verification evidence

- Planning harness: completed with Codex CLI v0.146.0 using the configured
  `gpt-5.6-sol` planning route and `.codex-plan.md`.
- Build harness: the first bounded build returned `blocked` after producing the
  core implementation because its required tests and documentation were still
  absent. The same story was completed within scope; no WIP commit was merged.
- Review harness: the first three read-only reviews returned blocked findings;
  the implementation was amended in place for sanitized malformed snapshots,
  persisted policy validation, quota validation, disclosure parsing, coverage,
  and this evidence section. A final review is required before lifecycle merge.
- Backend verification: Prisma validate passed; the TOEIC unit suite passed
  with 13 suites and 85 tests; the timed-test API E2E suite passed with 15
  tests. Repository explicit-select, HALF, zero-answer, rounding, tie-break,
  expiry-reconciliation, owner-isolation, malformed-snapshot, and sanitized
  repository-failure checks are included.
- Frontend/unit/browser verification: the deterministic timed-test unit runner
  passed 6 checks; the focused timed-test browser journey passed 12 tests,
  including 360px width, keyboard retry, unavailable analysis, refresh/repeat,
  disclosure, and axe checks. The full browser suite passed 64 tests.
- Disclosure evidence: backend E2E recursively checks the response for answer
  keys, correctness flags, selected options, question/session/user IDs, raw
  answers, and governance/provider metadata; the frontend parser rejects the
  same forbidden keys and unknown aggregate fields.
- No schema, migration, generated output, environment, credential, package,
  production, or `main` changes were made.
- Final outer-loop gates passed on 2026-08-06: `pnpm lint`, `pnpm typecheck`,
  `pnpm test` (52 suites/388 tests), `pnpm build`, `pnpm format:check`,
  `pnpm planning:traceability`, Prisma validate, story doctor, `pnpm e2e`
  (64/64), and `git diff --check`. No out-of-scope gate failure is known.


