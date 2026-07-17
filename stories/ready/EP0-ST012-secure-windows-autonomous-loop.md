---
id: EP0-ST012
title: Secure Windows Autonomous Loop
status: ready
type: tooling
priority: critical
phase: phase-0-foundation
allowed_paths:
  - scripts/codex-runner.mjs
  - scripts/codex-models.json
  - scripts/create-plan-prompt.mjs
  - scripts/create-review-prompt.mjs
  - scripts/lib/process-utils.mjs
  - scripts/tests/**
  - notes/ai-req/2026-07-17-codex-windows-sandbox-mode.md
  - stories/**
forbidden_paths:
  - apps/**
  - packages/**
  - .env
  - notes/englishpath_product_spec.md
requires_human_approval: false
max_fix_rounds: 2
---

# Story: Secure Windows Autonomous Loop

## Goal

Apply the user's explicit risk acceptance for autonomous Windows implementation while
limiting `danger-full-access` to scoped build/debug phases and completing the safe
read-only planning handoff from EP0-ST011.

## Security Decision

- On 2026-07-17, the user explicitly approved `danger-full-access` after requesting a
  risk assessment.
- Residual risk is accepted: an unsandboxed Codex subprocess technically has the current
  user's filesystem/process access, and Git checks cannot detect writes outside the repo.
- Permission is project-specific and does not authorize admin/system configuration.

## Technical Requirements

- Recover EP0-ST011 plan response handoff and require the Story ID section value to
  exactly equal the active story ID.
- Configure sandbox per phase: plan/review `read-only`; build/debug
  `danger-full-access`.
- Reject unknown sandbox values and reject `danger-full-access` for any other phase.
- Before a dangerous phase, verify the current root package is EnglishPath and the
  prompt contains a story ID plus explicit allowed and forbidden path policies.
- Keep path verification, checks, bounded retries, blocked handling, and dev-only merge
  policy unchanged.
- Make review prompts explicitly read-only; fixes remain the debug phase's responsibility.
- Record approval, mitigations, and residual risk in the original AI request.

## Acceptance Criteria

- Valid plan responses materialize and validate without Agent file writes.
- Wrong-story, malformed, stale, prefaced, extra-section, duplicated, and out-of-order
  plans fail before acceptance.
- Only build/debug can resolve to `danger-full-access`, and only after root/prompt guards.
- Plan/review resolve to `read-only` and cannot modify source.
- Focused tests and all project gates pass; Codex review reports no P0/P1 findings.

## Verification

- node scripts/story-doctor.mjs stories/ready/EP0-ST012-secure-windows-autonomous-loop.md --ready-only
- node --test scripts/tests/story-tools.test.mjs
- pnpm story:checks
- git diff --check
