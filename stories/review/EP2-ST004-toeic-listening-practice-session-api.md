---
id: EP2-ST004
title: TOEIC Parts 1-4 Listening Practice Session API
status: review
type: backend
priority: high
phase: phase-2-toeic-listening-reading
depends_on:
  - EP2-ST002
allowed_paths:
  - apps/api/src/modules/toeic/**
  - apps/api/src/app.module.ts
  - apps/api/prisma/schema.prisma
  - apps/api/prisma/migrations/20260806220000_toeic_listening_practice/**
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

# Story: TOEIC Parts 1-4 Listening Practice Session API

## Goal

Let an authenticated learner start and finish a safe TOEIC Listening practice
session for Parts 1-4 using only published, free, practice-eligible question
versions. The session must be owner-scoped, retry-safe, server-graded, and unable
to reveal answer keys before submission.

## Scope

Implement the TOEIC-specific session boundary under the existing NestJS TOEIC
module. Add additive persistence for the session and answer lifecycle because the
generic daily-practice session has a different daily uniqueness rule and cannot
represent TOEIC part selection safely. Reuse the existing authentication,
correlation, Prisma, question governance, and safe projection conventions.

Do not implement Parts 5-7, mini/half tests, server timers, scoring analytics,
Error Notebook remediation, vocabulary/grammar packs, media storage/provider
integration, UI, or Phase 3 listening/shadowing behavior.

## Acceptance Criteria

- Add authenticated endpoints under `/api/v1/toeic/practice/listening` for
  starting a session, answering a selected question, submitting the session, and
  reading the owner-scoped result. Use strict DTO allowlisting and stable
  correlation/error envelopes.
- Session start accepts an actor-bound `clientSessionId`, an optional single
  `PART_1`-`PART_4` filter, and a bounded question count. The server selects only
  eligible `REVIEWED`/`PUBLISHED`/`APPROVED`/unexpired versions with `PRACTICE`
  scope and `FREE` access, and returns safe question fields only.
- A repeated exact start request replays the owner’s existing session. The same
  client session ID with a different part/count conflicts. A race cannot create a
  second session for the same owner/client identity.
- Each session stores its immutable selected question IDs and server timestamps.
  It cannot be read, answered, submitted, or inspected by another application
  user. Unknown sessions and cross-owner IDs return a sanitized safe response.
- Answer submission validates session ownership/state, membership in the selected
  question set, and option membership on the backend. It persists at most one
  answer per session/question; retries cannot overwrite the first answer.
- Before submit, answer responses contain no `correctAnswer`, `isCorrect`, score,
  answer key, source, license, or review metadata. The server owns grading inputs.
- Submit requires every selected question to have one persisted answer, is an
  idempotent compare-and-set transition from `ACTIVE` to `SUBMITTED`, and uses
  the server clock. Repeated submit returns the same finalized aggregate result
  without awarding progress twice.
- A finalized result may return aggregate score/total and answered progress, but
  never exposes answer keys or governance fields. No XP, streak, Error Notebook,
  or remediation record is created in this story; later stories own those effects.
- Repository queries use explicit safe and private selects. Correct answers are
  read only inside the backend grading path and never cross HTTP serialization.
  Controllers remain transport-only; business rules stay in services and Prisma
  access stays in repositories.
- Add an additive Prisma migration and update the database design without
  destructive changes. The migration must preserve owner/session/question answer
  uniqueness and indexes for owner status and session lookup.
- Add deterministic service/repository/API tests for auth, strict DTO rejection,
  eligible Part 1-4 selection, empty catalogue, exact replay/conflict, race
  protection, ownership, invalid question/option, duplicate answer retry,
  incomplete submit, repeated submit, no pre-submit answer leakage, finalized
  safe result, and repository failure mapping. Tests require no credentials,
  network, or shared database.
- Document routes, session state transitions, persistence constraints, safe/private
  projections, and test evidence in the approved architecture/API/database/test
  documents.

## Technical Requirements

- Use `AuthenticationGuard`, `AuthenticatedRequest`, `ApplicationPrincipal`, and
  the existing correlation helper. Derive `userId` only from the authenticated
  principal; never accept owner IDs from a DTO or URL.
- Use the existing `ToeicQuestionVersion` eligibility policy as the single source
  of truth. Do not duplicate client-side taxonomy or hard-code answer data in the
  controller/service.
- Keep the selected question snapshot stable for the session. A later content
  publication or retirement must not silently replace `questionIds` in an active
  session; answer grading must resolve the governed version selected at start or
  fail closed if it is no longer eligible.
- Use explicit Prisma selects. A private grading projection may include
  `correctAnswer` only inside the repository/service boundary; the safe session
  projection must exclude it recursively.
- Use database uniqueness and compare-and-set as final race protection. Do not
  rely only on preflight reads. Map Prisma errors to sanitized stable codes.
- Update `docs/07_DATABASE_DESIGN.md` when changing `schema.prisma`. Do not run
  destructive migration commands or edit generated Prisma files.

## Expected Persistence Shape

Add an additive `ToeicPracticeSession` model with owner, actor-bound client
session ID, optional listening part, immutable question ID array, `ACTIVE`/
`SUBMITTED` state, total, aggregate score, and server timestamps. Add
`ToeicPracticeAnswer` with owner-independent session relation, selected option,
server-computed correctness, answer timestamp, and unique `(sessionId, questionId)`.
Use a unique `(userId, clientSessionId)` and owner/status/session indexes. Keep
answer rows private to the backend result path.

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
- `node scripts/story-doctor.mjs stories/review/EP2-ST004-toeic-listening-practice-session-api.md`
- `pnpm story:verify stories/review/EP2-ST004-toeic-listening-practice-session-api.md`
- `pnpm e2e`

## Risk and Review

Risk is high: this story controls answer secrecy, learner-owned assessment data,
server grading, and additive persistence. Full planning/build/review and all
quality gates are mandatory. Do not use the fast path or merge on partial tests.

## Dependency and Lifecycle Notes

`EP2-ST002` supplies the governed learner-safe question boundary. `EP2-ST003`
supplies the import/review/publish workflow and source policy. Keep EP2-ST005 and
later stories in backlog until this story is done; do not create competing ready
stories while this dependency chain is active.

## Harness Evidence

- Planning harness: completed after aligning the additive migration timestamp after
  the TOEIC governance migration.
- Build harness: completed; implementation was hardened in-scope for explicit
  projections, canonical-version selection, and active-session answer locking.
- Review harness: pass with no P0/P1 findings.

