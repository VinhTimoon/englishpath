---
id: EP4-ST008
title: Speaking Feedback Worker And Fallback
status: blocked
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

## Blocker

The recording storage/input boundary is undefined; do not invent it.
