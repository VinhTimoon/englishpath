---
id: EP5-ST007
title: AI explanation service and grounded fallback
status: ready-for-dev
type: backend
priority: high
phase: phase-5-full-test-adaptive-ai-and-community
depends_on:
  - EP4-ST007
allowed_paths:
  - apps/api/src/modules/ai-gateway/**
  - apps/api/src/modules/practice/**
  - apps/api/test/**
  - docs/04_SYSTEM_ARCHITECTURE.md
  - docs/06_BACKEND_ARCHITECTURE.md
  - docs/08_API_CONTRACT.md
  - docs/10_TEST_STRATEGY.md
  - docs/11_SECURITY_PLAN.md
  - docs/13_DECISION_LOG.md
  - stories/**
  - _bmad-output/implementation-artifacts/sprint-status.yaml
  - _bmad-output/planning-artifacts/story-map.md
forbidden_paths:
  - apps/api/.env
  - apps/api/prisma/schema.prisma
  - apps/api/prisma/migrations/**
  - apps/api/src/modules/auth/**
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

# Story: AI explanation service and grounded fallback

## Goal

Give an authenticated learner a useful explanation for an existing private
Error Notebook entry through the approved AI gateway boundary, while keeping a
deterministic grounded fallback available when no provider is configured.

## Scope

Add an additive explanation request to the existing gateway. The request uses
only the authenticated owner, a validated Error Notebook source and question
reference, and the existing persisted explanation. The backend returns a safe
advisory projection and records the request through the existing owner-scoped
quota, idempotency, policy-version, and cost-evidence boundary.

The local fallback is not an official score, rubric decision, provider result,
or AI claim. It may only reproduce the already persisted learner-safe
explanation and bounded next-step guidance. No raw answer, correct option,
submission, provider metadata, credential, hidden prompt, or arbitrary client
text may enter or leave this route.

Do not add a provider, paid API, credential, schema field, migration, frontend
feature, or Phase 6 work. If the current Error Notebook contract cannot
resolve an owner-scoped explanation for the requested source/reference, return
an explicit safe unavailable outcome and do not fabricate explanation content.

## Acceptance Criteria

1. An authenticated `POST /api/v1/ai-gateway/explanation` accepts only a
   validated `source` (`PRACTICE` or `TOEIC_TIMED_TEST`) and bounded
   `questionId`, plus the required `Idempotency-Key`. Identity, prompt version,
   provider, quota, explanation text, answers, and priorities are server-owned.
2. The service resolves the explanation through a narrow owner-scoped practice
   repository port using the authenticated application user. A learner cannot
   request another learner's Error Notebook explanation by changing source or
   question reference.
3. Existing Error Notebook explanation text is the only grounding material.
   The response is allowlisted and advisory-only; it never exposes correct
   options, selected answers, raw submissions, provider data, credentials,
   prompt internals, official scores, or rubric internals.
4. The route reuses the existing UTC-day quota, idempotency replay/conflict,
   correlation metadata, usage evidence, and zero-cost behavior. Exact replay
   returns the original safe result; reuse of a key with a different owner or
   request conflicts and does not leak the prior result.
5. When the owner-scoped explanation is missing, malformed, or unavailable,
   the response is an explicit unavailable outcome with `feedback: null`; the
   service does not call an external provider or invent text. Existing
   Speaking/Writing feedback behavior remains unchanged.
6. The implementation preserves controller -> service -> repository/adapter
   layering and keeps the current gateway endpoint backward compatible. No
   Prisma schema or migration changes are needed.
7. Unit/API/E2E regression coverage proves authentication, owner isolation,
   source/reference validation, safe redaction, grounded success, unavailable
   fallback, quota denial, exact replay, idempotency conflict, correlation
   metadata, and unchanged Speaking/Writing gateway behavior.
8. Architecture, API, security, and test documentation records the grounded
   fallback contract, allowlist, explicit unavailable semantics, and the
   prohibition on provider/official-score claims.

## Verification commands

```text
node scripts/story-doctor.mjs stories/ready/EP5-ST007-ai-explanation-grounded-fallback.md
pnpm planning:traceability
pnpm --filter api exec jest --runInBand src/modules/ai-gateway/**/*.spec.ts src/modules/practice/**/*.spec.ts
pnpm --filter api test:e2e -- ai-gateway.e2e-spec.ts practice.e2e-spec.ts
pnpm --filter api lint
pnpm --filter api typecheck
pnpm format:check
pnpm story:verify stories/ready/EP5-ST007-ai-explanation-grounded-fallback.md
pnpm story:checks
git diff --check
```

## Definition of Done

The explanation route is authenticated, owner-scoped, quota/idempotency-safe,
grounded only in persisted Error Notebook explanations, explicitly unavailable
when grounding is absent, covered by unit/API/E2E tests, documented, and all
required project gates pass without schema/provider/frontend changes.
