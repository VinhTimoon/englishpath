---
id: EP1-ST039
title: Phase 1 Staging Readiness and Exit Review
status: blocked
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
  - _bmad-output/planning-artifacts/story-map.md
  - _bmad-output/implementation-artifacts/sprint-status.yaml
forbidden_paths:
  - production credentials
  - provider configuration before owner approval
  - destructive migration
  - firewall or DNS changes
  - main
max_fix_rounds: 2
requires_human_approval: true
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

## Blocked Report

This exit story depends on the real observability launch decision in
`notes/ai-req/2026-08-06-ep1-st038-observability-provider-launch.md`. It must not be
resumed or marked done until ST038 is resolved and the owner supplies the staging or
equivalent-environment evidence and release decision.

## Verification

- `node scripts/story-doctor.mjs stories/blocked/EP1-ST039-phase-1-staging-readiness-and-exit-review.md`
- `pnpm story:verify stories/blocked/EP1-ST039-phase-1-staging-readiness-and-exit-review.md`
- After ST038 approval: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm e2e`
- After owner staging decision: attach authentic staging smoke and release evidence
