---
id: EP3-ST009
title: Shadowing Workflow and Progress
status: blocked
type: fullstack
priority: high
phase: phase-3-licensed-content-library-and-listening
depends_on:
  - EP3-ST008
allowed_paths:
  - apps/api/prisma/schema.prisma
  - apps/api/prisma/migrations/**
  - apps/api/src/generated/**
  - apps/api/src/modules/library/**
  - apps/api/test/**
  - apps/web/src/app/library/**
  - apps/web/src/features/library/**
  - apps/web/src/widgets/library/**
  - apps/web/src/shared/**
  - tests/e2e/library-shadowing.spec.ts
  - docs/07_DATABASE_DESIGN.md
  - docs/08_API_CONTRACT.md
  - docs/09_UI_DESIGN_SYSTEM.md
  - docs/10_TEST_STRATEGY.md
  - docs/11_SECURITY_PLAN.md
  - stories/**
  - _bmad-output/implementation-artifacts/sprint-status.yaml
  - _bmad-output/planning-artifacts/story-map.md
forbidden_paths:
  - apps/api/.env
  - apps/api/src/modules/auth/**
  - apps/api/src/modules/toeic/**
  - apps/web/src/app/admin/**
  - package.json
  - pnpm-lock.yaml
  - .github/**
  - main
requires_human_approval: false
max_fix_rounds: 2
risk: high
delivery_mode: full
---

# Story: Shadowing Workflow and Progress

## Goal

Let an authenticated learner practise repeating a governed library lesson,
track a resumable shadowing attempt, and see their own completion history
without uploading recordings or activating a speech provider.

## Scope

Build a provider-neutral shadowing slice on the approved EP3-ST006 media and
transcript projection. The learner can play the safe lesson media, follow the
current transcript segment, start and stop a local microphone recording when
the browser permits it, self-rate the attempt, and persist bounded progress
metadata. Recording bytes must remain local to the browser and must never be
sent to the API in this story. Use the existing library eligibility and owner
boundaries. Do not add speech recognition, pronunciation scoring, AI calls,
external storage, provider credentials, or Phase 4 speaking features.

## Acceptance Criteria

- `GET /api/v1/library/items/:versionId/shadowing` requires authentication,
  rechecks the existing library eligibility policy, and returns only the safe
  item/media/transcript segments needed by the learner. It fails closed for
  unknown, withdrawn, expired, or ineligible content and never returns private
  provider locators or source evidence.
- An authenticated learner can create or update a shadowing progress record
  for the eligible item with a server-validated segment index, bounded
  position, attempt status, and optional self-rating. The authenticated user
  is always the owner; another user cannot read or mutate the record.
- A finalized shadowing attempt is immutable and repeat submissions are
  idempotent. Server timestamps and a stable attempt key are authoritative;
  client timestamps, arbitrary scores, raw audio, and unknown fields are not
  trusted or persisted.
- The learner page provides explicit loading, empty/unavailable, API
  error/retry, ready, recording-permission-denied, active, paused/resumable,
  submitted, and success states. It uses the existing controlled media and
  transcript UI patterns, keeps recording bytes local, and exposes a clear
  explanation when microphone capture is unavailable.
- Keyboard users can operate playback, segment navigation, recording start/
  stop, and self-rating controls. The submitted state cannot be changed after
  finalization; status is not conveyed by color alone; the 360px viewport has
  no horizontal overflow and reduced-motion behavior remains usable.
- Add unit, API E2E, and browser coverage for authentication, eligibility
  isolation, owner isolation, invalid segment/rating rejection, idempotent
  submission, finalized immutability, safe projection/redaction, retry,
  empty/unavailable and permission-denied states, local recording behavior,
  resume success, keyboard interaction, mobile layout, and accessibility
  smoke checks.
- Update the approved database, API, UI, security, and test documentation.
  Any schema change is additive and non-destructive, uses PrismaService through
  the repository boundary, and stores no recording blob or provider secret.

## Verification

- `node scripts/story-doctor.mjs stories/ready/EP3-ST009-shadowing-workflow-and-progress.md`
- `pnpm story:verify stories/in-progress/EP3-ST009-shadowing-workflow-and-progress.md`
- `pnpm --filter api exec prisma validate`
- `pnpm --filter api exec node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand src/modules/library/**/*.spec.ts src/modules/access/**/*.spec.ts`
- `pnpm --filter api test:e2e -- library-shadowing.e2e-spec.ts`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm exec playwright test tests/e2e/library-shadowing.spec.ts`
- `git diff --check`

## Implementation Guardrails

- Reuse the EP3-ST005 eligibility policy, EP3-ST006 safe media/transcript
  projection, and EP3-ST007 owner-scoped learning repository patterns.
- Keep controllers thin. DTOs must reject unknown/malformed input, services
  own eligibility/idempotency/finalization rules, and repositories must scope
  every read/write by the authenticated user.
- Treat `MediaRecorder` as a local progressive enhancement. Do not send blob
  data, microphone permissions, or device identifiers to the server. Do not
  claim pronunciation quality or speech accuracy.
- Additive migrations require schema documentation and generated Prisma output;
  never run a destructive migration or change credentials/provider config.
- Preserve existing player, bookmark, note, and listening-drill behavior,
  including their existing test fixtures and route mocks.

## Definition of Done

The learner can safely practise and resume a governed shadowing segment in the
local/staging harness, progress ownership and finalized state are enforced by
the API, no recording bytes or answer/provider secrets leave the browser, all
quality gates pass, and no known P0/P1 security or data-integrity finding
remains.



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
