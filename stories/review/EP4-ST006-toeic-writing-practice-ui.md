---
id: EP4-ST006
title: TOEIC Writing Practice UI
status: review
type: frontend
priority: high
phase: phase-4-toeic-speaking-writing-and-four-skills
depends_on:
  - EP4-ST005
allowed_paths:
  - apps/web/src/app/toeic/writing/**
  - apps/web/src/entities/toeic-writing/**
  - apps/web/src/features/toeic-writing/**
  - apps/web/src/widgets/toeic-writing/**
  - apps/web/src/shared/**
  - tests/e2e/toeic-writing.spec.ts
  - docs/05_FRONTEND_ARCHITECTURE.md
  - docs/09_UI_DESIGN_SYSTEM.md
  - docs/10_TEST_STRATEGY.md
  - _bmad-output/implementation-artifacts/sprint-status.yaml
  - _bmad-output/planning-artifacts/story-map.md
  - stories/**
forbidden_paths:
  - apps/api/**
  - apps/web/.env*
  - package.json
  - pnpm-lock.yaml
  - .github/**
  - main
requires_human_approval: false
max_fix_rounds: 2
risk: medium
delivery_mode: full
---

# Story: TOEIC Writing Practice UI

## Goal

Give an authenticated learner a useful mobile-first Writing practice journey
using the existing EP4-ST005 server contract: load the approved task, start an
owner-scoped attempt, write bounded text, submit exactly once, and see safe
completion metadata without client-side scoring or feedback invention.

## Scope

Implement the learner-facing route at /toeic/writing with a thin App Router
page, a Writing entity contract parser, a feature API/session boundary, and a
composed widget. Reuse the existing learner API client and visual tokens.
Speaking, recording, AI feedback UI, official scoring, progress mutation, and
provider integration remain out of scope.

## API Contract

- POST /api/v1/toeic/writing/tasks/ep-writing-sentence-001/sessions with
  Idempotency-Key starts the server-approved task.
- GET /api/v1/toeic/writing/sessions/:sessionId resumes the owner-scoped
  session.
- POST /api/v1/toeic/writing/sessions/:sessionId/submissions with
  Idempotency-Key and { text } finalizes the bounded submission.
- The learner projection contains task metadata, lifecycle status,
  wordCount/characterCount, timestamps, and safe completion state only.

## Acceptance Criteria

- Authenticated learner can load the route, start the approved Writing task,
  enter text, submit it, and see finalized safe metadata.
- Client sends server-owned task/session values and never sends a prompt,
  score, rubric, provider locator, or owner identifier.
- The UI handles loading, empty/unavailable, retryable error, active,
  validation feedback, pending submission, finalized success, and conflict
  states explicitly.
- Client prevents duplicate start/submit while a request is pending and uses
  stable idempotency keys for retries; a changed or finalized retry remains
  actionable without reopening the attempt.
- Word count and bounds displayed in the UI are advisory presentation only;
  server validation remains authoritative and the UI never derives official
  progress or score.
- Route and controls are usable at 360px, keyboard accessible, have visible
  focus, labels, text/icon status cues, and respect reduced motion.
- API responses are parsed from unknown with an allowlist and reject sensitive
  or recursive fields. No raw provider, credential, rubric, score, answer, or
  owner data is rendered.
- Browser coverage proves start, bounded text entry, submit success, retryable
  API failure, explicit unavailable state, duplicate-submit prevention, mobile
  layout, and accessibility smoke behavior.

## Implementation Guardrails

- Keep route files thin; place API parsing in entities/features and composition
  in the Writing widget.
- Use existing requestLearnerApi and CSS token conventions. Do not add a third
  party dependency.
- Do not modify the API, Prisma, authentication, or AI gateway.
- Do not fabricate Writing task data: use the server task ID and prompt from
  the authenticated response only.
- Do not show submitted raw text after finalization unless the server contract
  explicitly supplies it; show counts/timestamps/status instead.

## Tasks/Subtasks

- [x] Inspect existing TOEIC practice UI, learner API client, design tokens, and browser test conventions.
- [x] Add allowlisted Writing API contracts and feature client for start, resume, and submit.
- [x] Build the thin Writing route and mobile-first widget with explicit operational states.
- [x] Add focused coverage for response parsing, state transitions, and duplicate-submit prevention through the browser contract suite.
- [x] Add browser coverage for success, validation/error, transient retry, unavailable, conflict, mobile layout, and accessibility smoke behavior.
- [x] Run scoped and repository quality gates; record evidence and changed files.

## Dev Notes

- The API is the source of truth for task content, lifecycle, validation, and completion metadata.
- Reuse `apps/web/src/shared/api/learner-api-client.ts` and the visual tokens used by the existing TOEIC practice widget.
- Keep raw response text out of finalized UI state unless the server explicitly returns it; ST005 currently returns safe counts and timestamps.
- An API response parser must accept only the approved envelope fields and reject provider, rubric, score, credential, owner, answer, or recursive payload fields.
- No new dependency, API, persistence, Prisma, auth, AI gateway, or environment change is permitted by this story.

## Dev Agent Record

### Implementation Plan

1. Reuse the existing learner API client and TOEIC practice presentation patterns.
2. Add an allowlisted Writing response parser and a feature API/session boundary with stable idempotency keys.
3. Compose a mobile-first route/widget with explicit loading, ready, active, retry, unavailable, conflict, and finalized states.
4. Verify the learner journey with browser mocks, safe-field rejection, transient retry, duplicate-submit prevention, mobile overflow, and Axe smoke coverage.
5. Run the full repository gate and the story verification command before lifecycle transition.

### Completion Notes

- Implemented `/toeic/writing` over the approved EP4-ST005 contract; the browser sends only server-owned task/session IDs and text.
- Added strict allowlists for response envelopes, metadata, task media, sessions, and safe submission metadata; sensitive/provider/rubric/score/raw-submission fields are rejected or omitted.
- Added stable client-side start/submit idempotency keys without persisting raw writing text.
- Added explicit retryable, unavailable, conflict, cancelled, active, and finalized learner states with advisory-only word counts.
- Review passed with no P0/P1 findings after conflict and recursive-payload fixes.
- Full gate passed: format, planning traceability, tooling tests, Prisma validation, lint, typecheck, 68 unit suites/480 tests, 22 API E2E suites/116 tests, build, and 95 browser tests.

### File List

- apps/web/src/app/toeic/writing/page.tsx
- apps/web/src/app/toeic/writing/loading.tsx
- apps/web/src/entities/toeic-writing/model/contracts.ts
- apps/web/src/features/toeic-writing/api/writing-api.ts
- apps/web/src/features/toeic-writing/model/client-session.ts
- apps/web/src/shared/api/learner-api-client.ts
- apps/web/src/widgets/toeic-writing/toeic-writing-page.tsx
- apps/web/src/widgets/toeic-writing/toeic-writing-page.module.css
- tests/e2e/toeic-writing.spec.ts
- docs/10_TEST_STRATEGY.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/planning-artifacts/story-map.md

### Change Log

- 2026-08-10: Created as the dependency-ready Phase 4 Writing learner slice.
- 2026-08-10: Implemented, reviewed, and verified the Writing learner slice; moved to review.

## Verification

- node scripts/story-doctor.mjs stories/ready/EP4-ST006-toeic-writing-practice-ui.md
- pnpm story:verify stories/in-progress/EP4-ST006-toeic-writing-practice-ui.md
- pnpm --filter web typecheck
- pnpm --filter web lint
- pnpm exec playwright test tests/e2e/toeic-writing.spec.ts
- pnpm lint
- pnpm typecheck
- pnpm test
- pnpm build
- pnpm e2e
- git diff --check

## Definition of Done

Writing practice is a real authenticated learner journey over the approved
ST005 API, with honest operational states, mobile/accessibility coverage,
server-owned validation, no sensitive leakage, and all quality gates passing.
