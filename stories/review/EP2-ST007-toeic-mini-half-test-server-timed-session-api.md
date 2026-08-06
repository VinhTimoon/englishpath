---
id: EP2-ST007
title: TOEIC mini and half test assembly with server-timed session API
status: review
type: vertical-slice
priority: high
phase: phase-2-toeic-listening-reading
depends_on:
  - EP2-ST004
  - EP2-ST005
allowed_paths:
  - apps/api/src/modules/toeic/**
  - apps/api/prisma/schema.prisma
  - apps/api/prisma/migrations/20260807090000_toeic_timed_test_sessions/**
  - apps/api/test/**
  - docs/06_BACKEND_ARCHITECTURE.md
  - docs/07_DATABASE_DESIGN.md
  - docs/08_API_CONTRACT.md
  - docs/10_TEST_STRATEGY.md
  - docs/11_SECURITY_PLAN.md
  - docs/13_DECISION_LOG.md
  - stories/**
  - _bmad-output/implementation-artifacts/sprint-status.yaml
  - _bmad-output/planning-artifacts/story-map.md
forbidden_paths:
  - apps/api/.env
  - apps/api/src/generated/**
  - apps/web/**
  - packages/**
  - package.json
  - pnpm-lock.yaml
  - main
requires_human_approval: false
max_fix_rounds: 2
risk: high
delivery_mode: full
---

# Story: TOEIC mini and half test assembly with server-timed session API

## Goal

Give an authenticated learner a safe, resumable TOEIC Listening & Reading mini
or half test assembled from governed Parts 1-7 content. The server owns the
test shape, question snapshot, clock, answer persistence, expiration, scoring,
and exactly-once finalization. The story delivers the backend contract needed by
the later timed-test UI without adding UI, weakness analytics, or remediation.

## Product and policy boundary

This is Phase 2 `UF-008` / `FR-014` work. It must reuse the reviewed question
eligibility policy and the answer-secrecy boundary from EP2-ST002/004/005. A
mini or half test is a `MOCK_TEST` usage session, not an official exam and not a
full-test or Phase 5 simulation.

The test policy is server-owned and immutable at runtime. Implement one named,
tested policy for `MINI` and one for `HALF`, including total question count,
Listening/Reading composition, per-part quotas, and duration in seconds. The
client may select only the mode and an actor-bound client session ID; it may not
choose question count, parts, duration, deadline, score, or expiration behavior.
Use the smallest useful beta policy supported by the governed catalogue (20
questions/20 minutes for MINI and 50 questions/45 minutes for HALF, with a
balanced Listening/Reading split and deterministic Part quotas). Keep these
values in one server policy module so a later approved policy change is explicit
and does not become client taxonomy.

## Scope

Implement a separate timed-test persistence boundary under the existing NestJS
TOEIC module. Do not reuse a practice-session row for a timed test, because timed
tests select `MOCK_TEST` content, have a server deadline, and have distinct
finalization semantics. Add only additive schema objects and a migration; never
run a remote or destructive migration.

Expected routes under `/api/v1/toeic/tests`:

- `POST /sessions` starts or replays a test for `MINI` or `HALF`.
- `GET /sessions/:sessionId` returns the owner-scoped active snapshot/progress.
- `POST /sessions/:sessionId/answers` records one answer without correctness.
- `POST /sessions/:sessionId/submit` finalizes the session and returns a safe
  aggregate result; an expired active session is finalized by the server.
- `GET /sessions/:sessionId/result` returns active progress or the final safe
  result.

Use the existing controller correlation/error envelope and authentication guard.
Keep controllers transport-only, services responsible for test policy and state
rules, and repositories responsible for Prisma access and explicit projections.

## Acceptance Criteria

- Authenticated start accepts only a strict `{ clientSessionId, mode }` DTO,
  rejects unknown fields and invalid modes, derives `userId` only from the
  verified principal, and returns a correlated safe session plus safe questions.
- Start assembles exactly the server-policy count for the selected mode from
  reviewed, published, approved, unexpired, `PRACTICE`-compatible rights and
  `MOCK_TEST` usage content with `FREE` access. It selects all required Parts
  according to the policy, keeps the newest eligible version per canonical
  question, uses deterministic ordering, and fails closed with a sanitized
  insufficient-catalogue error when any required quota cannot be met.
- The persisted session stores the exact selected version IDs, mode, immutable
  policy version, started timestamp, server deadline, status, total, and nullable
  final score. The persisted answer table stores owner-bound session ID,
  question/version identity, selected option, server-owned correctness, and
  answered timestamp with a unique `(sessionId, questionId)` constraint.
- A repeated exact start request for the same owner and client session ID
  replays the same session and question order. A different mode or owner is a
  conflict/not-found according to the existing sanitized conventions. Database
  uniqueness plus bounded race recovery prevent duplicate sessions.
- The server validates every answer against owner, active state, selected
  question membership, current governed eligibility, and option membership.
  Answer retries are idempotent only when the selected option is identical;
  conflicting retries cannot overwrite the first answer. No pre-submit response
  contains `correctAnswer`, `isCorrect`, score, source, license, review,
  publication, or answer/provenance metadata.
- The deadline is computed from the server start time and policy duration. The
  backend rejects or deterministically finalizes late writes according to one
  documented rule; client-provided time, deadline, timer, or elapsed values are
  ignored/rejected. Refresh/replay returns the authoritative remaining-time
  projection, never a client-owned clock.
- Submit uses a transaction or equivalent active-state compare-and-set. It
  requires all selected questions answered unless the server has reached the
  deadline, then computes score only from private answer projections and
  transitions `ACTIVE` to `SUBMITTED` exactly once. Repeated submit/retrieval
  returns the persisted result without duplicate side effects.
- An expired active session is finalized exactly once with the server-owned
  timeout outcome and the answers present at the finalization boundary. A
  concurrent answer/submit/expiry race cannot insert answers after finalization,
  double-score, or reopen the session.
- Active result reads expose only session progress, deadline/remaining-time
  information derived by the server, and safe question/session metadata. Final
  results expose only aggregate score/total/answered, mode, timestamps, and
  safe per-part counts if supported; they do not expose answer keys, correctness
  per question, governance data, or private answer rows.
- Unknown, cross-owner, malformed, closed, and repository-failure cases map to
  the existing sanitized TOEIC error envelope with correlation metadata. No
  database/provider error text or identity ownership detail is returned.
- Add deterministic unit/repository/API E2E coverage for strict DTOs, both test
  policies, exact counts and Part quotas, canonical deduplication, mock-test
  eligibility, empty/insufficient catalogue, owner isolation, exact replay and
  conflict, unique-key race recovery, answer validation/retry, deadline math,
  active reads, incomplete submit, timeout finalization, duplicate submit,
  answer/submit/expiry races, safe projections, recursive forbidden-field
  assertions, and sanitized repository failures. Tests need no credentials,
  provider, network, or shared database.
- Update the approved backend, database, API, security, decision, and test
  strategy documents with the timed-test policy, additive migration, route
  contract, server-clock invariant, state transitions, race behavior, and test
  evidence. Do not edit generated Prisma output.

## Technical guardrails

- Reuse the existing `ToeicQuestionVersion` eligibility predicate and explicit
  safe/private projection pattern; do not copy a second governance policy.
- Use `AuthenticationGuard`, `AuthenticatedRequest`, and
  `ApplicationPrincipal`. Never accept an owner ID or authoritative time from a
  request body, query, or route.
- Keep the timed-test model isolated from listening and reading practice rows.
  Use additive `ToeicTimedTestSession` and `ToeicTimedTestAnswer` models (or
  equivalent names documented in the plan), owner/session indexes, cascading
  ownership cleanup, and uniqueness for owner/client and session/question.
- Use explicit Prisma selects. Private grading selects may include
  `correctAnswer`; learner projections must be separately typed and allowlisted.
- The migration must include a manual rollback note and no executable
  destructive statements. Validate the schema; do not apply the migration to a
  shared or remote database in automation.
- Keep policy values in a backend module with a policy version constant and
  tests that fail if a mode silently changes. Do not add a client-side list of
  TOEIC Parts or durations in this story.
- Do not add scoring scale conversion, Part/skill weakness analysis, Error
  Notebook writes, remediation packs, full tests, suspicious-event dashboards,
  or frontend work; those belong to EP2-ST009 through EP2-ST012.

## Verification commands

- `pnpm --filter api exec prisma validate --schema prisma/schema.prisma`
- `pnpm --filter api exec jest --runInBand src/modules/toeic`
- `pnpm --filter api test:e2e -- --runInBand`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm format:check`
- `pnpm planning:traceability`
- `git diff --check`
- `node scripts/story-doctor.mjs stories/in-progress/EP2-ST007-toeic-mini-half-test-server-timed-session-api.md`
- `pnpm story:verify stories/in-progress/EP2-ST007-toeic-mini-half-test-server-timed-session-api.md`
- `pnpm e2e`

## Risk and review

Risk is high: this story owns timed assessment integrity, answer secrecy,
learner-owned assessment data, server grading, and concurrency. Delivery mode is
full. Planning, build, full review, migration validation, API tests, project
quality gates, and browser regression are mandatory. Do not use the fast path or
merge on partial checks.

## Dependency and lifecycle notes

EP2-ST004 and EP2-ST005 provide the governed Parts 1-7 selection and safe answer
patterns. EP2-ST006 provides the learner practice catalogue but must not be
treated as a timed-test authority. Keep EP2-ST008 and later stories in backlog
until this story is done; do not create competing ready stories while this
dependency chain is active.

