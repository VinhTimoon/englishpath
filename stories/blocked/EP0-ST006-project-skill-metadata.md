---
id: EP0-ST006
title: Project Skill Metadata Compliance
status: blocked
type: tooling
priority: high
phase: phase-0-foundation
allowed_paths:
  - .agents/skills/englishpath-backend-nlayer/SKILL.md
  - .agents/skills/englishpath-frontend-quality/SKILL.md
  - .agents/skills/englishpath-prisma-supabase/SKILL.md
  - .agents/skills/englishpath-token-optimizer/SKILL.md
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

# Story: Project Skill Metadata Compliance

## Goal

Make all EnglishPath-specific Codex skills load successfully instead of being
ignored because their `SKILL.md` files lack required YAML frontmatter.

## Business Rules

- Project skills must remain scoped to their existing EnglishPath responsibilities.
- Metadata fixes must not rewrite or broaden the skill instructions.
- Codex planning, implementation, review, and debug phases must be able to load
  the routed project skills without metadata errors.

## Requirements

- Add valid YAML frontmatter with a stable `name` and concise `description` to
  each of the four EnglishPath project skills.
- Preserve each skill's current instruction body.
- Use skill names that match their directory purpose and do not collide.
- Add focused automated validation covering the required project skill files.
- Do not modify application code, dependencies, or product specifications.

## Acceptance Criteria

- All four `SKILL.md` files begin with valid YAML frontmatter.
- Each frontmatter block contains non-empty `name` and `description` fields.
- Existing skill bodies remain present after the metadata block.
- The focused validation fails clearly when required metadata is absent.
- Existing repository quality gates remain green.

## Verification

- pnpm story:test
- node scripts/story-doctor.mjs stories/ready/EP0-ST006-project-skill-metadata.md --ready-only
- pnpm story:checks
- git diff --check



## Blocked Report

- Failed step: "node" "scripts/codex-runner.mjs" "build" ".codex-build-task.md"
- Exit code: 42
- Attempts: 1
- Summary: The automated loop produced a valid blocked outcome and stopped without further retries.

### Evidence

```text
Child process returned blocked exit code 42.
Command failed with exit code 42: "node" "scripts/codex-runner.mjs" "build" ".codex-build-task.md"
```
