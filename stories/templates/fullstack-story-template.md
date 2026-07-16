---
id: EPX-STXXX
title: Story title
status: ready
type: fullstack
priority: medium
phase: phase-x
allowed_paths:
  - apps/web/src/features/example/**
  - apps/web/src/app/(learn)/example/**
  - apps/api/src/modules/example/**
forbidden_paths:
  - apps/api/src/modules/auth/**
  - apps/api/prisma/schema.prisma
requires_human_approval: false
max_fix_rounds: 3
---

# Story: Story title

## Goal

Describe the goal.

## Business Rules

- Rule 1
- Rule 2

## FE Requirements

- Requirement 1
- Requirement 2

## BE Requirements

- Requirement 1
- Requirement 2

## API Contract

- GET /api/v1/example
- POST /api/v1/example

## Acceptance Criteria

- Criteria 1
- Criteria 2

## Verification

- pnpm lint
- pnpm typecheck
- pnpm test
- pnpm build