---
id: EP0-ST004
title: Noninteractive Codex Phase Contracts
status: review
type: tooling
priority: critical
phase: phase-0-foundation
allowed_paths:
  - package.json
  - .gitignore
  - scripts/**
  - stories/**
  - notes/ENGLISHPATH_AGENT_WORKFLOW.md
  - _bmad-output/implementation-artifacts/**
forbidden_paths:
  - apps/**
  - packages/**
  - .env
  - apps/api/.env
  - apps/api/src/generated/**
requires_human_approval: false
max_fix_rounds: 2
---

# Story: Noninteractive Codex Phase Contracts

## Goal

Ensure every Codex CLI phase either completes with a verifiable result or fails
clearly, without silently stopping at an interactive checkpoint.

## Business Rules

- Loop phases run non-interactively and must never wait for human confirmation.
- Exit code `0` alone is not enough to mark planning, build, review, or debug complete.
- Each phase must leave an inspectable final-result artifact.
- A phase timeout or incomplete result must enter the bounded debug/block flow.
- Model routing remains controlled by `scripts/codex-models.json`.

## Requirements

- Add explicit non-interactive instructions to phase prompts.
- Capture each Codex phase final response through supported CLI output options.
- Validate phase-specific completion:
  - planning created a valid `.codex-plan.md`;
  - build returned a completed or blocked report;
  - review returned `pass`, `fixed`, or `blocked`, not a confirmation request;
  - debug returned fixed or blocked status.
- Reject known checkpoint/confirmation-only responses.
- Add configurable finite timeouts per phase.
- Preserve stdout/stderr and final responses for diagnosis.
- Do not load checkpoint-driven review skill bodies into the automated review prompt.
- Add automated tests for timeout handling and incomplete phase-result rejection.

## Acceptance Criteria

- A confirmation-only model response causes the phase to fail.
- Missing planning output causes planning to fail.
- Valid completion results pass.
- Timeout errors contain the phase and timeout duration.
- Automated review can run without human input.
- Existing story tooling tests continue to pass.

## Verification

- pnpm story:test
- node scripts/story-doctor.mjs stories/ready/EP0-ST004-noninteractive-phase-contracts.md --ready-only
- pnpm story:checks
- pnpm build



## Recovery Report

- Failed step: "node" "scripts/codex-runner.mjs" "debug" ".codex-debug-task.md"
- Exit code: 1
- Attempts: 3
- Summary: The first automated run exposed a process-boundary blocked-status bug. Recovery is technical and does not require a product decision.

### Evidence

```text
Command failed with exit code 1: "node" "scripts/codex-runner.mjs" "debug" ".codex-debug-task.md"
```

## Verification Report

- `pnpm story:test`: passed, 22/22 tests.
- `node scripts/story-doctor.mjs stories/in-progress/EP0-ST004-noninteractive-phase-contracts.md`: passed.
- `node scripts/verify-story.mjs stories/in-progress/EP0-ST004-noninteractive-phase-contracts.md`: passed.
- `pnpm story:checks`: passed.
- `git diff --check`: passed; only Git line-ending conversion warnings were reported.
- Recovery preserves blocked results with exit code `42`, marks them non-retriable, and prevents review from rerunning the ready-only doctor against a moved story.
