---
id: EP0-ST008
title: Testing Governance Baseline
status: blocked
type: documentation
priority: medium
phase: phase-0-foundation
allowed_paths:
  - docs/10_TEST_STRATEGY.md
  - ai-skills/project/testing-rules.md
  - _bmad-output/implementation-artifacts/qa-checklist.md
  - stories/**
forbidden_paths:
  - apps/**
  - packages/**
  - scripts/**
  - .env
  - notes/englishpath_product_spec.md
requires_human_approval: false
max_fix_rounds: 1
---

# Story: Testing Governance Baseline

## Goal

Provide the testing strategy and agent rules required by the EnglishPath skill
router so future stories use consistent, deterministic verification.

## Business Rules

- Testing guidance must reflect the current Next.js, NestJS, Prisma, and Turbo setup.
- Quality rules must be practical for the current repository, not aspirational boilerplate.
- External services and secrets must not be required for deterministic automated tests.
- The source-of-truth product specification must remain unchanged.

## Requirements

- Document the unit, integration, e2e, and future browser-test boundaries.
- Define what to mock and what real wiring each test level must preserve.
- Document the current mandatory commands, including API e2e.
- Define regression expectations for bug fixes and changed behavior.
- Define test data, environment, naming, and flakiness rules.
- Add concise agent-facing testing rules aligned with the longer strategy.
- Update the QA checklist only if needed to reference the documented strategy.
- Do not change code, dependencies, or product scope.

## Acceptance Criteria

- `docs/10_TEST_STRATEGY.md` is non-empty and specific to EnglishPath.
- `ai-skills/project/testing-rules.md` gives actionable rules for implementation agents.
- API e2e testing explicitly uses a mocked external database boundary while preserving
  Nest module and HTTP wiring.
- Mandatory verification includes lint, typecheck, unit tests, API e2e, and build.
- Flaky tests, real secrets, and generated-file edits are explicitly prohibited.
- Story and repository gates remain green.

## Verification

- node scripts/story-doctor.mjs stories/ready/EP0-ST008-testing-governance-baseline.md --ready-only
- pnpm story:test
- pnpm story:checks
- git diff --check



## Blocked Report

- Failed step: "node" "scripts/codex-runner.mjs" "plan" ".codex-plan-task.md"
- Exit code: 1
- Attempts: 2
- Summary: The automated loop could not complete this story.

### Evidence

```text
Command failed with exit code 1: "node" "scripts/codex-runner.mjs" "plan" ".codex-plan-task.md"
```
