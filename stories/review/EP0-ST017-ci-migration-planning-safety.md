---
id: EP0-ST017
title: CI Migration And Planning Safety
status: review
type: tooling
priority: critical
phase: phase-0-foundation
allowed_paths:
  - .github/workflows/**
  - package.json
  - scripts/run-checks.mjs
  - scripts/planning-traceability.mjs
  - scripts/tests/**
  - docs/12_DEPLOYMENT_PLAN.md
  - stories/**
forbidden_paths:
  - notes/**
  - apps/api/src/**
  - apps/web/src/**
  - apps/api/prisma/schema.prisma
  - apps/api/prisma/migrations/**
  - .env
requires_human_approval: false
max_fix_rounds: 3
---

# Story: CI Migration And Planning Safety

## Goal

Add credential-free GitHub CI, non-destructive migration safeguards, and automated v2
planning traceability checks so later stories fail early and reproducibly.

## Dependency

- Requires `EP0-ST016` architecture/data/API/security baseline to be completed on
  `dev` so CI and migration checks implement approved conventions.
- Must complete before `EP0-ST018` browser E2E foundation begins.

## Requirements

- Add GitHub Actions for frozen install, formatting/traceability, lint, typecheck,
  unit tests, API e2e, and production builds.
- Use supported Node/pnpm versions and caching without production secrets.
- Add a deterministic semantic checker for unique and complete `FR-001` to `FR-029`,
  `NFR-001` to `NFR-017`, and `UF-001` to `UF-013` definitions/map coverage.
- Integrate the checker into local story checks and CI with focused tool tests.
- Validate the existing Prisma schema without applying a migration or requiring a
  shared/production database.
- Document migration expand/migrate/contract policy, review requirements, rollback
  notes, backup prerequisites, and explicit owner approval for destructive changes.
- CI must never migrate a production/shared database, promote `main`, deploy, or
  require paid-service credentials.
- Preserve existing local checks and Windows loop behavior.

## Acceptance Criteria

- CI runs all required quality gates from a clean checkout.
- Missing/duplicate requirement IDs or map coverage fail locally and in CI.
- Migration checks are validation-only and no schema/migration is changed.
- Failure messages identify the broken gate and are covered by tests.
- Project checks, diff check, story verification, and read-only review pass without
  P0/P1 findings.

## Pre-Loop Evidence

- Ready-only story-doctor passed before `EP0-ST017` moved from `ready` to
  `in-progress`; that historical ready-path command is preserved as pre-loop evidence
  and is not rerun as a final-state verification command.

## Verification

- pnpm tool:test
- node scripts/planning-traceability.mjs
- pnpm story:checks
- git diff --check
