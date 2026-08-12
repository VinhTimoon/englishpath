---
id: EP5-ST012
title: AI quota, cost, and abuse operations dashboard
status: ready
type: full-stack
priority: high
phase: phase-5-full-test-adaptive-ai-and-community
risk: high
delivery_mode: full-review
depends_on:
  - EP5-ST007
  - EP5-ST008
  - EP5-ST009
allowed_paths:
  - apps/api/src/modules/ai-gateway/**
  - apps/api/src/modules/admin/**
  - apps/api/src/modules/audit/**
  - apps/api/src/modules/observability/**
  - apps/api/test/**
  - apps/api/prisma/schema.prisma
  - apps/api/prisma/migrations/**
  - apps/web/src/entities/admin/**
  - apps/web/src/features/admin/**
  - apps/web/src/widgets/admin/**
  - apps/web/src/app/admin/**
  - tests/e2e/ai-operations-dashboard.spec.ts
  - docs/06_BACKEND_ARCHITECTURE.md
  - docs/07_DATABASE_DESIGN.md
  - docs/08_API_CONTRACT.md
  - docs/09_UI_DESIGN_SYSTEM.md
  - docs/10_TEST_STRATEGY.md
  - docs/11_SECURITY_PLAN.md
  - docs/13_DECISION_LOG.md
  - stories/**
  - _bmad-output/implementation-artifacts/sprint-status.yaml
  - _bmad-output/planning-artifacts/story-map.md
forbidden_paths:
  - apps/web/.env*
  - package.json
  - pnpm-lock.yaml
  - .github/**
  - production credentials or provider configuration
  - paid AI calls, external billing/quota systems, or shared Supabase changes
  - destructive migrations
  - main
  - Phase 6
requires_human_approval: false
max_fix_rounds: 2
---

# Story: AI quota, cost, and abuse operations dashboard

## Goal

Give authorized EnglishPath operators a safe, actionable view of the existing
server-owned AI gateway usage and abuse signals. Reuse the persisted
`AiFeedbackUsage`, existing admin authentication/RBAC, redacted audit, and
local/no-op provider boundary. This story is an operational projection only:
it must not activate a paid provider, alter quota policy, expose learner input,
or make a product/entitlement decision.

## Scope

Implement one role-gated admin operations surface for `CONTENT_EDITOR`,
`ADMIN`, and `SUPER_ADMIN` according to the existing admin conventions. It may
show bounded aggregate usage/cost/outcome/quota metrics, recent safe events,
and explicit unavailable/empty states. Any abuse indicator or action must be a
server-owned, redacted projection and must not expose raw prompts, feedback,
submissions, provider payloads, credentials, idempotency keys, fingerprints,
learner identity, or audit rows.

Do not change the approved quota, policy, prompt, provider, billing,
entitlement, or observability adapter contracts. Do not add Phase 6 work.

## Existing boundaries to preserve

- `AiFeedbackUsage` is owner-scoped cost/policy evidence with feature, skill,
  policy/prompt versions, neutral adapter/model labels, outcome, quota
  remainder, correlation ID, and bounded advisory JSON.
- AI gateway operations remain backend-owned and authenticated; the browser
  cannot choose identity, quota, provider, cost, abuse disposition, or scope.
- Admin roles use active persisted application identity and existing
  `AdminAuthenticationGuard`, `AdminRoleGuard`, `RequireAnyRole`, and sanitized
  response envelopes.
- Observability adapters receive only flat, bounded, redacted scalar data.
- If the existing schema or approved contract lacks a safe aggregation or
  abuse semantic, stop and mark this story blocked with an AI request rather
  than guessing or exposing raw data.

## Acceptance Criteria

1. An authenticated `CONTENT_EDITOR`, `ADMIN`, or `SUPER_ADMIN` receives a
   bounded operations projection from a documented API endpoint using the
   existing admin guards and correlation metadata. A learner, inactive
   identity, unknown role, or missing/invalid token receives the existing safe
   auth/forbidden boundary and no operations data.
2. The projection reports only approved aggregate fields: bounded time window,
   total requests, allowed/denied/unavailable/replayed outcomes, quota-denial
   count, zero/non-zero estimated cost aggregate as already persisted, and
   bounded feature/skill summaries. Values are computed server-side and never
   derived from client assumptions.
3. A bounded recent-event list is optional only if the current approved
   contract supports it. If present, it contains safe event identifiers or
   timestamps, outcome, feature/skill, policy/prompt version, neutral
   adapter/model labels, quota remainder, and cost; it excludes user IDs,
   correlation IDs, idempotency keys, fingerprints, raw input/output,
   feedback JSON, prompts, provider payloads, and credentials.
4. Abuse signals are limited to already approved persisted scalar markers or
   aggregate counts. The UI must label them as operational signals, not proof
   of wrongdoing; no automatic suspension, quota mutation, moderation action,
   or entitlement change is introduced.
5. The UI is mobile-first and accessible at 360px: loading, success, empty,
   unavailable, retryable error, auth, and forbidden states are explicit;
   sensitive values are never rendered; keyboard/focus/reduced-motion and no
   horizontal overflow follow the UI design system.
6. API/client response schemas are strict allowlists and fail closed on unknown
   fields, malformed windows, inconsistent counts, sensitive fields, or
   unapproved outcomes. Pagination/window parameters are bounded and
   server-owned.
7. Unit/API/E2E coverage proves role gating, owner/data redaction, aggregate
   arithmetic from persisted usage evidence, zero-cost local/no-op behavior,
   unavailable provider behavior, quota denials, duplicate/replayed outcomes,
   malformed responses, mobile accessibility, and safe retry states.
8. No paid provider, external billing/quota, credential, package, environment,
   CI, destructive migration, or Phase 6 change is introduced. Existing AI,
   admin, learner, and browser journeys remain green.

## Verification commands

- `pnpm prisma:validate`
- `pnpm --filter api lint`
- `pnpm --filter api typecheck`
- `pnpm --filter web lint`
- `pnpm --filter web typecheck`
- `pnpm format:check`
- `pnpm planning:traceability`
- `pnpm test --filter api`
- `pnpm --filter api test:e2e`
- `pnpm e2e -- tests/e2e/ai-operations-dashboard.spec.ts`
- `pnpm e2e`
- `pnpm build`
- `pnpm story:verify stories/ready/EP5-ST012-ai-quota-cost-abuse-operations-dashboard.md`
- `pnpm story:checks`
- `git diff --check`

## Definition of done

The operations surface is a server-owned, role-gated, redacted projection of
existing AI usage evidence, with no invented quota/cost/abuse semantics, no
provider activation, complete quality-gate evidence, and no unrelated story
implementation.
