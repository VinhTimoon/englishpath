---
id: EP5-ST010
title: Community content reporting and moderation API
status: done
type: backend
priority: high
phase: phase-5-full-test-adaptive-ai-and-community
risk: high
delivery_mode: full-review
depends_on:
  - EP1-ST028
allowed_paths:
  - apps/api/prisma/schema.prisma
  - apps/api/prisma/migrations/**
  - apps/api/src/generated/**
  - apps/api/src/modules/community/**
  - apps/api/src/modules/audit/**
  - apps/api/src/app.module.ts
  - apps/api/test/**
  - docs/06_BACKEND_ARCHITECTURE.md
  - docs/07_DATABASE_DESIGN.md
  - docs/08_API_CONTRACT.md
  - docs/10_TEST_STRATEGY.md
  - docs/11_SECURITY_PLAN.md
  - docs/13_DECISION_LOG.md
  - stories/**
  - _bmad-output/implementation-artifacts/sprint-status.yaml
  - _bmad-output/planning-artifacts/story-map.md
forbidden_paths:
  - apps/api/.env*
  - apps/web/**
  - package.json
  - pnpm-lock.yaml
  - .github/**
  - provider credentials or direct provider calls
  - production data or shared Supabase migrations
  - main
  - destructive migrations
requires_human_approval: false
max_fix_rounds: 2
---

# Story: Community content reporting and moderation API

Implemented the authenticated, owner-scoped community post/report API and
role-protected moderation queue/decision API. Posts use a pending-review
server-owned lifecycle; reports are bounded and idempotent; moderation
decisions use compare-and-set transitions, transaction-scoped audit writes, and
safe redacted projections. The additive Prisma migration is local evidence only
and was not applied to shared Supabase or production.

## Verification evidence

- `pnpm format:check`
- `pnpm planning:traceability`
- `pnpm tool:test` — 59 passed
- `pnpm prisma:validate`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test` — 77 suites, 549 tests passed
- `pnpm --filter api test:e2e` — 26 suites, 147 tests passed
- `pnpm build`
- `pnpm e2e` — 109 passed on web port 4173
- `node scripts/story-doctor.mjs stories/in-progress/EP5-ST010-community-content-report-and-moderation-api.md`
- `pnpm story:verify stories/in-progress/EP5-ST010-community-content-report-and-moderation-api.md`
- `git diff --check`

## Review evidence

Risk-high full review completed. Findings were fixed within the story's two
fix rounds: whitespace-only content rejection, repository transaction/API
coverage, explicit learner projection shaping, compare-and-set moderation
transitions, and safe unique-constraint replay handling. No external provider,
credential, shared database, frontend, package, or production change was made.
