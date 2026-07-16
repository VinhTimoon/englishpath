---
id: EP0-ST001
title: Foundation Governance Review
status: done
type: docs
priority: high
phase: phase-0-foundation
allowed_paths:
  - AGENTS.md
  - ai-skills/**
  - _bmad-output/**
  - stories/**
  - docs/**
forbidden_paths:
  - apps/**
  - packages/**
  - .env
  - apps/api/.env
requires_human_approval: false
max_fix_rounds: 1
---

# Story: Foundation Governance Review

## Goal

Review and complete the project governance foundation before automated implementation begins.

## Business Rules

- Codex must follow AGENTS.md.
- Codex must follow BMAD artifacts.
- Codex must use skill-router instead of loading every skill.
- Codex must not modify app source code in this story.

## Documentation Requirements

- Ensure AGENTS.md explains BMAD + Codex + skill routing.
- Ensure skill-router.md exists.
- Ensure BMAD planning and implementation artifacts exist.
- Ensure story folders exist.

## Acceptance Criteria

- AGENTS.md exists and references BMAD workflow.
- ai-skills/routing/skill-router.md exists.
- _bmad-output/planning-artifacts exists.
- _bmad-output/implementation-artifacts exists.
- stories folders exist.
- No files under apps/** are changed.

## Verification

- dir _bmad
- dir _bmad-output
- dir .agents/skills
- dir stories/ready
