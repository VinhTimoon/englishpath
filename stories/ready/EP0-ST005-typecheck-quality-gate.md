---
id: EP0-ST005
title: Typecheck Quality Gate Baseline
status: ready
type: tooling
priority: high
phase: phase-0-foundation
allowed_paths:
  - package.json
  - apps/api/package.json
  - apps/web/package.json
  - scripts/run-checks.mjs
  - scripts/tests/**
  - stories/**
  - _bmad-output/implementation-artifacts/definition-of-done.md
forbidden_paths:
  - apps/api/src/**
  - apps/api/test/**
  - apps/web/src/**
  - packages/**
  - .env
  - apps/api/.env
  - apps/api/src/generated/**
requires_human_approval: false
max_fix_rounds: 2
---

# Story: Typecheck Quality Gate Baseline

## Goal

Make the repository typecheck gate execute real TypeScript validation for both
the API and web workspaces instead of succeeding with zero Turbo tasks.

## Business Rules

- Pull-request quality gates must include lint, typecheck, tests, and build.
- A declared root quality command must not pass when no workspace implements it.
- This story establishes tooling only and must not change application behavior.

## Requirements

- Add non-emitting `typecheck` scripts to `apps/api/package.json` and
  `apps/web/package.json`.
- Keep the root `pnpm typecheck` command routed through Turbo.
- Ensure `pnpm typecheck` executes the API and web workspace tasks.
- Harden `scripts/run-checks.mjs` so a required workspace quality task cannot
  silently disappear while the root command still exits successfully.
- Add focused automated coverage for the missing-workspace-task failure case.
- Do not modify application source, generated Prisma files, or environment files.

## Acceptance Criteria

- `pnpm typecheck` runs exactly the intended API and web typecheck tasks.
- Both workspace typecheck commands use TypeScript without emitting build files.
- `pnpm story:checks` fails clearly if a required workspace typecheck script is
  missing.
- Existing story tooling tests continue to pass.
- Lint, tests, and production builds remain green.

## Verification

- pnpm story:test
- node scripts/story-doctor.mjs stories/ready/EP0-ST005-typecheck-quality-gate.md --ready-only
- pnpm typecheck
- pnpm story:checks
- pnpm build
