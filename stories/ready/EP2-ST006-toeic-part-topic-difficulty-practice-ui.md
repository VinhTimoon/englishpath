---
id: EP2-ST006
title: TOEIC Part, topic, and difficulty practice UI
status: ready
type: vertical-slice
priority: high
phase: phase-2-toeic-listening-reading
depends_on:
  - EP2-ST004
  - EP2-ST005
allowed_paths:
  - apps/web/src/app/toeic/practice/**
  - apps/web/src/widgets/toeic-practice/**
  - apps/web/src/features/toeic-practice/**
  - apps/web/src/entities/toeic-practice/**
  - apps/web/src/shared/api/**
  - apps/api/src/modules/toeic/**
  - apps/api/prisma/schema.prisma
  - apps/api/prisma/migrations/20260806233000_toeic_practice_filters/**
  - apps/api/test/**
  - tests/e2e/**
  - docs/05_FRONTEND_ARCHITECTURE.md
  - docs/06_BACKEND_ARCHITECTURE.md
  - docs/07_DATABASE_DESIGN.md
  - docs/08_API_CONTRACT.md
  - docs/09_UI_DESIGN_SYSTEM.md
  - docs/10_TEST_STRATEGY.md
  - stories/**
  - _bmad-output/implementation-artifacts/sprint-status.yaml
  - _bmad-output/planning-artifacts/story-map.md
forbidden_paths:
  - apps/web/.env
  - apps/api/.env
  - apps/api/src/generated/**
  - apps/web/src/app/admin/**
  - packages/**
  - package.json
  - pnpm-lock.yaml
  - main
requires_human_approval: false
max_fix_rounds: 2
risk: high
delivery_mode: full
---

# Story: TOEIC Part, topic, and difficulty practice UI

## Goal

Give an authenticated learner a useful, safe TOEIC practice journey at
`/toeic/practice`: choose Listening or Reading, choose a valid Part, optionally
choose server-supported difficulty/topic filters, answer every selected question
in order, and see a safe completion summary. The UI must consume the governed
session APIs from EP2-ST004 and EP2-ST005; it must never simulate filtering in the
browser or invent taxonomy values.

## Scope

Implement one learner-facing practice surface for the existing Parts 1-4
listening and Parts 5-7 reading session APIs. Extend the start request and the
separate listening/reading session snapshots only as needed to carry the selected
`difficulty` and `topic` filters through exact replay/conflict checks. Keep the
eligibility policy, answer secrecy, owner binding, active-session lock, and
server-grading rules unchanged.

The learner can select:

- Listening Parts 1, 2, 3, or 4.
- Reading Parts 5, 6, or 7.
- A server-provided difficulty value, when the catalogue supports it.
- A server-provided topic value for reading content, when the catalogue supports
  it. Do not hard-code topic taxonomy or expose a topic selector for a skill that
  has no topic values in the response.

The practice card presents safe prompt/options and reading metadata. Listening
media is displayed only when the approved safe response contains a usable
`mediaReference`; this story does not add a provider, audio storage, transcript,
timer, or playback subsystem. The UI sends one answer at a time and never allows
the learner to skip an unanswered selected question. Since the current answer
acknowledgement intentionally contains no correctness, correctness is shown only
through the final server result, not guessed in the browser.

Do not implement timed tests, mini/half tests, score breakdowns, weakness
analysis, XP/streak, Error Notebook/remediation writes, content import/review/
publish, AI, real media providers, Phase 3 behavior, or a second taxonomy.

## Acceptance Criteria

1. Add an authenticated learner route at `/toeic/practice` with a thin App Router
   page and FSD-aligned widget/feature/entity/shared boundaries. The page has a
   clear title, current mode/filter summary, one primary action per section, and
   navigable return path to the learner dashboard.

2. Listening and Reading mode selection exposes only the valid Parts for that
   mode. Changing mode resets incompatible Part/topic controls and no request is
   sent with an invalid Part. The UI derives displayed topic/difficulty choices
   from the server catalogue/session data; it does not hard-code a taxonomy list.

3. Extend the existing start contracts, if required by the implementation, with
   strict optional `difficulty` and `topic` filters. The backend validates bounds
   and enums, applies them inside the shared governed eligibility predicate, and
   persists the request identity needed for exact replay/conflict. An exact retry
   with the same owner/client session ID and filters replays; any changed Part,
   difficulty, topic, or count returns the existing sanitized conflict. Listening
   and reading persistence remain separate.

4. Starting a practice session uses the existing authenticated learner API client,
   an actor-bound local client session ID, and the correct reading/listening route.
   The selected version IDs and order come from the server. The browser must not
   filter, reorder, replace, or silently skip selected questions after session
   creation.

5. The question flow renders one safe question at a time with accessible labels,
   keyboard-operable options, visible progress (`current / total` and a text
   alternative), selected-state feedback, and a disabled next action until the
   answer acknowledgement succeeds. A request cannot be submitted twice while
   pending, and an answer error leaves the learner on the same question with a
   retry action.

6. The UI handles all required operational states with explicit accessible
   semantics: initial loading skeleton, empty/insufficient catalogue, request
   error with retry, active success, answer pending, final success, and final
   error. Empty states explain what the learner can change; error messages never
   expose API/provider/database details.

7. Submission and result rendering use only the safe server response. No UI,
   TypeScript type, fixture, URL, or log serializes or renders `correctAnswer`,
   `isCorrect`, answer rows, source/license/review/publication metadata, or any
   private grading field. The final summary shows only approved aggregate fields
   and a practical next action; the story does not add score analytics.

8. The interface follows `docs/09_UI_DESIGN_SYSTEM.md`: semantic design tokens,
   warm editorial canvas/green/amber palette, readable Vietnamese copy, mobile
   first layout from 360px, visible focus, minimum 44px touch targets, no random
   colors, no generic purple SaaS treatment, no emoji, no gratuitous gradients,
   and reduced-motion-safe transitions. Use existing shared primitives and the
   smallest client boundary necessary.

9. Add deterministic tests for mode/Part/filter mapping, strict filter handling,
   exact replay/conflict identity, safe answer/result projections, loading/empty/
   error/success UI states, no-skip behavior, duplicate-submit prevention,
   mobile layout, keyboard access, and API failure recovery. Browser tests must
   mock the API boundary and require no credentials, provider, network, or shared
   database.

10. Update the approved frontend/backend/database/API/test documents with the
    route, filter identity, state transitions, UI operational states, safe data
    boundary, and verification evidence. Do not update Phase 3 documents or add
    production credentials.

## Technical Requirements

- Reuse `requestLearnerApi` and `readSession`; do not scatter raw `fetch` calls or
  read secrets in components. Check `apps/web/package.json` before importing any
  package. Existing `framer-motion` is available, but motion is optional and must
  be isolated in a small client leaf with reduced-motion behavior; do not add a
  new dependency.
- Follow `app -> widgets -> features -> entities -> shared` imports. Route files
  compose; business rules, API parsing, session orchestration, and controls live
  below the route.
- Preserve the existing `http://localhost:3005/api/v1` backend and `4173` web
  ports in test/config references. Do not modify `.env` or credentials.
- Use explicit TypeScript safe DTOs for listening and reading responses. Treat
  backend payloads as unknown until validated; never type private grading fields
  into a learner response model.
- If filter support changes Prisma models, add only the additive migration named
  by this story, update database documentation, and do not edit generated Prisma
  output or run destructive migration commands.
- Keep selected-session identity stable in local storage. A malformed/stale
  client ID must be recoverable by generating a new local ID, while an active
  session remains resumable after a refresh when the server replay returns it.

## Verification Commands

- `pnpm --filter api exec prisma validate --schema prisma/schema.prisma`
- `pnpm --filter api exec jest --runInBand src/modules/toeic`
- `pnpm --filter api test:e2e -- --runInBand`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm format:check`
- `pnpm planning:traceability`
- `node scripts/story-doctor.mjs stories/ready/EP2-ST006-toeic-part-topic-difficulty-practice-ui.md`
- `pnpm story:verify stories/ready/EP2-ST006-toeic-part-topic-difficulty-practice-ui.md`
- `pnpm e2e`
- `git diff --check`

## Risk and Review

Risk is high because this story changes a learner-facing practice boundary and
must preserve server-owned question selection, answer secrecy, owner/session
identity, and progress continuity. Use full planning, build, review, targeted
browser tests, API tests, and repository quality gates. Do not use fast path or
merge on partial checks. If a required backend change exceeds the allowed paths,
stop and mark this story blocked rather than changing architecture or creating a
new competing story.

## Dependencies and Implementation Guardrails

`EP2-ST004` is the approved listening session lifecycle and `EP2-ST005` is the
approved reading lifecycle. Preserve both route envelopes and their separate
persistence. `EP2-ST007` owns mini/half tests and server timing; `EP2-ST009`
owns analysis; `EP2-ST010` owns remediation. Keep all of them out of this story.

The previous backend delivery required explicit safe/private projections,
current-eligibility checks before answer retries, transactional active-session
locking, compare-and-set submission, and sanitized recovery errors. The UI and
any filter extension must not weaken those invariants. Reuse the shared
`toeic-eligibility.policy.ts`; do not duplicate governance predicates or invent
frontend taxonomy.

## Completion Evidence Requirements

Before moving to review, record the planning/build/review harness outcomes in
this story, the exact checks and test counts that actually ran, the browser
viewport/evidence used, and any owner-deferred risk. A timeout or missing command
must be recorded as not verified, never treated as pass.
