---
id: EP0-ST015R
title: Product V2 Roadmap Recovery
status: done
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

# Story: Product V2 Roadmap Recovery

## Goal

Recover the reviewed `EP0-ST015` map WIP, close its remaining dependency findings,
and deliver executable v2 Phase 0-6 maps plus the bounded next ready queue.

## Recovery Source

- Recover only commit `e608a34` from `story/ep0-st015-blocked`.
- `EP0-ST015` remains blocked historical evidence and is superseded by this recovery.
- Do not merge the blocked branch or its lifecycle commit.

## Requirements

- Keep the existing v2 epic/story content, explicit 59-ID coverage, exit gates,
  supersession notes, and ready stories `EP0-ST016`/`EP0-ST017`.
- Add this recovery as the completed map gate before `EP0-ST016`.
- Enforce `EP0-ST015R -> EP0-ST016 -> EP0-ST017 -> EP0-ST018 -> EP0-ST019 ->
EP0-ST020 -> EP0-ST021 -> EP0-ST022`.
- Make the first story of each later phase depend on the prior phase exit:
  `EP1-ST005` on `EP0-ST022`, `EP2-ST001` on `EP1-ST039`, `EP3-ST001` on
  `EP2-ST012`, `EP4-ST001` on `EP3-ST012`, `EP5-ST001` on `EP4-ST012`, and
  `EP6-ST001` on `EP5-ST013`.
- Keep epic-level dependencies aligned with those entry edges.
- Ensure ready `EP0-ST016` explicitly depends on completed `EP0-ST015R`; ready
  `EP0-ST017` continues to depend on `EP0-ST016`.
- Review while in-progress, then move to review only after the review result passes;
  ready-only doctor remains pre-loop evidence rather than a final-state command.

## Acceptance Criteria

- All three maps are v2-aligned and mutually executable.
- All 29 FRs, 17 NFRs, and 13 UFs have explicit epic coverage.
- Every phase has an exit gate and each phase entry follows the previous exit.
- `EP0-ST015` is blocked/superseded; no planned feature is marked implemented.
- After recovery moves to review, ready queue contains exactly `EP0-ST016` and
  `EP0-ST017`, and both pass story-doctor.
- Formatting, project checks, diff check, story verification, and read-only review
  pass without P0/P1 findings.

## Pre-Loop Evidence

- Ready-only story-doctor passed for `EP0-ST015R` before it moved from `ready` to
  `in-progress`; that historical ready-path command is not a final-state verification
  command and must not be rerun after the lifecycle move.

## Verification

- node scripts/story-doctor.mjs stories/ready/EP0-ST016-architecture-data-security-v2.md --ready-only
- node scripts/story-doctor.mjs stories/ready/EP0-ST017-ci-migration-planning-safety.md --ready-only
- pnpm prettier --check _bmad-output/planning-artifacts/epic-map.md _bmad-output/planning-artifacts/story-map.md _bmad-output/planning-artifacts/epics.md
- pnpm story:checks
- git diff --check
