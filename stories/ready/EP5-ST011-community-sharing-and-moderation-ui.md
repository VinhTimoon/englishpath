---
id: EP5-ST011
title: Community sharing and moderation UI
status: ready
type: frontend
priority: high
phase: phase-5-full-test-adaptive-ai-and-community
risk: medium
delivery_mode: full-review
depends_on:
  - EP5-ST010
allowed_paths:
  - apps/web/src/entities/community/**
  - apps/web/src/features/community/**
  - apps/web/src/widgets/community/**
  - apps/web/src/app/community/**
  - apps/web/src/shared/api/learner-api-client.ts
  - tests/e2e/community-sharing.spec.ts
  - docs/08_API_CONTRACT.md
  - docs/09_UI_DESIGN_SYSTEM.md
  - docs/10_TEST_STRATEGY.md
  - docs/11_SECURITY_PLAN.md
  - docs/13_DECISION_LOG.md
  - stories/**
  - _bmad-output/implementation-artifacts/sprint-status.yaml
  - _bmad-output/planning-artifacts/story-map.md
forbidden_paths:
  - apps/api/**
  - apps/web/.env*
  - package.json
  - pnpm-lock.yaml
  - .github/**
  - provider credentials or direct provider calls
  - production data or shared Supabase migrations
  - main
  - Phase 6
requires_human_approval: false
max_fix_rounds: 2
---

# Story: Community sharing and moderation UI

## Goal

Give authenticated learners a useful, safe community surface over the
approved EP5-ST010 API: read published posts, submit bounded text for review,
and report published content. Give approved `CONTENT_EDITOR`, `ADMIN`, and
`SUPER_ADMIN` users a guarded moderation queue and decision controls. The
browser remains a transport and presentation layer; publication, ownership,
role, state transitions, idempotency, and redaction stay server-owned.

## Scope

Build one mobile-first community route and feature boundary using the existing
Next.js/FSD-style structure, `requestLearnerApi`, TanStack Query conventions,
and EnglishPath UI tokens. The route may expose learner content and, when the
backend permits it, a moderation workspace in the same bounded feature. Do not
add social graph features, comments, reactions, search, notifications, media,
AI moderation, provider setup, or Phase 6 work.

## Existing API contract to consume

- `GET /api/v1/community/posts?limit&offset` requires authentication and
  returns only published posts with `id`, bounded `title`/`body`, and
  `createdAt`/`publishedAt`, plus pagination metadata.
- `POST /api/v1/community/posts` requires an authenticated session,
  `Idempotency-Key`, and exactly `{ title, body }`. The server always returns
  `PENDING_REVIEW`; the client must not send status, owner, actor, or publish
  fields.
- `POST /api/v1/community/posts/:postId/reports` requires an authenticated
  session, `Idempotency-Key`, and one approved reason enum. Missing/unpublished
  targets use the safe API boundary; do not infer target existence in UI.
- `GET /api/v1/community/moderation/queue?limit&offset` and
  `POST /api/v1/community/moderation/:postId/decision` are role-guarded by the
  backend. Decisions are only `PUBLISH`, `REJECT`, or `ARCHIVE` and require
  idempotency keys.
- Responses use standard `data`/`meta` envelopes, correlation metadata, and
  sanitized errors. The client must validate an explicit allowlist and fail
  closed on unknown or sensitive fields; never render raw API error text.

## Acceptance Criteria

1. An authenticated learner can open `/community`, see published posts with
   loading, success, empty, retryable error, and auth-required states, and use
   bounded pagination without client-side publication or ownership assumptions.
2. A learner can submit a bounded title/body through a visible form. The form
   rejects blank/oversized input, disables duplicate submission, uses one stable
   idempotency key per attempt, renders the server-owned pending-review result,
   and preserves the draft on recoverable error. It never sends status, user ID,
   role, actor, or publication fields.
3. A learner can report a visible published post through an accessible reason
   control. The client uses one stable key for retries, renders created/replayed,
   unavailable, conflict, and retryable states safely, and never reveals
   whether a hidden/unpublished target exists.
4. A backend-authorized moderator can access a queue with bounded pagination,
   safe post fields, report count, and reason categories. A learner or denied
   role sees an explicit forbidden/auth state and no moderation data.
5. An authorized moderator can apply only the server-approved decisions and
   sees pending/success/replayed/conflict/error states. The UI does not perform
   transitions locally, infer publication, or expose actor IDs, private report
   text, audit attributes, claims, credentials, or provider data.
6. The surface follows `docs/09_UI_DESIGN_SYSTEM.md`: mobile-first from 360px,
   44px controls, visible focus, semantic status beyond color, reduced-motion
   safe behavior, no horizontal overflow, and useful next actions for empty,
   unavailable, auth, forbidden, and retryable states.
7. Browser tests cover authenticated learner listing, pagination, empty/error/
   retry, bounded submit and stable idempotency retry, report flow, safe
   redaction, moderator role gating, queue pagination, decision replay/conflict,
   duplicate-click prevention, malformed/unknown field fail-closed behavior,
   keyboard use, mobile layout, and accessibility smoke coverage.
8. No API/schema/migration/provider/package/environment/CI or Phase 6 change is
   introduced. Existing learner/admin/browser journeys remain green.

## Implementation constraints

- Before editing, inspect the EP5-ST010 done story, its API contract, current
  learner API client, auth-session model, shared UI patterns, route conventions,
  and existing Playwright fixtures.
- Keep `apps/web/src/app/community/page.tsx` thin. Put API parsing/types in
  `entities/community` or `features/community`, state/query/mutation logic in
  feature modules, and rendering in `widgets/community`.
- Reuse the existing `requestLearnerApi` and `readSession`; do not create a
  second API client, client-side owner/role store, or local publication policy.
- Use strict response schemas/allowlists with bounded strings and enum values.
  Unknown root/data/meta fields, sensitive fields, malformed pagination, and
  inconsistent outcomes fail closed. Do not display raw response/error text.
- Keep one stable idempotency key per logical mutation attempt. Retries reuse
  the key; duplicate clicks are disabled while pending; late responses cannot
  overwrite a newer attempt.
- Do not use a generated visual asset or image service for this dense learning
  surface. Apply the approved paper/off-white, ink, green, amber, border, and
  semantic error tokens; no arbitrary colors or gradients.

## Required UI states

- `loading`: skeletons approximate post/queue layout.
- `success`: allowlisted posts/queue and explicit pagination status.
- `empty`: explain that no published posts or moderation items are available.
- `auth`: provide sign-in action without rendering private data.
- `forbidden`: explain that moderation access is backend-controlled.
- `error`: generic retry action; preserve unsent draft and mutation keys.
- `pending`: indicate server review/decision is still authoritative.
- `replayed`: say the earlier server result was restored; do not duplicate UI
  content or audit claims.
- `conflict/unavailable`: explain safe limitation and preserve learner context.

## Verification

- `pnpm --filter web lint`
- `pnpm --filter web typecheck`
- `pnpm format:check`
- `pnpm planning:traceability`
- `pnpm e2e -- tests/e2e/community-sharing.spec.ts`
- `pnpm e2e`
- `pnpm story:verify stories/in-progress/EP5-ST011-community-sharing-and-moderation-ui.md`
- `pnpm story:checks`
- `git diff --check`

## Definition of done

The community UI is a safe vertical slice over EP5-ST010, with explicit
learner/moderator states, stable idempotent mutations, server-owned decisions,
allowlisted rendering, mobile/accessibility evidence, targeted and full gates
passing, and no backend or Phase 6 changes.
