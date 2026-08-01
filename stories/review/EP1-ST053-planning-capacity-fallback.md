---
id: EP1-ST053
title: Planning Capacity Fallback
status: review
type: tooling
priority: high
phase: phase-1-learning-core
allowed_paths:
  - scripts/codex-models.json
  - scripts/codex-runner.mjs
  - scripts/codex-loop.mjs
  - scripts/lib/plan-fallback.mjs
  - scripts/tests/story-tools.test.mjs
  - notes/ENGLISHPATH_AGENT_WORKFLOW.md
  - .codex-ep1-st053-manual-review.md
  - stories/ready/EP1-ST053-planning-capacity-fallback.md
  - stories/in-progress/EP1-ST053-planning-capacity-fallback.md
  - stories/review/EP1-ST053-planning-capacity-fallback.md
  - stories/done/EP1-ST053-planning-capacity-fallback.md
  - stories/blocked/EP1-ST053-planning-capacity-fallback.md
  - stories/blocked/EP1-ST052-vocabulary-learner-ui-review-remediation.md
  - stories/ready/EP1-ST054-vocabulary-learner-ui-recovery.md
  - _bmad-output/implementation-artifacts/sprint-status.yaml
  - _bmad-output/planning-artifacts/story-map.md
forbidden_paths:
  - apps/**
  - packages/**
  - prisma/**
  - "**/schema.prisma"
  - "**/package.json"
  - "**/pnpm-lock.yaml"
  - "**/package-lock.json"
  - "**/yarn.lock"
  - .env
  - .env.*
  - "**/.env"
  - "**/.env.*"
  - provider configuration
  - main
requires_human_approval: false
max_fix_rounds: 1
---

# Story: Planning Capacity Fallback

## Goal

Restore unattended planning when `gpt-5.6-sol` high reasoning explicitly reports capacity unavailability, while preserving it as the normal planner.

## Temporary Operational Fallback

The `plan` route in `scripts/codex-models.json` is deliberately changed to `gpt-5.6-terra` with `medium` reasoning as a temporary operational fallback. All other routing settings must remain unchanged.

## Acceptance Criteria

- Normal plan execution starts with `gpt-5.6-sol` at high reasoning and retains the existing plan artifact contract.
- Exactly one retry uses the configured `plan` route only after the primary returns an explicit capacity-unavailable error.
- Timeouts, malformed or blocked artifacts, authentication failures, generic command failures, and non-capacity provider errors never invoke fallback.
- Retry removes primary artifacts and validates only the configured-fallback result; fallback failure follows the existing blocked lifecycle with preserved evidence.
- EP1-ST052 remains blocked for planner capacity; EP1-ST054 is the sole ready implementation successor for its four P1 findings.

## Verification

- `node --check scripts/codex-runner.mjs`
- `node --check scripts/codex-loop.mjs`
- `node scripts/story-doctor.mjs stories/ready/EP1-ST053-planning-capacity-fallback.md --ready-only`
- `node scripts/story-doctor.mjs stories/ready/EP1-ST054-vocabulary-learner-ui-recovery.md --ready-only`
- `git diff --check`

## Resolution Notes

- Extracted planner fallback eligibility into `scripts/lib/plan-fallback.mjs`.
- Added regression coverage for normal routing, explicit capacity failures,
  authentication failures, timeouts, blocked results, generic failures, and
  non-plan phases.
- Synchronized the non-interactive workflow contract so review accepts only
  `pass` or `blocked`; fixes remain the debug phase responsibility.
- Story-specific checks pass, including format, traceability, tooling tests
  (59/59), Prisma validation, lint, typecheck, unit tests, API e2E, build,
  story doctor, and diff validation.
- The project-wide browser E2E gate remains blocked by an unrelated Vite server
  from `E:\Code_Ky8\harness\code\KNOWLEDGE-OOP` already occupying port 5173.


## Blocked Report

- Failed step: "node" "scripts/codex-runner.mjs" "debug" ".codex-debug-task.md"
- Exit code: 1
- Attempts: 2
- Summary: The automated loop could not complete this story.

### Evidence

```text
Debug phase did not produce a terminal fix or blocked result.
Command failed with exit code 1: "node" "scripts/codex-runner.mjs" "debug" ".codex-debug-task.md"

Command failed with exit code 1: "node" "scripts/run-checks.mjs"
```

