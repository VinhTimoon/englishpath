---
id: EP4-ST005
title: TOEIC Writing Task and Submission API
status: blocked
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

AI request file: `notes/ai-req/2026-08-10-ep4-st005-writing-submission-persistence-boundary.md`


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
