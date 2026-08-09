---
id: EP4-ST011
title: Four Skills Progress Dashboard
status: blocked
type: frontend
priority: medium
phase: phase-4-toeic-speaking-writing-and-four-skills
depends_on:
  - EP4-ST010
allowed_paths:
  - apps/web/app/**
  - apps/web/src/**
  - apps/web/tests/**
  - tests/e2e/**
  - docs/05_FRONTEND_ARCHITECTURE.md
  - docs/08_API_CONTRACT.md
  - docs/09_UI_DESIGN_SYSTEM.md
  - docs/10_TEST_STRATEGY.md
  - docs/11_SECURITY_PLAN.md
  - stories/**
  - _bmad-output/implementation-artifacts/sprint-status.yaml
  - _bmad-output/planning-artifacts/story-map.md
forbidden_paths:
  - apps/api/prisma/**
  - apps/api/.env
  - apps/api/src/modules/auth/**
  - apps/api/src/modules/ai-gateway/**
  - apps/web/.env*
  - package.json
  - pnpm-lock.yaml
  - .github/**
  - main
requires_human_approval: false
max_fix_rounds: 2
risk: medium
delivery_mode: full
---

# Story: Four Skills Progress Dashboard

## Goal

Give learners a clear, responsive view of Reading, Listening, Speaking, and
Writing progress based only on server-owned roadmap data, with honest states
when a skill or approved activity is unavailable.

## Scope

Add the learner-facing progress dashboard using the existing roadmap/today API
and the EP4-ST010 safe balance projection. Keep route files thin, use shared
UI/query patterns, and do not create a second progress store, fake completion,
official score, AI feedback, submission, or provider integration.

## Acceptance Criteria

- The dashboard presents exactly four skill cards in the approved order with
  completed/target values and a concise balance explanation derived from the
  server response; it never invents a score or progress value.
- Loading, success, empty/unavailable, retryable error, and authenticated
  access states are explicit and accessible. A missing Speaking/Writing pool
  is shown as unavailable rather than as completed or zero fabricated work.
- The layout is mobile-first, usable at 360px, keyboard accessible, respects
  reduced motion, uses the existing UI design tokens, and has no horizontal
  overflow or blocking accessibility findings.
- Existing roadmap/today learner flow and navigation remain unchanged; the
  dashboard keeps the server response as the source of truth and does not
  persist progress client-side.
- Unit/component and browser coverage proves safe field projection, state
  transitions, responsive layout, retry behavior, and ownership/auth handling.
- No API/schema/auth/AI/provider changes are needed. If the approved API does
  not expose sufficient learner-safe balance data, create an AI request and
  block this story rather than deriving hidden or fabricated values.

## Verification

- `node scripts/story-doctor.mjs stories/ready/EP4-ST011-four-skills-progress-dashboard.md`
- `pnpm story:verify stories/in-progress/EP4-ST011-four-skills-progress-dashboard.md`
- `pnpm --filter web test`
- `pnpm --filter web typecheck`
- `pnpm --filter web build`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm e2e`
- `git diff --check`

## Implementation Guardrails

- Follow the EnglishPath frontend architecture and existing query/store/shared
  components; keep business rules out of route files.
- Use explicit allowlisted response mapping. Do not expose provider fields,
  rubric internals, answer keys, raw claims, or another learner's data.
- Preserve the existing roadmap/today journey and do not add a second source
  of progress truth or an unapproved API contract.

## Definition of Done

The Four Skills dashboard is useful, honest, responsive, accessible, safe,
tested, and integrated with the existing learner roadmap without changing
backend ownership or progress semantics.

## Story Creation Notes

- EP4-ST010 is done and provides the pure server-owned balance/safe-projection
  contract.
- EP4-ST002, EP4-ST005, and EP4-ST007 remain blocked by separate AI requests;
  this dashboard is independent and does not resume them.



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
