---
id: EP0-ST001
title: Foundation Review
status: ready
type: review
priority: high
phase: phase-0-foundation
allowed_paths:
  - AGENTS.md
  - docs/**
  - ai-skills/**
  - _bmad-output/**
  - stories/**
forbidden_paths:
  - apps/api/prisma/schema.prisma
  - apps/api/src/generated/**
  - apps/api/.env
  - apps/web/**
  - apps/api/**
requires_human_approval: false
max_fix_rounds: 2
---

# Story: Foundation Review

## Goal

Review and complete the project governance foundation before automated implementation begins.

## Business Rules

- Codex must follow BMAD artifacts.
- Codex must use skill-router instead of loading every skill.
- The project must be ready for story-based loop engineering.

## FE Requirements

- No frontend code change required.

## BE Requirements

- No backend code change required.

## Documentation Requirements

- Ensure AGENTS.md explains BMAD + Codex + skill routing.
- Ensure project-context.md exists.
- Ensure definition-of-done.md exists.
- Ensure skill-router.md exists.
- Ensure story template exists.

## Acceptance Criteria

- BMAD planning artifacts folder exists.
- BMAD implementation artifacts folder exists.
- AGENTS.md references BMAD workflow.
- ai-skills/routing/skill-router.md exists.
- stories/templates/fullstack-story-template.md exists.
- No app source code is modified.

## Verification

- dir _bmad
- dir _bmad-output
- dir .agents/skills
- dir stories/ready