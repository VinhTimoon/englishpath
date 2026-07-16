---
id: EP0-ST003
title: Loop Engineering Hardening
status: done
type: tooling
priority: critical
phase: phase-0-foundation
allowed_paths:
  - AGENTS.md
  - package.json
  - .gitignore
  - scripts/**
  - stories/**
  - notes/ENGLISHPATH_AGENT_WORKFLOW.md
  - notes/ai-req/**
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

# Story: Loop Engineering Hardening

## Goal

Make the story loop safe to operate continuously from `dev` while keeping
production changes under human control.

## Business Rules

- `main` is production and must never be auto-merged by the loop.
- Every story branch must be created from a clean, up-to-date local `dev`.
- A successful story may be merged into `dev` only after checks and review pass.
- Codex CLI must be used for planning, implementation, review, and difficult debugging.
- Product decisions come from `notes/englishpath_product_spec.md`.
- Unresolved business, infrastructure, dependency, security, or environment decisions
  must create a structured request under `notes/ai-req`.
- Fix attempts must be bounded by `max_fix_rounds`.

## Requirements

- Enforce the `dev` base branch before creating a story branch.
- Parse and enforce all story `allowed_paths` and `forbidden_paths`.
- Keep story frontmatter status synchronized with its lifecycle folder.
- Add bounded debug handling using the configured debug model.
- Create structured AI request files when a story remains blocked.
- Never use shell-specific success fallbacks such as `|| true`.
- Preserve actionable failure output.
- Support merging a verified story branch into `dev` without touching `main`.
- Update the workflow documentation to match the new branch policy.

## Acceptance Criteria

- The loop refuses to start outside `dev` or with a dirty worktree.
- A story branch is created from `dev`.
- Path verification checks staged, unstaged, committed, and untracked story changes.
- A failed story does not disappear and receives a useful blocked report.
- A blocked decision creates a file under `notes/ai-req`.
- A successful story is committed and can be merged into `dev`.
- `main` is never checked out or modified by automation.
- Loop scripts have automated tests for critical parsing and path-matching behavior.

## Verification

- pnpm story:test
- pnpm story:doctor stories/ready/EP0-ST003-loop-engineering-hardening.md
- pnpm story:checks
- pnpm build

## Verification Report

- `pnpm story:test`: passed, 13 tests.
- `pnpm story:doctor`: passed for the in-progress lifecycle.
- `pnpm story:verify`: passed with committed, staged, unstaged, and untracked changes.
- `pnpm story:checks`: passed.
- `pnpm build`: passed.
- Codex runner smoke test: returned `RUNNER_OK` through stdin.
- Review result: fixed, with two bounded debug rounds completed.
- Manager approval: accepted into `dev`.
