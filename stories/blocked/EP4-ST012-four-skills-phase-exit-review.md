---
id: EP4-ST012
title: AI Evaluation Score Separation Abuse Browser And Phase Exit Review
status: blocked
type: quality
priority: high
phase: phase-4-toeic-speaking-writing-and-four-skills
depends_on:
  - EP4-ST004
  - EP4-ST005
  - EP4-ST006
  - EP4-ST007
  - EP4-ST008
  - EP4-ST009
  - EP4-ST010
  - EP4-ST011
allowed_paths:
  - apps/api/**
  - apps/web/**
  - tests/e2e/**
  - docs/**
  - _bmad-output/implementation-artifacts/sprint-status.yaml
  - _bmad-output/planning-artifacts/story-map.md
  - stories/**
  - notes/ai-req/**
forbidden_paths:
  - apps/api/.env*
  - production credentials
  - main
requires_human_approval: true
blocked_by: notes/ai-req/2026-08-10-ep4-st003-recording-storage-controlled-playback.md
max_fix_rounds: 2
risk: high
delivery_mode: full
---

# Story: Phase 4 Exit Review

## Goal

Prove the complete Speaking/Writing/Four Skills journey is secure, browser
covered, advisory-only, abuse-resistant, and ready for the approved release
boundary.

## Acceptance Criteria

- EP4-ST003 through EP4-ST011 are done with evidence and no unresolved P0/P1.
- Recording ownership, retention, playback, and provider isolation are verified.
- Advisory feedback cannot become an official score; quotas and idempotency are
  enforced; sensitive fields are absent.
- Full API, frontend, browser, accessibility, build, and security gates pass.
- Any production provider activation remains owner-controlled.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm e2e`
- `git diff --check`

## Blocker

Exit review is dependency-blocked until the recording boundary and all dependent
Speaking stories are completed.
