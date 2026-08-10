---
id: EP4-ST007
title: Provider-Neutral Advisory Feedback Gateway and Quota Boundary
status: review
type: backend
priority: high
phase: phase-4-toeic-speaking-writing-and-four-skills
depends_on:
  - EP0-ST022
allowed_paths:
  - apps/api/src/modules/ai-gateway/**
  - apps/api/src/modules/access/**
  - apps/api/src/modules/observability/**
  - apps/api/src/modules/identity/**
  - apps/api/src/modules/toeic/**
  - apps/api/src/modules/prisma/**
  - apps/api/test/**
  - apps/api/prisma/schema.prisma
  - apps/api/prisma/migrations/**
  - apps/api/src/generated/prisma/**
  - docs/01_PRODUCT_SCOPE.md
  - docs/04_SYSTEM_ARCHITECTURE.md
  - docs/06_BACKEND_ARCHITECTURE.md
  - docs/07_DATABASE_DESIGN.md
  - docs/08_API_CONTRACT.md
  - docs/10_TEST_STRATEGY.md
  - docs/11_SECURITY_PLAN.md
  - stories/**
  - _bmad-output/implementation-artifacts/sprint-status.yaml
  - _bmad-output/planning-artifacts/story-map.md
forbidden_paths:
  - apps/api/.env
  - apps/api/src/modules/auth/**
  - apps/api/src/modules/library/**
  - apps/api/src/modules/practice/**
  - apps/web/**
  - package.json
  - pnpm-lock.yaml
  - .github/**
  - main
requires_human_approval: false
max_fix_rounds: 2
risk: high
delivery_mode: full
---

# Story: Provider-Neutral Advisory Feedback Gateway and Quota Boundary

## Goal

Create the backend-only boundary that can later serve advisory Speaking/Writing
feedback without exposing provider credentials, official scores, or unsafe AI
output, while enforcing server-owned quota and auditable cost metadata.

## Scope

Implement provider-neutral request validation, quota decision, model/prompt
version metadata, redaction, structured-output validation, deterministic local
adapter behavior, and usage/cost evidence. Do not activate a paid provider,
change billing/quota in an external system, generate official scores, or build
learner UI/workers in this story.

## Acceptance Criteria

- All feedback requests enter through one backend gateway and are authenticated
  and owner-scoped; frontend code cannot call a provider or grant quota.
- Gateway contracts validate feature, skill, prompt version, bounded input,
  response schema, and policy version. Invalid or unsafe output fails closed.
- Quota decisions are deterministic and server-owned, with explicit allowed,
  denied, and provider-unavailable outcomes. Every attempted request records
  model/provider-neutral metadata, prompt version, quota result, estimated cost,
  and correlation evidence without secrets or raw claims.
- Local/no-op adapter tests provide deterministic behavior without paid API,
  production credentials, external network, or provider activation. Existing
  observability adapters are reused.
- Learner-safe output is advisory-only and cannot set an official TOEIC score,
  mutate progress, reveal rubric weights/hidden prompts, or include provider
  credentials/raw responses. Ownership and redaction are regression-tested.
- Persistence changes, if needed, are additive, owner-scoped, documented, and
  use PrismaService/repository boundaries. No destructive migration or external
  quota/billing change is allowed.
- Unit/API coverage proves quota boundaries, redaction, schema validation,
  retry/idempotency semantics, unavailable fallback, ownership isolation, and
  existing auth/TOEIC regression.
- If approved quota/cost policy, schema, licensed prompt source, or any paid
  provider activation is missing, create an AI request and block this story;
  never guess a cost, quota, or provider contract.

## Verification

- `node scripts/story-doctor.mjs stories/ready/EP4-ST007-provider-neutral-ai-feedback-gateway.md`
- `pnpm story:verify stories/in-progress/EP4-ST007-provider-neutral-ai-feedback-gateway.md`
- `pnpm --filter api test -- --runInBand "ai|observability|access|toeic"`
- `pnpm --filter api test:e2e -- toeic-practice.e2e-spec.ts toeic-timed-test.e2e-spec.ts`
- `pnpm prisma:validate`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm e2e`
- `git diff --check`

## Implementation Guardrails

- Keep controller -> service -> repository/gateway layering; providers are
  adapters behind the gateway and must never be called from frontend code.
- Reuse existing observability, identity, access, and safe-projection patterns.
- Do not add provider credentials, paid API calls, external billing/quota
  configuration, official scoring, or Phase 5 AI features.
- Do not run destructive migrations. Stop with an AI request if a required
  owner/product/policy decision is missing.

## Definition of Done

The gateway is provider-neutral, quota-aware, auditable, redacted, owner-safe,
deterministically testable with local adapters, documented, and ready for later
feedback workers without activating a provider.

## Story Creation Notes

- EP0-ST022 observability foundation is done.
- EP4-ST002 and EP4-ST005 remain blocked by separate source/persistence AI
  requests; this story is independent and does not resume either story.

## AI Request

This story is blocked because the approved quota/cost policy, advisory response
schema, policy/prompt versions, and licensed prompt source are not present.

AI request file: `notes/ai-req/2026-08-10-ep4-st007-provider-neutral-feedback-gateway-policy.md`


## Owner Decision / Recovery Record

- Owner approved the safe beta policy on 2026-08-10 and authorized resuming
  this same story; no recovery story is created.
- Policy version is feedback-gateway-v1; the local deterministic/no-op adapter
  is the only active adapter and reports zero estimated provider cost.
- Each authenticated learner has 10 requests per UTC calendar day. Outcomes
  are explicit ALLOWED, DENIED, and PROVIDER_UNAVAILABLE; exact retries
  replay the original result and changed idempotency payloads conflict.
- Output is bounded advisory-only feedback and cannot set official scores,
  mutate progress, expose hidden prompts/rubric internals, or return provider
  data, credentials, or raw response content.
- Persistence is additive and owner-scoped usage evidence only. No paid
  provider, external quota/billing system, credential, or network call is
  activated.

## Implementation Tasks

- [x] Add the authenticated gateway contract and strict request/output policy.
- [x] Add deterministic local adapter, quota, exact replay, and unavailable
  handling.
- [x] Add owner-scoped usage/cost evidence persistence and safe API response.
- [x] Add unit/API regression coverage and documentation.
- [x] Run full quality gates.

## Implementation Record

- Added the authenticated ai-gateway route and strict feature/skill,
  prompt-version, task, input, and idempotency validation.
- Added the deterministic LOCAL_NOOP adapter with policy version
  feedback-gateway-v1, zero estimated cost, bounded advisory-only output, and
  fail-closed unavailable handling.
- Added additive AiFeedbackUsage persistence with owner/idempotency
  uniqueness, request fingerprints, UTC quota remainder, outcome, correlation,
  and neutral adapter/model evidence. Raw input/provider response is not
  persisted or returned.

## Verification Evidence

- Story doctor and story verification passed.
- Prisma validation and generated-client TypeScript validation passed.
- Focused gateway unit: 1 suite / 4 tests passed.
- Focused gateway API E2E: 1 suite / 2 tests passed.
- ai/observability/access/toeic regression: 27 suites / 198 tests passed.
- Gateway/TOEIC practice/timed-test E2E: 2 suites / 21 tests passed.
- Full lint, typecheck, test (68 suites / 480 tests), and build passed.
- Full browser E2E: 87/87 passed on port 4173 after one transient
  Chromium ERR_NO_BUFFER_SPACE rerun; the affected vocabulary test also passed
  independently.
- git diff --check passed.

## High-risk Review Evidence

- Every request resolves ownership from the authenticated application
  principal; the repository and uniqueness key include user id.
- The learner projection is allowlisted and excludes raw input/output,
  provider/credential fields, hidden prompts, rubric internals, official
  scores, and progress mutation.
- Quota and idempotency are server-owned; exact retries replay persisted
  outcomes and changed payloads conflict. No paid provider, network call, or
  external quota/billing system is activated.

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
