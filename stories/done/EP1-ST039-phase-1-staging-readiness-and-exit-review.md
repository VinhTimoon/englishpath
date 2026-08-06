---
id: EP1-ST039
title: Phase 1 Staging Readiness and Exit Review
status: done
type: release
priority: critical
phase: phase-1-learning-core
risk: high
delivery_mode: full-review
depends_on:
  - EP1-ST030
  - EP1-ST038
blocked_by:
  - notes/ai-req/2026-08-06-ep1-st038-observability-provider-launch.md
allowed_paths:
  - docs/11_SECURITY_PLAN.md
  - docs/12_DEPLOYMENT_PLAN.md
  - docs/13_DECISION_LOG.md
  - tests/e2e/**
  - .github/workflows/**
  - stories/blocked/EP1-ST039-phase-1-staging-readiness-and-exit-review.md
  - stories/review/EP1-ST039-phase-1-staging-readiness-and-exit-review.md
  - stories/done/EP1-ST039-phase-1-staging-readiness-and-exit-review.md
  - stories/blocked/EP1-ST038-analytics-monitoring-and-launch-dashboards.md
  - stories/done/EP1-ST038-analytics-monitoring-and-launch-dashboards.md
  - notes/ai-req/2026-08-06-ep1-st038-observability-provider-launch.md
  - _bmad-output/planning-artifacts/story-map.md
  - _bmad-output/planning-artifacts/epic-map.md
  - _bmad-output/implementation-artifacts/sprint-status.yaml
forbidden_paths:
  - production credentials
  - provider configuration before owner approval
  - destructive migration
  - firewall or DNS changes
  - main
max_fix_rounds: 2
requires_human_approval: true
owner_deferred: true
---

# Story: Phase 1 Staging Readiness and Exit Review

## Goal

Prove the Phase 1 learner core on staging or an equivalent controlled environment,
then record the owner-controlled release decision.

## Acceptance Criteria

- Auth, ownership, learner progress, vocabulary/SRS, daily practice, error notebook,
  content rights, browser accessibility, and observability evidence are collected.
- No known P0/P1 remains and `dev` is clean before a human-controlled promotion.
- Staging/deployment/production approval is recorded by the owner and no automatic
  promotion reaches `main`.

## Historical Blocked Report

This exit story depended on the real observability launch decision in
`notes/ai-req/2026-08-06-ep1-st038-observability-provider-launch.md`. The owner has
resolved that decision by selecting Option 3: the Phase 1 beta remains on local/no-op
observability and real provider activation is deferred.

## Owner-Deferred Completion Evidence

- Learner core browser journeys and API E2E provide controlled local-equivalent
  evidence on the approved ports `4173` and `3005`.
- Auth, ownership, progress, vocabulary/SRS, daily practice, Error Notebook, content
  governance, accessibility, and redaction gates are green.
- `dev` is clean and synchronized; no promotion to `main` occurred.
- This is a beta exit with real-provider activation and production deployment
  explicitly owner-deferred, not a claim that PostHog/Sentry or production staging
  has been activated.
- Verification passed on the local equivalent environment: API E2E 7 suites/48
  tests, browser E2E 46/46, unit 38 suites/298 tests, and all repository quality
  gates. The configured application ports are API `3005` and web `4173`.

## Verification

- `node scripts/story-doctor.mjs stories/done/EP1-ST039-phase-1-staging-readiness-and-exit-review.md`
- `pnpm story:verify stories/done/EP1-ST039-phase-1-staging-readiness-and-exit-review.md`
- `pnpm format:check`
- `pnpm planning:traceability`
- `pnpm --filter api test:e2e -- --runInBand`
- `pnpm e2e`
- `git diff --check`
