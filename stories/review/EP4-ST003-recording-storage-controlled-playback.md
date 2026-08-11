---
id: EP4-ST003
title: Recording Storage And Controlled Playback
status: review
type: backend
priority: high
phase: phase-4-toeic-speaking-writing-and-four-skills
depends_on:
  - EP4-ST002
  - EP3-ST006
allowed_paths:
  - apps/api/src/modules/toeic/**
  - apps/api/src/modules/library/**
  - apps/api/prisma/schema.prisma
  - apps/api/prisma/migrations/**
  - apps/api/src/generated/prisma/**
  - apps/api/test/**
  - tests/e2e/**
  - docs/04_SYSTEM_ARCHITECTURE.md
  - docs/06_BACKEND_ARCHITECTURE.md
  - docs/07_DATABASE_DESIGN.md
  - docs/08_API_CONTRACT.md
  - docs/11_SECURITY_PLAN.md
  - docs/12_DEPLOYMENT_PLAN.md
  - _bmad-output/implementation-artifacts/sprint-status.yaml
  - _bmad-output/planning-artifacts/story-map.md
  - stories/**
  - notes/ai-req/**
forbidden_paths:
  - apps/api/.env*
  - production credentials
  - direct provider URLs in learner responses
  - main
requires_human_approval: true
blocked_by: notes/ai-req/2026-08-10-ep4-st003-recording-storage-controlled-playback.md
max_fix_rounds: 2
risk: high
delivery_mode: full
---

# Story: Recording Storage And Controlled Playback

## Goal

Persist approved learner Speaking recordings through a server-owned controlled
storage boundary and expose only an authenticated, owner-scoped playback
capability.

## Acceptance Criteria

- The approved storage/provider/retention contract is recorded before code.
- Upload or attachment is bounded by owner, MIME, size, duration, and lifecycle.
- Recording state and references are owner-scoped and never expose provider URLs,
  credentials, raw object keys, or long-lived tokens.
- Playback is authenticated, short-lived, revocable by state, and fail-closed.
- Local/test storage remains credential-free; production activation is separate.
- Migration, repository, API, security, and browser evidence pass.

## Tasks/Subtasks

- [x] Record the approved MIME, size, duration, retention, lifecycle, and
  playback-capability contract in the application boundary.
- [x] Add the owner-scoped recording and playback-capability persistence models,
  migration, generated client, repository, and database documentation.
- [x] Add the provider-neutral storage port and credential-free local/test
  adapter; keep production activation disabled.
- [x] Integrate Speaking finalization with recording asset creation and safe
  owner-scoped playback capability issuance/revocation.
- [x] Add DTO, controller, unit, repository, API E2E, and security regression
  coverage for limits, ownership, expiry, revocation, idempotency, and redaction.
- [x] Run full high-risk quality gates and record evidence.

## Verification

- `pnpm prisma:validate`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm e2e`
- `git diff --check`

## Approved boundary

The linked AI request was approved on 2026-08-11. This story is active only for
the credential-free application boundary and local/test adapter. Production
provider activation remains a separate human-controlled operation.

## Dev Agent Record

### Implementation Plan

- Add the approved recording policy and owner-scoped Prisma boundary.
- Keep storage provider-neutral with a credential-free local/test adapter.
- Integrate finalized Speaking submissions with recording registration and
  short-lived playback capability issuance, authorization, and revocation.
- Verify redaction, ownership, lifecycle, replay, browser boundary, and full
  repository quality gates.

### Completion Notes

- Added additive recording and playback-capability models and migration.
- Added owner-scoped repository/service/controller boundaries with mandatory
  recording integration in Speaking finalization.
- Added MIME, size, duration, retention, lifecycle, capability TTL, expiry,
  revocation, wrong-token, redaction, and idempotency coverage.
- Production provider activation, credentials, bucket/RLS, and deletion jobs
  remain intentionally human-controlled under the approved Option 1 boundary.

### File List

- `apps/api/prisma/schema.prisma` and
  `apps/api/prisma/migrations/20260811090000_toeic_speaking_recording_storage/`
- `apps/api/src/modules/toeic/toeic-recording.*`
- Speaking submission/controller/module, generated Prisma client, and API E2E
  coverage.
- `tests/e2e/toeic-recording-boundary.spec.ts`
- Approved architecture, API, security, database, deployment, story-map, and
  AI-request documentation.

### Verification Evidence

- `node scripts/run-checks.mjs` passed: Prisma validation, lint, typecheck,
  unit tests, API E2E (22 suites/121 tests), build, and browser E2E (96 tests).
- Targeted recording/submission unit tests passed (13 tests), Speaking API E2E
  passed (3 tests), targeted browser boundary passed (1 test), and
  `git diff --check` passed.

### Change Log

- 2026-08-11: Implemented EP4-ST003 under approved Option 1, fixed mandatory
  recording wiring after review, and added browser/security regression coverage.
