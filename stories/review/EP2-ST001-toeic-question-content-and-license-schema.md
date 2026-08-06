---
id: EP2-ST001
title: TOEIC L&R Question, Content, and License Schema
status: review
type: database
priority: critical
phase: phase-2-toeic-listening-reading
depends_on:
  - EP1-ST039
allowed_paths:
  - apps/api/prisma/schema.prisma
  - apps/api/prisma/migrations/20260806210000_toeic_question_governance/**
  - apps/api/src/generated/prisma/**
  - apps/api/src/toeic-question-schema.spec.ts
  - apps/api/test/**
  - docs/07_DATABASE_DESIGN.md
  - docs/10_TEST_STRATEGY.md
  - stories/**
  - _bmad-output/implementation-artifacts/sprint-status.yaml
  - _bmad-output/planning-artifacts/story-map.md
forbidden_paths:
  - apps/api/.env
  - apps/api/src/modules/**
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

# Story: TOEIC L&R Question, Content, and License Schema

## Goal

Establish an additive, versioned, server-owned persistence boundary for TOEIC
Listening and Reading questions so later API, import, practice, scoring, and
license workflows can use stable question identity without exposing answer keys or
accepting unreviewed content.

## Scope

This story owns only Prisma schema, the additive migration, generated client output,
database design documentation, and schema/invariant tests. It does not implement
question-bank HTTP endpoints, admin import actions, learner practice sessions, test
timers, scoring, UI, or external storage/provider configuration; those belong to
later Phase 2 stories.

## Acceptance Criteria

- Add an additive Prisma model for a stable `ToeicQuestion` identity and an
  immutable/versioned `ToeicQuestionVersion` content record.
- The version record distinguishes TOEIC Parts 1–7, question type, difficulty,
  topic/stimulus grouping, prompt/options, optional media reference, explanation,
  and server-owned `correctAnswer`; the schema does not create any client-facing
  projection that includes the answer.
- Persist provenance and rights evidence on each version: source identity/URL,
  checksum, source version, provenance, rights owner, license status, allowed usage
  scopes, access tier, review decision evidence, reviewer identity, and publication
  timestamps.
- Enforce stable version identity, idempotent import identity, deterministic lookup
  indexes, and lifecycle fields sufficient for later rules to allow only reviewed,
  published, non-expired content.
- Use explicit enums and constraints for Part, question type, difficulty, license,
  review, and publication state; no free-form values are used where the approved
  domain requires a closed set.
- Add only an additive migration. It must not drop, rewrite, or delete existing
  learner, CMS, vocabulary, progress, or identity data, and automation must not
  apply it to shared Supabase infrastructure.
- Update `docs/07_DATABASE_DESIGN.md` with physical model ownership, redaction and
  publication rules, indexes, migration name, and owner-approved rollback notes.
- Add deterministic schema/invariant coverage proving all seven parts are
  representable, answer/license/review fields remain server-side, and migration
  SQL contains no destructive operation.

## Technical Requirements

- Access Prisma only through the existing `PrismaService`; this story does not add
  a repository or controller.
- Keep the model compatible with Prisma 7 and the generated client output path
  already configured in `apps/api/prisma/schema.prisma`.
- Use `onDelete: Cascade` only from the version to its canonical question and use
  restrictive behavior for any future governed-content relationship; do not add a
  relation to `User` for reviewer identity in this schema story.
- Keep `correctAnswer`, review evidence, rights metadata, and source locations out
  of any future learner projection by documenting them as private fields.
- Do not seed third-party TOEIC material or claim license approval. No external
  credentials, paid services, Supabase writes, or production migration are in
  scope.

## Verification Commands

- `pnpm prisma:validate`
- `pnpm --dir apps/api exec prisma generate --schema prisma/schema.prisma`
- `pnpm --filter api exec jest --runInBand src/toeic-question-schema.spec.ts`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `git diff --check`
- `node scripts/story-doctor.mjs stories/in-progress/EP2-ST001-toeic-question-content-and-license-schema.md`
- `pnpm story:verify stories/in-progress/EP2-ST001-toeic-question-content-and-license-schema.md`

## Risk and Review

Risk is high because this changes the Prisma contract used by future answer
protection and content rights workflows. Full review and database quality gates are
required. The migration must remain local/generated evidence only until a human
approves any shared-environment application.

## Dependency and Lifecycle Notes

`EP1-ST039` is complete under the owner-approved Phase 1 beta exit. This story is
the only Phase 2 implementation story made ready; all later Phase 2 stories remain
backlog until their declared dependencies pass. If schema requirements would need a
destructive migration or an unapproved license/provider decision, stop and create a
structured AI request rather than widening this story.

## Recovery and Review Evidence

The first automated loop attempt was blocked by a harness/test-root mismatch: the
focused Jest test was created under `apps/api/test`, while this project discovers
unit tests under `apps/api/src`. The test was moved to `apps/api/src`, the story
verification command was corrected, and the historical blocked report is retained
below as lifecycle evidence. Generated-client line-ending noise was normalized
without changing generated behavior.

The trusted checks then passed: focused schema test 4/4, unit tests 39 suites/302
tests, API E2E 7 suites/48 tests, browser E2E 46/46, tool tests 59/59, Prisma
validation, lint, typecheck, build, format, traceability, and diff check. The
automated review CLI result was not counted because it evaluated stale EP1-ST063
context; manual adversarial review of this EP2-ST001 diff found no P0/P1 finding.



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
