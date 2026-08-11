---
id: EP4-ST005
title: TOEIC Writing Task and Submission API
status: done
type: backend
priority: high
phase: phase-4-toeic-speaking-writing-and-four-skills
depends_on:
  - EP4-ST001
allowed_paths:
  - apps/api/src/modules/toeic/**
  - apps/api/src/modules/access/**
  - apps/api/test/**
  - apps/api/prisma/schema.prisma
  - apps/api/prisma/migrations/**
  - apps/api/src/generated/prisma/**
  - docs/07_DATABASE_DESIGN.md
  - docs/08_API_CONTRACT.md
  - docs/10_TEST_STRATEGY.md
  - docs/11_SECURITY_PLAN.md
  - stories/**
  - _bmad-output/implementation-artifacts/sprint-status.yaml
  - _bmad-output/planning-artifacts/story-map.md
forbidden_paths:
  - apps/api/.env
  - apps/api/src/modules/auth/**
  - apps/api/src/modules/ai-gateway/**
  - apps/api/src/modules/library/**
  - apps/api/src/modules/practice/**
  - apps/web/**
  - package.json
  - pnpm-lock.yaml
  - .github/**
  - main
requires_human_approval: false
max_fix_rounds: 2
risk: high
delivery_mode: full
---

# Story: TOEIC Writing Task and Submission API

## Goal

Give an authenticated learner a safe, owner-scoped Writing task start and
submission journey using the approved EP4-ST001 task contract, with durable,
idempotent submission state and no official score or AI feedback.

## Scope

Implement the Writing-only API vertical slice: select a server-approved
published task, start one learner-owned attempt, validate a bounded text
submission, finalize it exactly once, and return learner-safe metadata. Keep
Speaking, recording, AI feedback, official scoring, and frontend UI out of this
story. Reuse the existing access and TOEIC response-redaction conventions.

## Acceptance Criteria

- Only server-approved published Writing task versions are selectable. The API
  never accepts a client-provided prompt, task type, score, rubric, provider
  locator, or answer key.
- Start and submit are authenticated, owner-scoped, bounded, and idempotent.
  Repeating a request cannot create duplicate active/finalized attempts or
  reopen a finalized attempt; another learner cannot read or mutate it.
- Submission validation enforces the task version's minimum/maximum word
  bounds and rejects malformed, oversized, or post-finalization input without
  persisting partial state.
- Learner responses expose only approved task prompt metadata, attempt status,
  submission timestamps/length, and safe completion metadata. No official
  TOEIC score, hidden rubric weights, answer key, raw claims, provider data, or
  another learner's data is returned.
- Persistence changes, if needed, are additive and owner-scoped, documented in
  the database/API/security artifacts, and use the existing Prisma service and
  repository boundary. No destructive migration or credential/provider change
  is allowed.
- Unit and API E2E coverage proves task publication gating, bounds, ownership,
  duplicate/retry semantics, finalization immutability, redaction, and
  regression of existing TOEIC practice/timed-test/auth behavior.
- If an approved Writing catalogue/source, persistence boundary, legal/product
  rule, or forbidden architecture change is missing, create an AI request and
  block this same story; do not invent content or bypass the boundary.

## Verification

- `node scripts/story-doctor.mjs stories/ready/EP4-ST005-toeic-writing-task-submission-api.md`
- `pnpm story:verify stories/in-progress/EP4-ST005-toeic-writing-task-submission-api.md`
- `pnpm --filter api test -- --runInBand "toeic|access"`
- `pnpm --filter api test:e2e -- toeic-writing.e2e-spec.ts toeic-practice.e2e-spec.ts toeic-timed-test.e2e-spec.ts`
- `pnpm prisma:validate`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm e2e`
- `git diff --check`

## Implementation Guardrails

- Keep controller -> service -> repository layering and use the application
  principal for every ownership decision.
- Use the EP4-ST001 task version and learner projection contracts; do not create
  a second Writing taxonomy or return advisory rubric internals.
- Do not accept client task content, official scoring, AI/provider calls,
  recording storage, raw tokens/claims, or hidden source locators.
- Never run a destructive migration. If the approved source or persistence
  boundary is unavailable, record the required AI request and stop this story.

## Definition of Done

Writing task start/submission is server-authoritative, owner-safe, bounded,
idempotent, redacted, persisted through the approved boundary, regression-tested,
documented, and ready for later Writing UI/feedback stories.

## Story Creation Notes

- EP4-ST001 is done and provides the task/rubric model contract.
- EP4-ST002 remains blocked by its separate Speaking persistence/source AI
  request; this story is independent and does not resume or replace it.

## Blocked Report

EP4-ST001 provides Writing task versions only as immutable in-memory contracts.
There is no approved published Writing catalogue/source or durable persistence
boundary for learner-owned attempts, submissions, and idempotency. Implementing
this story would require inventing content, bypassing publication governance, or
creating an unapproved persistence boundary, violating this story's guardrails.

## AI Request

Confirm the approved Writing task catalogue/source and durable persistence
boundary, including the publication predicate, deterministic word-count rule,
owner/idempotency uniqueness constraints, and allowed Prisma repository/generated
client boundary. EP4-ST005 remains blocked until that decision is recorded.

The owner-approved persistence/source boundary decision is recorded in this
story; the related request has been resolved and archived.

## Owner Decision / Recovery Record

- Owner approved Option 1 on 2026-08-10 and authorized resuming this same
  story; no recovery story is created.
- The task source boundary is an EnglishPath-owned, credential-free reviewed
  fixture/catalogue. Supplied Drive sources remain read-only references; no
  Drive original is edited or deleted.
- Published means the existing task contract has `publicationState: PUBLISHED`
  and the Writing task/version is served only by the catalogue.
- Word count is deterministic over Unicode letter/number tokens, including
  apostrophe or hyphen joins; raw text is bounded and owner-scoped.
- The additive Prisma boundary stores the submitted text for the owning learner
  only, with unique owner/idempotency keys and immutable finalized sessions.

## Implementation Tasks

- [x] Add additive Writing task/session/submission persistence and migration.
- [x] Add owner-scoped repository and service with publication, Unicode bounds,
  lifecycle, and idempotency policy.
- [x] Add strict DTO/controller routes and safe projections.
- [x] Add unit and API E2E regression coverage.
- [x] Update database/API/security/test documentation and run full gates.

## Implementation Record

- Added a published EnglishPath-owned Writing fixture
  ep-writing-sentence-001 behind a catalogue boundary; no Drive original or
  external provider is accessed or changed.
- Added additive ToeicWritingSession and ToeicWritingSubmission models,
  owner/idempotency indexes, and transactional ACTIVE-to-FINALIZED submission
  persistence.
- Added protected start, read, and submit routes with strict text bounds,
  deterministic Unicode word counting, exact replay/conflict handling,
  publication gating, owner scoping, and learner-safe redaction.

## Verification Evidence

- Story doctor and story verification passed.
- Prisma validation and generated-client TypeScript validation passed.
- Focused unit: 1 suite / 3 tests passed.
- Focused API E2E: 1 suite / 2 tests passed.
- TOEIC/access regression: 22 suites / 154 tests passed.
- TOEIC practice/writing/timed-test E2E: 2 suites / 21 tests passed.
- Full lint, typecheck, test (67 suites / 476 tests), and build passed.
- Full browser E2E: 87/87 passed on port 4173.
- git diff --check passed.

## High-risk Review Evidence

- Repository reads and finalization predicates include the authenticated
  application user id; no request-supplied owner field is trusted.
- The catalogue is the only task source, and the learner projection excludes
  submittedText, provider fields, rubric internals, answer keys, scores, and
  credentials.
- Finalization is an ACTIVE-only transaction with unique owner/idempotency
  constraints; changed retries return conflict and exact retries replay.
- The diff is limited to the story allowlist and additive migration/docs; no
  auth, frontend, provider, credential, or destructive migration paths changed.


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
