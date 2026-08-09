---
id: EP1-ST038
title: Analytics Monitoring Integration and Launch Dashboards
status: done
type: infrastructure
priority: high
phase: phase-1-learning-core
risk: high
delivery_mode: full-review
depends_on:
  - EP0-ST022
  - EP1-ST027
blocked_by:
  - notes/ai-req/**
allowed_paths:
  - apps/api/src/modules/observability/**
  - apps/api/src/modules/admin/**
  - apps/api/test/**
  - apps/web/src/app/admin/**
  - apps/web/src/features/admin/**
  - apps/web/src/widgets/admin/**
  - docs/04_SYSTEM_ARCHITECTURE.md
  - docs/11_SECURITY_PLAN.md
  - docs/12_DEPLOYMENT_PLAN.md
  - stories/blocked/EP1-ST038-analytics-monitoring-and-launch-dashboards.md
  - stories/review/EP1-ST038-analytics-monitoring-and-launch-dashboards.md
  - stories/done/EP1-ST038-analytics-monitoring-and-launch-dashboards.md
  - stories/blocked/EP1-ST039-phase-1-staging-readiness-and-exit-review.md
  - stories/done/EP1-ST039-phase-1-staging-readiness-and-exit-review.md
  - notes/ai-req/**
  - _bmad-output/planning-artifacts/story-map.md
  - _bmad-output/planning-artifacts/epic-map.md
  - _bmad-output/implementation-artifacts/sprint-status.yaml
forbidden_paths:
  - production credentials
  - provider configuration before owner approval
  - apps/api/.env
  - apps/web/.env.local
  - "**/package.json"
  - "**/pnpm-lock.yaml"
  - destructive migrations
  - main
max_fix_rounds: 2
requires_human_approval: true
owner_deferred: true
---

# Story: Analytics Monitoring Integration and Launch Dashboards

## Goal

Provide approved, privacy-safe learner/product telemetry and operational dashboards
for Phase 1 launch without activating an external provider without owner authority.

## Acceptance Criteria

- Approved analytics and monitoring adapters receive only bounded, redacted events.
- Launch dashboards cover the documented API, learner, and operational signals and
  have named alert ownership.
- Provider credentials, retention, privacy, retry/buffering, and budget decisions are
  recorded before activation.
- Local/no-op adapters remain usable without credentials and all safety tests pass.

## Historical Blocked Report

Implementation was paused because real provider accounts/configuration and production
credentials required owner approval. The owner selected Option 3; the owner-approved
decision is recorded in this story and the decision log.

The real PostHog/Sentry activation remains explicitly deferred. The existing
local/no-op adapters are the approved Phase 1 beta path.

## Owner-Deferred Completion Evidence

- Owner decision confirmed Option 3 on 2026-08-06.
- No provider credentials, provider configuration, network calls, or paid services
  were introduced.
- Existing local/no-op adapters remain bounded and redacting; their tests and the
  repository-wide learner/security gates pass.
- Verification passed: observability 2 suites/33 tests, unit 38 suites/298 tests,
  API E2E 7 suites/48 tests, browser E2E 46/46, tool tests 59/59, formatting,
  traceability, Prisma validation, lint, typecheck, build, and diff check.
- Real provider dashboards, alert delivery, retention configuration, and production
  activation remain deferred and are not claimed as complete.

## Verification

- `node scripts/story-doctor.mjs stories/done/EP1-ST038-analytics-monitoring-and-launch-dashboards.md`
- `pnpm story:verify stories/done/EP1-ST038-analytics-monitoring-and-launch-dashboards.md`
- `pnpm --filter api test -- observability --runInBand`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm e2e`
- `git diff --check`
