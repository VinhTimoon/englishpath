---
id: EP0-ST011
title: Plan Artifact Runner Handoff
status: ready
type: tooling
priority: critical
phase: phase-0-foundation
allowed_paths:
  - scripts/codex-runner.mjs
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
max_fix_rounds: 2
---

# Story: Plan Artifact Runner Handoff

## Goal

Remove the Windows planning deadlock by letting the read-only planning Agent return the
structured plan in its final response and letting the trusted outer runner materialize
that response as `.codex-plan.md` before existing contract validation.

## Business Rules

- Planning remains non-interactive and must never modify product source.
- The eight required plan sections, ordering, uniqueness, freshness, and story-ID
  validation remain mandatory.
- Build, review, and debug phase behavior must not regress.
- Do not broaden filesystem permissions or use `danger-full-access`.

## Technical Requirements

- Update the planning prompt to return the complete plan as the terminal response with
  the exact eight numbered `##` headings; it must not attempt file writes.
- Run only the plan phase with Codex `read-only`; retain `workspace-write` for phases
  that legitimately implement or fix code.
- After Codex exits successfully, materialize the fresh plan response artifact to
  `.codex-plan.md` using the outer Node process, then run the existing plan validator.
- Reject missing, empty, stale, malformed, wrong-story, duplicated, or out-of-order
  plan responses exactly as contract failures.
- Add focused unit tests for successful handoff and invalid response rejection.

## Acceptance Criteria

- A valid planning response creates a fresh, identical `.codex-plan.md` and validates.
- Invalid planning content cannot become an accepted plan.
- Plan Codex invocation is read-only; other phase sandbox behavior is unchanged.
- Existing story-tool tests and all project quality gates pass.

## Verification

- node scripts/story-doctor.mjs stories/ready/EP0-ST011-plan-artifact-runner-handoff.md --ready-only
- node --test scripts/tests/story-tools.test.mjs
- pnpm story:checks
- git diff --check
