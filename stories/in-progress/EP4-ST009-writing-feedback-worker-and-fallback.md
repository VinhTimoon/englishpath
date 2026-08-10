---
id: EP4-ST009
title: Writing Feedback Worker And Fallback
status: in-progress
type: backend
priority: high
phase: phase-4-toeic-speaking-writing-and-four-skills
depends_on:
  - EP4-ST005
  - EP4-ST007
allowed_paths:
  - apps/api/src/modules/toeic/**
  - apps/api/src/modules/ai-gateway/**
  - apps/api/test/toeic-writing.e2e-spec.ts
  - apps/api/src/modules/toeic/toeic-writing-feedback.service.spec.ts
  - docs/04_SYSTEM_ARCHITECTURE.md
  - docs/10_TEST_STRATEGY.md
  - _bmad-output/implementation-artifacts/sprint-status.yaml
  - _bmad-output/planning-artifacts/story-map.md
  - stories/**
forbidden_paths:
  - apps/api/prisma/migrations/**
  - apps/api/prisma/schema.prisma
  - apps/web/**
  - apps/api/.env*
  - package.json
  - pnpm-lock.yaml
  - .github/**
  - main
requires_human_approval: false
max_fix_rounds: 2
risk: high
delivery_mode: full
---

# Story: Writing Feedback Worker And Fallback

## Goal

Let an authenticated learner request bounded advisory Writing feedback only
after an owner-scoped session is finalized, using the approved provider-neutral
gateway and its local/no-op fallback without exposing raw submission text,
provider details, credentials, rubric internals, or official scores.

## Scope

Add a server-owned Writing feedback boundary in the existing TOEIC module. The
service loads the learner's finalized submission through the existing
owner-scoped repository and sends the server-owned task ID and submitted text
to the existing AI feedback gateway. Return only the gateway's safe advisory
projection. No asynchronous queue, new persistence model, provider activation,
official scoring, Speaking implementation, or frontend is part of this story.

## API Contract

- POST `/api/v1/toeic/writing/sessions/:sessionId/feedback`
- Authentication and repository ownership are mandatory.
- `Idempotency-Key` and correlation handling reuse the existing gateway
  contract.
- Active, cancelled, missing, or submission-less sessions are not evaluated.
- Response contains only gateway-safe outcome, advisory feedback, policy/prompt
  version, skill/feature and quota projection; raw submission/provider/rubric/
  credential/official score fields never leave the backend.

## Acceptance Criteria

- A finalized owner session can request advisory Writing feedback through the
  existing gateway.
- A learner cannot request or receive feedback for another learner's session.
- Active/cancelled/incomplete sessions fail closed with an actionable safe
  error and do not call the gateway.
- Local/no-op or provider-unavailable gateway results remain bounded and safe;
  unavailable feedback is not converted into a score or fabricated rubric.
- Exact idempotent retries replay the gateway result; changed payloads remain
  gateway conflicts.
- Gateway quota, policy, prompt version, cost log, and adapter boundaries are
  reused rather than duplicated.
- Unit and API E2E coverage proves ownership, lifecycle gating, safe redaction,
  fallback, and idempotent replay.
- No Prisma schema, migration, environment, provider credential, or frontend
  change is introduced.

## Implementation Guardrails

- Keep controller logic thin; place lifecycle and ownership gating in a
  `ToeicWritingFeedbackService`.
- Inject the existing `AiFeedbackGatewayService`; do not call an adapter or
  provider directly.
- Use the existing Writing repository `findSession(userId, sessionId)` so the
  raw response remains backend-internal and owner-scoped.
- The response projection must be the gateway's safe response; never echo the
  submitted text.
- Treat `FINALIZED` plus a non-null submission as the only eligible state.

## Tasks/Subtasks

- [ ] Inspect existing Writing repository, TOEIC controller/module, gateway
  contract, exception mapping, and E2E conventions.
- [ ] Add the owner-scoped Writing feedback service and thin endpoint.
- [ ] Export/reuse the approved gateway service without adding provider wiring.
- [ ] Add unit and API E2E coverage for lifecycle, ownership, fallback,
  redaction, and idempotency.
- [ ] Run full high-risk quality gates and record evidence.

## Verification

- node scripts/story-doctor.mjs stories/ready/EP4-ST009-writing-feedback-worker-and-fallback.md
- pnpm story:verify stories/in-progress/EP4-ST009-writing-feedback-worker-and-fallback.md
- pnpm --filter api lint
- pnpm --filter api typecheck
- pnpm --filter api test -- --runInBand
- pnpm --filter api test:e2e
- pnpm lint
- pnpm typecheck
- pnpm test
- pnpm build
- pnpm e2e
- git diff --check

## Definition of Done

The finalized Writing feedback boundary is authenticated, owner-scoped,
server-owned, gateway-backed, safe on fallback and retries, fully tested, and
merged to `dev` with no schema/provider/frontend changes.

## Dev Agent Record

### Implementation Plan

Pending implementation.

### Completion Notes

Pending implementation and verification.

### File List

Pending implementation.

### Change Log

- 2026-08-10: Created as the next dependency-ready Phase 4 backend slice.
