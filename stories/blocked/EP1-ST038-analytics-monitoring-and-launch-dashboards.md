---
id: EP1-ST038
title: Analytics Monitoring Integration and Launch Dashboards
status: blocked
type: infrastructure
priority: high
phase: phase-1-learning-core
risk: high
delivery_mode: full-review
depends_on:
  - EP0-ST022
  - EP1-ST027
blocked_by:
  - notes/ai-req/2026-08-06-ep1-st038-observability-provider-launch.md
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
  - notes/ai-req/2026-08-06-ep1-st038-observability-provider-launch.md
  - _bmad-output/planning-artifacts/story-map.md
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

## Blocked Report

Implementation is paused because real provider accounts/configuration and production
credentials require owner approval. The exact decision, options, recommendation,
technical evidence, and continuation steps are recorded in:

`notes/ai-req/2026-08-06-ep1-st038-observability-provider-launch.md`

Do not resume this story until that request is approved or the owner explicitly
accepts the owner-deferred beta exit.

## Verification

- `node scripts/story-doctor.mjs stories/blocked/EP1-ST038-analytics-monitoring-and-launch-dashboards.md`
- `pnpm story:verify stories/blocked/EP1-ST038-analytics-monitoring-and-launch-dashboards.md`
- After approval: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm e2e`
- After approval: provider redaction, retention, retry, dashboard, and alert checks
