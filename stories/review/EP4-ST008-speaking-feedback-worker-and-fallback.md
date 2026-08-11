---
id: EP4-ST008
title: Speaking Feedback Worker And Fallback
status: review
type: backend
priority: high
phase: phase-4-toeic-speaking-writing-and-four-skills
depends_on:
  - EP4-ST003
  - EP4-ST007
allowed_paths:
  - apps/api/src/modules/toeic/**
  - apps/api/src/modules/ai-gateway/**
  - apps/api/test/**
  - docs/04_SYSTEM_ARCHITECTURE.md
  - docs/08_API_CONTRACT.md
  - docs/10_TEST_STRATEGY.md
  - _bmad-output/implementation-artifacts/sprint-status.yaml
  - _bmad-output/planning-artifacts/story-map.md
  - stories/**
  - notes/ai-req/**
forbidden_paths:
  - apps/api/.env*
  - direct provider calls
  - main
requires_human_approval: true
blocked_by: notes/ai-req/2026-08-10-ep4-st003-recording-storage-controlled-playback.md
max_fix_rounds: 2
risk: high
delivery_mode: full
---

# Story: Speaking Feedback Worker And Fallback

## Goal

Request bounded advisory Speaking feedback only for an owner-scoped finalized
recording, reusing the approved provider-neutral gateway and safe fallback.

## Acceptance Criteria

- Only finalized owner recordings with an approved playback/input boundary are
  eligible.
- Gateway quota, policy, prompt, idempotency, cost, and redaction rules are
  reused; no provider or official score is exposed.
- Missing/unavailable recordings and provider fallback fail closed without a
  fabricated rubric or score.
- Unit, API, security, and browser evidence passes.

## Verification

- `pnpm --filter api lint`
- `pnpm --filter api typecheck`
- `pnpm --filter api test -- --runInBand`
- `pnpm --filter api test:e2e`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm e2e`

Browser evidence is not applicable to this backend-only story: no learner UI
or browser route calls Speaking feedback yet. The authenticated API E2E suite
is the contract/security evidence for this endpoint; the existing EP4-ST004
browser journey remains unchanged.

## Tasks/Subtasks

- [x] Reuse the owner-scoped Speaking submission and recording boundaries.
- [x] Add a thin authenticated Speaking feedback endpoint backed by the
  provider-neutral gateway.
- [x] Fail closed with explicit `PROVIDER_UNAVAILABLE` until an approved
  audio-capable gateway input exists; never infer feedback from metadata.
- [x] Add lifecycle, ownership, redaction, quota, unavailable, and idempotency
  regression coverage.
- [x] Run API and full project quality gates.

## Implementation Record

The new service requires an owner-scoped finalized session and rechecks the
associated recording through the approved EP4-ST003 boundary. It delegates
quota, policy, cost, and exact retry semantics to the existing gateway. Since
the approved local/no-op adapter does not transcribe or consume audio, Speaking
requests are recorded as an explicit provider-unavailable outcome instead of
returning generic or fabricated rubric feedback.

Changed files:

- `apps/api/src/modules/ai-gateway/ai-feedback.service.ts`
- `apps/api/src/modules/ai-gateway/ai-feedback.service.spec.ts`
- `apps/api/src/modules/toeic/toeic-speaking-feedback.service.ts`
- `apps/api/src/modules/toeic/toeic-speaking-feedback.service.spec.ts`
- `apps/api/src/modules/toeic/toeic.controller.ts`
- `apps/api/src/modules/toeic/toeic.module.ts`
- `apps/api/test/toeic-speaking.e2e-spec.ts`
- `docs/08_API_CONTRACT.md`

Targeted evidence: API lint, API typecheck, 19 focused unit tests, and 4
Speaking API E2E tests passed before the final full gate.

## Verification Evidence

- Review result: pass; P0/P1 findings: none. Remaining findings are P2
  expansion opportunities only.
- Full gate on 2026-08-11 with `ENGLISHPATH_E2E_PORT=4180`: formatting,
  planning traceability, 59 harness tests, Prisma validation, lint, typecheck,
  72 API unit suites / 501 tests, 22 API E2E suites / 122 tests, build, and 99
  browser tests all passed.
- `git diff --check` passed. No schema, migration, environment, credential,
  provider, frontend, or production configuration was changed.
- Browser-specific feedback coverage is not applicable because this backend-only
  endpoint has no learner UI caller; the existing Speaking browser journey
  remains green in the full gate.

## Operational Boundary

Speaking feedback remains explicitly unavailable until an approved audio-capable
gateway/STT contract and provider activation exist. No AI request is opened for
that deferred provider work because the approved local/no-op gateway policy
requires fail-closed behavior and no paid provider activation.

## Dependency Resolution

EP4-ST003 Option 1 was approved and passed full quality gates on 2026-08-11.
This story now uses its owner-scoped finalized-recording boundary. The current
approved gateway has no speech-to-text or audio-capable provider adapter, so
Speaking feedback remains an explicit `PROVIDER_UNAVAILABLE` fallback; no
feedback is inferred from audio metadata or an opaque recording reference.
