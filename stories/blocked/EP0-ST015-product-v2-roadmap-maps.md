---
id: EP0-ST015
title: Product V2 Roadmap Maps
status: blocked
type: planning
priority: critical
phase: phase-0-foundation
allowed_paths:
  - _bmad-output/planning-artifacts/epic-map.md
  - _bmad-output/planning-artifacts/story-map.md
  - _bmad-output/planning-artifacts/epics.md
  - stories/**
forbidden_paths:
  - notes/**
  - docs/**
  - apps/**
  - packages/**
  - scripts/**
  - .github/**
  - .env
requires_human_approval: false
max_fix_rounds: 2
---

# Story: Product V2 Roadmap Maps

## Goal

Replace the v1 epic/story maps with a complete v2 delivery sequence for Phase 0-6,
record superseded historical planning, and create the next bounded ready queue.

## Acceptance Criteria

- Epic map, story map, and epic details are mutually consistent and v2-aligned.
- Every FR/NFR/UF identifier has map coverage and every phase has an exit gate.
- Story numbering has no duplicates and dependencies are executable.
- Read-only review passes without P0/P1 findings.

## Verification

- pnpm prettier --check _bmad-output/planning-artifacts/epic-map.md _bmad-output/planning-artifacts/story-map.md _bmad-output/planning-artifacts/epics.md
- pnpm story:checks
- git diff --check

## Blocked Report

- Blocked after two review fix rounds on 2026-07-17.
- WIP maps are preserved in commit `e608a34` on `story/ep0-st015-blocked`.
- Remaining valid P1: Phase 1-5 entry stories did not consistently depend on the prior
  phase exit, so epic and story dependencies were not mutually executable.
- Recovery is assigned to `EP0-ST015R`; this blocked story must not be resumed or
  merged directly.
