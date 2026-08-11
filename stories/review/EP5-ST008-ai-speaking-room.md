---
id: EP5-ST008
title: AI Speaking room learner feedback surface
status: review
type: frontend
priority: high
phase: phase-5-full-test-adaptive-ai-and-community
depends_on:
  - EP4-ST008
allowed_paths:
  - apps/web/src/features/toeic-speaking/**
  - apps/web/src/widgets/toeic-speaking/**
  - tests/e2e/toeic-speaking.spec.ts
  - docs/08_API_CONTRACT.md
  - docs/09_UI_DESIGN_SYSTEM.md
  - docs/10_TEST_STRATEGY.md
  - docs/11_SECURITY_PLAN.md
  - stories/**
  - _bmad-output/implementation-artifacts/sprint-status.yaml
  - _bmad-output/planning-artifacts/story-map.md
forbidden_paths:
  - apps/web/.env*
  - apps/api/**
  - apps/api/prisma/schema.prisma
  - apps/api/prisma/migrations/**
  - provider credentials or direct provider calls
  - main
acceptance_criteria:
  - After an authenticated Speaking session is finalized, the learner can explicitly request feedback from the existing owner-scoped Speaking feedback endpoint.
  - The room uses the existing session and idempotency boundaries; it does not invent prompts, transcripts, rubric values, scores, provider state, or recording locations.
  - Loading, success, unavailable, validation, and retryable error states are explicit and do not discard the finalized recording or local preview.
  - Provider-unavailable feedback is shown as unavailable guidance, never as zero, completed, an official score, or fabricated AI feedback.
  - The learner surface does not expose provider metadata, credentials, raw submissions, hidden rubric fields, or answer-bearing data.
  - Existing Speaking record, upload, controlled playback, finalize, and retry behavior remains unchanged.
  - The layout remains usable at 360px and supports keyboard and accessible status announcements.
  - Client-contract and browser regression coverage proves the feedback journey, unavailable state, retry, duplicate-click protection, and existing Speaking journey; no standalone web unit runner is introduced because the repository has none.
verification_commands:
  - pnpm --filter web lint
  - pnpm --filter web typecheck
  - pnpm --filter api test:e2e -- toeic-speaking.e2e-spec.ts
  - pnpm e2e -- tests/e2e/toeic-speaking.spec.ts
  - pnpm format:check
  - pnpm story:verify stories/in-progress/EP5-ST008-ai-speaking-room.md
  - pnpm story:checks
max_fix_rounds: 2
risk: medium
delivery_mode: full
requires_human_approval: false
---

# Story: AI Speaking room learner feedback surface

## Goal

Give a learner an explicit, safe way to request the already-approved Speaking
feedback contract after a finalized recording, while preserving the current
recording and playback boundaries when feedback is unavailable.

## Acceptance Criteria

1. After an authenticated Speaking session is finalized, the learner can
   explicitly request feedback from the existing owner-scoped endpoint.
2. The room reuses the existing session and idempotency boundaries and never
   invents prompts, transcripts, rubric values, scores, provider state, or
   recording locations.
3. Loading, success, unavailable, validation, and retryable error states are
   explicit and do not discard the finalized recording or local preview.
4. Provider-unavailable feedback is shown as unavailable guidance, never as
   zero, completed, an official score, or fabricated AI feedback.
5. Provider metadata, credentials, raw submissions, hidden rubric fields, and
   answer-bearing data are never rendered.
6. Existing record, upload, controlled playback, finalize, and retry behavior
   remains unchanged; the layout works at 360px with keyboard-accessible status
   announcements.
7. Client and browser regression coverage proves the feedback journey,
   unavailable state, retry, duplicate-click protection, and existing Speaking
   journey.

## Existing contract to reuse

- `POST /api/v1/toeic/speaking/sessions/:sessionId/feedback` is already
  authenticated, owner-scoped, finalized-session-gated, idempotent, quota-aware,
  and fail-closed through the local/no-op gateway.
- The endpoint returns the existing safe feedback envelope. The UI must render
  only its allowlisted fields and must not derive a score or rubric result.
- EP4-ST008 deliberately returns `PROVIDER_UNAVAILABLE` until an approved
  audio-capable provider exists. This story must not activate a provider or
  create an AI request for provider configuration.

## Verification

- `pnpm --filter web lint`
- `pnpm --filter web typecheck`
- `pnpm --filter api test:e2e -- toeic-speaking.e2e-spec.ts`
- `pnpm e2e -- tests/e2e/toeic-speaking.spec.ts`
- `pnpm format:check`
- `pnpm story:verify stories/in-progress/EP5-ST008-ai-speaking-room.md`
- `pnpm story:checks`

## Implementation constraints

- Inspect the existing Speaking widget, API client, session persistence, and
  E2E fixtures before editing. Keep route files thin and place request/state
  logic in the existing feature/widget boundaries.
- Reuse the existing request/error/envelope helpers and design tokens. Do not
  add a second feedback API, a new state store, or a client-side scoring policy.
- Generate one stable idempotency key per feedback attempt and prevent duplicate
  clicks while the request is pending. Retrying an eligible failure must remain
  safe and must not resubmit the recording.
- Preserve the finalized result and controlled playback when the request fails
  or returns unavailable. The feedback panel is additive and may be retried.
- If the API response is malformed or contains forbidden fields, fail closed and
  show an actionable unavailable/error state; never render arbitrary response
  text.

## Required tests

- Browser client-contract coverage for authenticated request shape, exact
  idempotency-key reuse, safe envelope parsing, malformed response,
  unavailable, and retryable error states. The repository has no standalone
  web unit runner, so this story does not add a new test framework or script.
- Browser coverage at the existing 360px Speaking route for: request feedback
  after finalize, loading/duplicate-click guard, unavailable result, transient
  retry while recording/playback remains intact, and keyboard/accessibility
  status behavior.
- Keep existing recording permission, upload retry, controlled playback, and
  finalized-session tests green.

## References

- [Source: stories/done/EP4-ST008-speaking-feedback-worker-and-fallback.md]
- [Source: docs/08_API_CONTRACT.md#EP4-ST008-Speaking-feedback-fallback]
- [Source: docs/11_SECURITY_PLAN.md#AI-feedback-and-explanation-boundary]
- [Source: docs/09_UI_DESIGN_SYSTEM.md]
- [Source: docs/10_TEST_STRATEGY.md]

## Definition of Done

The Speaking room offers a safe explicit feedback action over the existing
contract, preserves the recording journey, renders unavailable and retryable
states correctly, passes targeted browser/API checks and the full project gate,
and makes no provider, schema, backend, credential, or Phase 6 change.

