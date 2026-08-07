# AI Request: EP2-ST010 Error Notebook ownership model for TOEIC sessions

Date: 2026-08-06
Story: EP2-ST010
Status: awaiting owner decision

## Decision required

Approve an additive data-model change that lets the existing learner-private
Error Notebook domain reference a finalized TOEIC timed session without
reusing a `PracticeSession` row or weakening the existing foreign key.

## Why this is blocked

The current `ErrorNotebookEntry` model has a required `sessionId` relation to
`PracticeSession` and a uniqueness constraint on `(sessionId, questionId)`.
EP2-ST007 deliberately stores TOEIC attempts in the separate
`ToeicTimedTestSession` model because timing, answer ownership, snapshots, and
finalization semantics differ from daily practice. EP2-ST010 cannot safely
persist TOEIC errors into the existing table without either violating the
foreign key, creating synthetic practice data, or losing source ownership.

## Impact and risk

- Without a decision, finalized TOEIC attempts cannot create durable,
  owner-scoped Error Notebook entries or trustworthy remediation links.
- A wrong shortcut could misattribute errors, duplicate progress, expose another
  learner's private answer context, or make future cleanup impossible.
- The change affects Prisma schema, an additive migration, repository selects,
  API contracts, and learner error-notebook queries. It must not be applied to
  shared/remote infrastructure automatically.
- No paid provider, production credential, deployment, or destructive operation
  is required, but this is a shared data-contract decision.

## Options

1. Recommended: generalize `ErrorNotebookEntry` with an explicit source kind
   and nullable owner-scoped references for `PracticeSession` and
   `ToeicTimedTestSession`, preserving existing practice rows and adding a
   separate uniqueness rule for TOEIC session/question. Update the schema,
   additive migration, repository projection, and API/UI contracts together.
2. Create a separate `ToeicErrorNotebookEntry` model and duplicate notebook
   read/scheduling logic. This reduces migration coupling but violates the
   shared Error Notebook boundary and creates two remediation systems.
3. Do not persist TOEIC errors; expose only transient analysis labels. This is
   safe for data integrity but fails FR-009/FR-015 and the approved UF-006/UF-008
   flow.

## Recommendation

Approve option 1, with an explicit source discriminator, nullable relations,
owner-scoped indexes/uniqueness, and a migration rollback note. Require tests
for existing PracticeSession behavior, TOEIC ownership/isolation, repeated
finalization, duplicate capture, and no answer-key leakage.

## How work continues after approval

1. Record the owner decision in the decision log and update database design.
2. Implement the additive Prisma schema/migration and validate locally only.
3. Extend the existing backend repository/service and private learner API.
4. Capture only incorrect finalized TOEIC answers once, idempotently, then
   expose safe remediation links without returning answer keys to the learner.
5. Add frontend Error Notebook/TOEIC result states and run the full quality
   gates plus read-only review before merging to `dev`.

## Technical evidence

- `apps/api/prisma/schema.prisma` defines `ErrorNotebookEntry.sessionId` as a
  required relation to `PracticeSession`.
- `ErrorNotebookEntry` is currently created by
  `apps/api/src/modules/practice/prisma-practice.repository.ts` during daily
  practice answer persistence.
- `ToeicTimedTestSession` is a separate timed-test persistence boundary with
  immutable question IDs, server deadline, answer rows, and exactly-once
  finalization.
- EP2-ST009 has already passed and intentionally does not create Error Notebook
  rows; EP2-ST010 owns this integration.
