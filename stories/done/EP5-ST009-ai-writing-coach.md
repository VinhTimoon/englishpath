---
id: EP5-ST009
title: AI Writing Coach learner feedback surface
status: done
type: frontend
priority: high
phase: phase-5-full-test-adaptive-ai-and-community
depends_on:
  - EP4-ST009
allowed_paths:
  - apps/web/src/entities/toeic-writing/**
  - apps/web/src/features/toeic-writing/**
  - apps/web/src/widgets/toeic-writing/**
  - tests/e2e/toeic-writing.spec.ts
  - docs/08_API_CONTRACT.md
  - docs/09_UI_DESIGN_SYSTEM.md
  - docs/10_TEST_STRATEGY.md
  - docs/11_SECURITY_PLAN.md
  - stories/**
  - _bmad-output/implementation-artifacts/sprint-status.yaml
  - _bmad-output/planning-artifacts/story-map.md
forbidden_paths:
  - apps/api/**
  - apps/api/prisma/schema.prisma
  - apps/api/prisma/migrations/**
  - apps/web/.env*
  - provider credentials or direct provider calls
  - package.json
  - pnpm-lock.yaml
  - .github/**
  - main
acceptance_criteria:
  - After an authenticated Writing session is finalized, the learner can explicitly request advisory feedback from the existing owner-scoped Writing feedback endpoint.
  - The client reuses the persisted session and one stable idempotency key; it never sends raw submission text, invents task data, or resubmits the Writing submission when requesting feedback.
  - The client accepts only the existing safe gateway envelope and renders allowlisted advisory fields: outcome, advisory-only summary, bounded strengths, and bounded next steps.
  - ALLOWED, PROVIDER_UNAVAILABLE, DENIED, validation, and retryable error states are explicit; unavailable or denied feedback is never shown as a score, rubric result, completion, or fabricated feedback.
  - The finalized Writing result, word/character metadata, and retryable draft/session behavior remain available when feedback fails or is unavailable.
  - Provider metadata, credentials, raw submission text, hidden prompts, rubric internals, official scores, model data, and arbitrary unknown response fields are not exposed or rendered.
  - The surface remains usable at 360px, keyboard-operable, and announces loading/result/error state changes accessibly.
  - Browser contract coverage proves request shape, stable idempotency retry, duplicate-click protection, safe parsing, malformed-response fail-closed behavior, unavailable/denied/validation states, and existing Writing regression behavior.
  - No standalone web unit runner, backend change, schema/migration, provider activation, or Phase 6 feature is introduced.
verification_commands:
  - pnpm --filter web lint
  - pnpm --filter web typecheck
  - pnpm --filter api test:e2e -- toeic-writing.e2e-spec.ts
  - pnpm e2e -- tests/e2e/toeic-writing.spec.ts
  - pnpm format:check
  - pnpm story:verify stories/in-progress/EP5-ST009-ai-writing-coach.md
  - pnpm story:checks
max_fix_rounds: 2
risk: medium
delivery_mode: full
requires_human_approval: false
---

# Story: AI Writing Coach learner feedback surface

## Goal

Give an authenticated learner a safe, explicit way to request advisory Writing
feedback after the existing server has finalized and persisted the learner's
Writing submission. Preserve the current completion result and fail closed when
the approved gateway cannot provide feedback.

## Acceptance Criteria

- A finalized authenticated Writing session can explicitly request advisory
  feedback through the existing owner-scoped endpoint.
- The request uses one stable idempotency key, sends no raw answer body, and
  never submits the Writing answer again.
- Only the existing allowlisted advisory projection is rendered; sensitive or
  unknown fields fail closed.
- ALLOWED, PROVIDER_UNAVAILABLE, DENIED, validation, and retryable error states
  are explicit, accessible, mobile-safe, and preserve the finalized result.
- Browser contract coverage proves safe success, unavailable/denied/validation
  behavior, malformed-response rejection, duplicate-click protection, stable
  retry, and existing Writing regressions without a new unit framework.

## Existing contract to reuse

- `POST /api/v1/toeic/writing/sessions/:sessionId/feedback` is authenticated,
  owner-scoped, finalized-session-gated, idempotent, quota-aware, and backed by
  the existing provider-neutral gateway.
- The request has no body. The client sends the existing `Idempotency-Key`
  header only; the backend loads the owner-scoped finalized submission.
- The response is the standard envelope:
  `{ data: { feedback: SafeFeedbackResponse, replayed: boolean }, meta }`.
  The nested safe feedback projection contains only `outcome`, `policyVersion`,
  `promptVersion`, `feature`, `skill`, `quotaRemaining`, and `feedback`.
- The advisory `feedback` object is either `null` or an allowlisted object with
  `advisoryOnly: true`, a bounded `summary`, and bounded `strengths` and
  `nextSteps`. The current local/no-op gateway may return
  `PROVIDER_UNAVAILABLE` with `feedback: null`; quota exhaustion may return
  `DENIED` with `feedback: null`.
- Exact retries with the same authenticated request and idempotency key replay
  the original safe result. A changed request or conflicting key is an error.
- EP4-ST009 deliberately excludes raw submitted text, provider details,
  credentials, rubric internals, hidden prompts, official scores, and raw
  gateway data from the response. This story must not weaken that boundary.

## Implementation constraints

- Before editing, read the existing Writing contracts, API client, persisted
  attempt model, page/widget, E2E fixtures, EP4-ST009 story, and the referenced
  API/security/UI/test documents.
- Keep route files thin. Put request parsing and client contract logic in the
  existing Writing feature/entity boundary and state/rendering in the existing
  Writing widget.
- Reuse `requestLearnerApi`, `learnerApiStatus`, the existing session identity,
  and the existing local attempt storage. Do not add a second API client, state
  store, persistence model, or feedback policy.
- Generate one stable feedback idempotency key for each persisted Writing
  attempt. A retry after a transient/validation-safe failure must reuse the
  same key and must not call the submission endpoint again. Prevent duplicate
  clicks while feedback is pending, including late responses after starting a
  new attempt.
- Parse the complete response with an explicit allowlist and bounded strings.
  Reject unknown root/meta/data/feedback fields, inconsistent outcome/feedback
  combinations, unsafe advisory text, and malformed types. Do not render raw
  exception or response text.
- Render only learner-safe guidance. Do not derive a score, rubric level,
  correctness claim, provider status, model name, or progress value in the
  browser.
- Preserve the finalized completion panel and controlled session state while
  feedback is loading, unavailable, denied, malformed, or retryable.

## Required UI states

- `ready`: feedback action is available only after a valid finalized session.
- `loading`: button is disabled, duplicate requests are prevented, and an
  accessible live status identifies the pending request.
- `success`: render advisory-only summary, strengths, and next steps from the
  server allowlist; keep the persisted Writing metadata visible.
- `unavailable`: explain that feedback is currently unavailable and preserve
  the finalized result; do not offer fabricated replacement content.
- `denied`: explain that the current feedback limit/policy prevents the request;
  do not represent it as a score or completed coaching result.
- `validation`: show an actionable safe contract/session message without
  discarding the finalized result; do not blindly retry a malformed request.
- `error`: show a generic retry action for recoverable failures, reusing the
  same idempotency key and never resubmitting or uploading the answer.

## Required tests

- Extend `tests/e2e/toeic-writing.spec.ts` using the existing Playwright and
  local API route fixtures. Assert the feedback request is a `POST` to the
  existing session route, carries the authenticated request context and one
  stable `Idempotency-Key`, has no body containing the Writing answer, and does
  not trigger another submission request.
- Cover successful safe feedback, keyboard activation, loading and duplicate
  click protection, exact key reuse on retry, provider-unavailable and denied
  outcomes, HTTP validation/error handling, and malformed/forbidden response
  rejection without sensitive text rendering.
- Keep existing start, task redaction, validation submit retry, transient
  submit retry, pending submit, cancelled-session conflict, mobile overflow,
  and accessibility coverage green.
- The repository has no standalone web unit runner; do not introduce one just
  for this story. Browser contract coverage is the approved client evidence.

## Security and architecture evidence

- Ownership and finalized-submission eligibility remain enforced only by the
  backend EP4-ST009 contract; the browser must not accept a caller-supplied
  owner or submission reference.
- The browser may display only the safe advisory projection. It must reject
  provider, credential, token, raw submission, rubric, official-score,
  hidden-prompt, and arbitrary unknown fields even if a test fixture supplies
  them.
- Use existing design tokens, visible focus, semantic buttons, live regions,
  44px touch targets, reduced-motion behavior, and no horizontal overflow at
  the 360px baseline.

## Definition of Done

The Writing page offers an explicit safe AI Coach action over the existing
EP4-ST009 endpoint, preserves the learner's finalized Writing result and
submission boundary, handles all approved gateway outcomes without inventing
scores or content, passes targeted and full quality gates, and makes no backend,
schema, provider, credential, or Phase 6 change.

## Story context completion

Created from the dependency-ready Phase 5 queue after EP5-ST008 was merged.
The implementation must remain a single vertical frontend slice and must not
create a recovery story or reopen historical blocked work.

## Verification

- `node scripts/story-doctor.mjs stories/in-progress/EP5-ST009-ai-writing-coach.md`
- `pnpm story:verify stories/in-progress/EP5-ST009-ai-writing-coach.md`
- `pnpm --filter web lint`
- `pnpm --filter web typecheck`
- `pnpm --filter api test:e2e -- toeic-writing.e2e-spec.ts`
- `pnpm e2e -- tests/e2e/toeic-writing.spec.ts`
- `pnpm format:check`
- `pnpm story:checks`
- `git diff --check`


