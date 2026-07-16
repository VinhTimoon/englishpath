---
id: EP0-ST007
title: API E2E Prisma Jest Compatibility
status: done
type: testing
priority: high
phase: phase-0-foundation
allowed_paths:
  - apps/api/test/**
  - apps/api/package.json
  - scripts/run-checks.mjs
  - scripts/tests/**
  - stories/**
  - docs/10_TEST_STRATEGY.md
forbidden_paths:
  - apps/api/src/**
  - apps/api/prisma/**
  - apps/api/src/generated/**
  - apps/web/**
  - packages/**
  - .env
  - apps/api/.env
requires_human_approval: false
max_fix_rounds: 2
---

# Story: API E2E Prisma Jest Compatibility

## Goal

Restore the API end-to-end test suite under Prisma 7 and make it validate the
current health endpoint without requiring a live database.

## Business Rules

- Automated e2e tests must be deterministic and must not depend on developer
  secrets or a reachable external database.
- Prisma generated source must remain untouched.
- The test must exercise the Nest application/module wiring and HTTP route.
- The health API contract remains the source of truth for response shape.

## Requirements

- Configure the API e2e Jest resolver to support TypeScript files generated with
  NodeNext-style relative `.js` imports.
- Override the database boundary in the e2e testing module instead of connecting
  to Supabase/PostgreSQL.
- Add an HTTP e2e assertion for `GET /api/v1/health`.
- Keep or update the root route assertion only if it remains useful.
- Ensure the API e2e command is included in the repository quality checks so it
  cannot regress silently.
- Add focused tooling coverage if the quality-check runner is changed.
- Do not modify application source or Prisma generated files.

## Acceptance Criteria

- `pnpm --filter api test:e2e` passes without `DATABASE_URL`.
- Jest resolves Prisma generated relative `.js` imports to their TypeScript source.
- `GET /api/v1/health` returns `200` with `status: ok`, `api: running`,
  `database: connected`, and a valid ISO timestamp under the mocked database boundary.
- `pnpm story:checks` executes the API e2e suite and remains green.
- Existing unit tests, typecheck, lint, and builds remain green.

## Verification

- pnpm story:test
- node scripts/story-doctor.mjs stories/ready/EP0-ST007-api-e2e-prisma-jest.md --ready-only
- pnpm --filter api test:e2e
- pnpm story:checks
- git diff --check



## Recovery Report

- Failed step: "node" "scripts/codex-runner.mjs" "plan" ".codex-plan-task.md"
- Exit code: 1
- Attempts: 3
- Summary: The automated loop could not complete this story.
- Recovery: The outer project manager implemented the plan direction established before the Windows Agent sandbox failed to write `.codex-plan.md`.

### Evidence

```text
Command failed with exit code 1: "node" "scripts/codex-runner.mjs" "plan" ".codex-plan-task.md"
```

## Verification Report

- `pnpm story:test`: passed, 28/28 tests.
- `pnpm --filter api test:e2e`: passed, 2/2 tests without `DATABASE_URL`.
- `pnpm story:checks`: passed and explicitly executed the API e2e suite.
- Story doctor, story verifier, and `git diff --check`: passed.
- Codex review: `Status: pass`, with no P0 or P1 findings.
- The review P2 coverage gap for workspace-scoped command execution was fixed and retested.

## Manager Approval

- Approved and merged into `dev` after all repository and e2e gates passed.
- Prisma generated files and application source remained unchanged.
- Promotion from `dev` to `main` remains under human control.
