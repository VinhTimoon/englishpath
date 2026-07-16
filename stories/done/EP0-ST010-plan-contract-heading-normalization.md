---
id: EP0-ST010
title: Plan Contract Heading Normalization
status: done
type: tooling
priority: high
phase: phase-0-foundation
allowed_paths:
  - scripts/create-plan-prompt.mjs
  - scripts/lib/process-utils.mjs
  - scripts/tests/**
  - stories/**
forbidden_paths:
  - apps/**
  - packages/**
  - .env
  - notes/englishpath_product_spec.md
requires_human_approval: false
max_fix_rounds: 1
---

# Story: Plan Contract Heading Normalization

## Goal

Prevent valid Codex planning artifacts from failing only because required Markdown
section headings use different letter capitalization.

## Business Rules

- Planning must still require all eight sections and the active story id.
- Heading validation may ignore case and surrounding whitespace, but not missing,
  renamed, duplicated, or out-of-order sections.
- Invalid or incomplete plans must continue to fail clearly.

## Requirements

- Align the planning prompt and validator on canonical section names.
- Normalize heading case and surrounding whitespace during validation.
- Preserve section order and exact section-number/meaning requirements.
- Add regression coverage for the EP0-ST009 `Story id` / `Scope summary` artifact.
- Add negative coverage for missing and out-of-order sections.
- Do not relax build, review, debug, timeout, or status contracts.

## Acceptance Criteria

- A complete plan using lowercase title words passes validation.
- A complete canonical-title plan continues to pass.
- Missing, duplicated, renamed, or out-of-order sections fail.
- Existing story tooling tests remain green.

## Verification

- node scripts/story-doctor.mjs stories/ready/EP0-ST010-plan-contract-heading-normalization.md --ready-only
- pnpm story:test
- pnpm story:checks
- git diff --check



## Recovery Report

- Failed step: "node" "scripts/codex-runner.mjs" "plan" ".codex-plan-task.md"
- Exit code: 1
- Attempts: 2
- Summary: The automated loop could not complete this story.
- Recovery: The outer project manager implemented the scoped contract fix after the known Windows sandbox write failure.

### Evidence

```text
Command failed with exit code 1: "node" "scripts/codex-runner.mjs" "plan" ".codex-plan-task.md"
```

## Verification Report

- `pnpm story:test`: passed, 30/30 tests.
- Lowercase heading capitalization now passes.
- Missing, duplicated, renamed, and out-of-order section contracts remain enforced.
- `pnpm story:checks`, story doctor, story verifier, and `git diff --check`: passed.

## Manager Approval

- Approved and merged into `dev` after all regression and repository gates passed.
- Planning contracts now tolerate capitalization without accepting structural drift.
- Promotion from `dev` to `main` remains under human control.
