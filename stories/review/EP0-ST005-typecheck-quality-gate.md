---
id: EP0-ST005
title: Typecheck Quality Gate Baseline
status: review
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



## Recovery Report

- Failed step: "node" "scripts/codex-runner.mjs" "debug" ".codex-debug-task.md"
- Exit code: 42
- Attempts: 1
- Summary: The automated loop produced a valid blocked outcome and stopped without further retries.
- Recovery: The outer project manager is applying the two missing test imports that the Windows Agent sandbox could not write.

### Evidence

```text
Child process returned blocked exit code 42.
Command failed with exit code 42: "node" "scripts/codex-runner.mjs" "debug" ".codex-debug-task.md"
```

## Verification Report

- `pnpm story:test`: passed, 24/24 tests in the outer project environment.
- `pnpm typecheck`: passed with exactly two Turbo tasks, `api` and `web`.
- `pnpm story:checks`: passed lint, typecheck, unit tests, and production builds.
- Story doctor, story verifier, and `git diff --check`: passed.
- Codex CLI review: `Status: pass` with no P0, P1, or P2 findings.
- The sandbox-only subprocess skip was independently covered by the successful outer test run.
