---
id: EP2-ST005
title: TOEIC Parts 5-7 Reading Practice Session API
status: done
type: backend
priority: high
phase: phase-2-toeic-listening-reading
depends_on:
  - EP2-ST002
  - EP2-ST003
allowed_paths:
  - apps/api/src/modules/toeic/**
  - apps/api/prisma/schema.prisma
  - apps/api/prisma/migrations/20260806230000_toeic_reading_practice/**
  - apps/api/test/**
  - docs/06_BACKEND_ARCHITECTURE.md
  - docs/07_DATABASE_DESIGN.md
  - docs/08_API_CONTRACT.md
  - docs/10_TEST_STRATEGY.md
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

# Story: TOEIC Parts 5-7 Reading Practice Session API

## Goal

Let an authenticated learner start and finish a safe TOEIC Reading practice
session for Parts 5-7 using only governed, published, free practice content. The
session must be owner-scoped, retry-safe, server-graded, and unable to reveal
answer keys before submission.

## Scope

Implement the reading-specific session boundary under the existing NestJS TOEIC
module. Reuse the shared TOEIC eligibility policy, authentication guard,
correlation/error envelope, and safe/private projection conventions established by
EP2-ST004. Add additive reading session/answer persistence because a reading
session must not be able to consume or mutate a listening session.

Support Parts 5, 6, and 7 as governed question versions. Preserve the exact
selected version IDs and existing question ordering; `stimulusGroup` may be
returned as a safe grouping field for Parts 6-7 when present, but grouping,
timers, and passage assembly must not introduce a new client-side taxonomy.

Do not implement timed tests, mini/half tests, scoring analytics, weakness
analysis, Error Notebook/remediation effects, UI, media/provider integration,
content import/review/publish, or Phase 3 behavior.

## Acceptance Criteria

- Add authenticated endpoints under `/api/v1/toeic/practice/reading` for starting
  a session, answering one selected question, submitting the session, and reading
  the owner-scoped result. Use strict DTO allowlisting and stable correlation/error
  envelopes.
- Session start accepts an actor-bound `clientSessionId`, an optional single
  `PART_5`, `PART_6`, or `PART_7` filter, and a bounded question count. The server
  selects only reviewed, published, approved, unexpired versions with `PRACTICE`
  scope and `FREE` access, keeps one newest eligible version per canonical
  `questionId`, and returns safe reading fields only.
- A repeated exact start request replays the owner’s existing session. Reusing the
  same owner/client session ID with a different part or count conflicts. Database
  uniqueness plus recovery after a unique-key race prevent duplicate sessions.
- Each session stores immutable selected version IDs and server timestamps. It
  cannot be read, answered, submitted, or inspected by another application user;
  unknown and cross-owner IDs return the same sanitized not-found behavior.
- Answer submission validates owner, session state, selected-version membership,
  current governed eligibility, and option membership on the backend. At most one
  answer is persisted for each session/question; an identical retry replays and a
  different retry cannot overwrite the first answer.
- Before submit, answer responses contain no `correctAnswer`, `isCorrect`, score,
  answer key, source, license, review, or publication metadata. Correctness is
  computed only inside the backend grading path.
- Submit requires one persisted answer for every selected version, atomically
  transitions `ACTIVE` to `SUBMITTED` with a server timestamp, and uses the
  server-computed aggregate score. Repeated submit returns the stored final result
  without awarding XP/streak or writing Error Notebook/remediation data.
- A final result may return aggregate `score`, `total`, `answered`, and safe session
  metadata, but never answer keys, correctness flags, source/provenance, or
  governance fields. Active result reads return progress without a score.
- Repository operations use explicit scalar/answer selects. Safe question/session
  projections and private grading projections are separate; no broad include may
  cross the learner transport boundary. Controllers remain transport-only,
  services own rules, and Prisma access stays in the repository.
- Add an additive Prisma migration for reading sessions and answers. Preserve
  unique `(userId, clientSessionId)` and `(sessionId, questionId)` constraints,
  owner/status/session indexes, and cascading ownership cleanup without a
  destructive migration.
- Add deterministic service, repository, and API E2E tests for authentication,
  strict DTO rejection, Parts 5-7 selection and canonical deduplication, empty
  catalogue, exact replay/conflict, unique-key race recovery, owner isolation,
  invalid question/option, duplicate answer retry, answer/submit race protection,
  incomplete submit, repeated submit, active/final result reads, repository
  failure mapping, and recursive forbidden-field assertions. Tests require no
  credentials, network, provider, or shared database.
- Update the approved backend, database, API contract, and test-strategy
  documents with the reading routes, state transitions, ownership/retry rules,
  safe/private projections, shared eligibility policy, migration, and evidence.

## Technical Requirements

- Use `AuthenticationGuard`, `AuthenticatedRequest`, and `ApplicationPrincipal`.
  Derive `userId` only from `request.principal.applicationUserId`; never accept an
  owner ID from a DTO, query, or URL.
- Extend and reuse `toeic-eligibility.policy.ts` for Parts 5-7. Do not create a
  second copy of the reviewed/published/license/validity/practice/free predicate.
  The same server-owned policy must remain the source of truth for question-bank
  and practice selection.
- Snapshot exact `ToeicQuestionVersion.id` values, not canonical IDs or mutable
  question content. If a selected version is no longer eligible during answer
  grading, fail closed with a sanitized error; never silently substitute another
  version.
- Use separate reading persistence models or an explicitly typed shared repository
  abstraction. Do not mix reading rows with `ToeicPracticeSession` listening rows
  without a migration-backed state invariant.
- Use database uniqueness and a transaction/row-lock or equivalent active-state
  guard before answer insertion so an answer cannot be inserted after a concurrent
  submit wins. Use compare-and-set for `ACTIVE` to `SUBMITTED`.
- Use explicit Prisma selects and keep `correctAnswer` private. Do not edit or
  commit generated Prisma client files; validate the schema and rely on the normal
  deployment generation step.
- Map unique, closed-session, incomplete, not-found, and repository failures to the
  existing sanitized TOEIC error envelope. Never return database or provider error
  text.

## Expected Persistence Shape

Add `ToeicReadingPracticeSession` with an application user owner, actor-bound
`clientSessionId`, optional reading part, immutable selected version-ID array,
`ACTIVE`/`SUBMITTED` state, total, nullable score, and server timestamps. Add
`ToeicReadingPracticeAnswer` with session relation, selected option, server-owned
correctness, answer timestamp, unique `(sessionId, questionId)`, and session index.
Add the unique owner/client index and owner/status index to the session model. The
answer table remains backend-private and is never directly serialized.

## Expected Routes and Safe Shapes

- `POST /api/v1/toeic/practice/reading/sessions` → `{ session, questions,
replayed }`; questions contain version identity, canonical identity, part,
  question type, difficulty, topic/stimulus grouping, prompt, options, media
  reference, and explanation only when already part of the approved learner-safe
  projection.
- `POST /api/v1/toeic/practice/reading/sessions/:sessionId/answers` → acknowledgement
  and answered/total progress only.
- `POST /api/v1/toeic/practice/reading/sessions/:sessionId/submit` → final safe
  aggregate result.
- `GET /api/v1/toeic/practice/reading/sessions/:sessionId/result` → active progress
  or final safe result, always owner-scoped.

The exact response envelope and correlation metadata must match the existing TOEIC
controller conventions. No route returns answer rows or governance metadata.

## Verification Commands

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
- `node scripts/story-doctor.mjs stories/in-progress/EP2-ST005-toeic-reading-practice-session-api.md`
- `pnpm story:verify stories/in-progress/EP2-ST005-toeic-reading-practice-session-api.md`
- `pnpm e2e`

## Risk and Review

Risk is high: this story controls TOEIC answer secrecy, learner-owned assessment
data, server grading, retry/concurrency behavior, and additive persistence. Full
planning/build/review and all quality gates are mandatory. Do not use the fast
path or merge on partial tests.

## Dependency and Lifecycle Notes

`EP2-ST002` provides the governed learner-safe question boundary and `EP2-ST003`
provides the approved import/review/publish source policy. `EP2-ST004` establishes
the listening-session projection, lifecycle, and active-answer locking patterns;
reuse those patterns without changing listening behavior. Keep EP2-ST006 and
later stories in backlog until this story is done; do not create competing ready
stories while this dependency chain is active.

## Harness Evidence

- Planning harness completed with the approved scope and verification plan.
- The first build harness response was blocked by generated-code/type errors;
  the implementation was repaired within the story scope and the final quality
  gates below passed.
- Review harness passed with no P0 or P1 findings.
- Final verification: Prisma validate; TOEIC unit tests (9 suites, 57 tests);
  API E2E (11 suites, 70 tests); repository-wide `pnpm check`; `pnpm
format:check`; planning traceability; story doctor/verification; `git diff
--check`; and browser E2E (46 tests passed).
