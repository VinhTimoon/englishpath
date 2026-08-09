---
id: EP3-ST004
title: Admin Library Inventory and Review UI
status: blocked
type: frontend
priority: high
phase: phase-3-licensed-content-library-and-listening
depends_on:
  - EP3-ST003
allowed_paths:
  - apps/web/src/app/admin/**
  - apps/web/src/features/admin/**
  - apps/web/src/widgets/admin/**
  - apps/web/src/shared/**
  - tests/e2e/admin-shell.spec.ts
  - docs/05_FRONTEND_ARCHITECTURE.md
  - docs/09_UI_DESIGN_SYSTEM.md
  - docs/10_TEST_STRATEGY.md
  - stories/**
  - _bmad-output/implementation-artifacts/sprint-status.yaml
  - _bmad-output/planning-artifacts/story-map.md
forbidden_paths:
  - apps/api/.env
  - apps/api/prisma/**
  - apps/api/src/generated/**
  - apps/api/src/modules/**
  - package.json
  - pnpm-lock.yaml
  - .github/**
  - main
requires_human_approval: false
max_fix_rounds: 2
risk: medium
delivery_mode: full
---

# Story: Admin Library Inventory and Review UI

## Goal

Give authorized content operators a responsive, keyboard-accessible library
inventory surface that makes source, checksum/version, rights, review, and publish
state understandable without exposing private Drive data or pretending client-side
controls are authorization.

## Scope

Extend the existing protected admin shell using FSD boundaries and the approved
EnglishPath tokens. Use the existing backend contract or an explicit unavailable
state when the provider-backed inventory endpoint is not present. Do not invent
source data, bypass server authorization, add credentials, or add backend schema.

## Acceptance Criteria

- The UI is reachable only after the existing role-scoped admin overview succeeds;
  editor/admin capability differences remain explicit.
- Inventory rows show safe operator fields and clear draft/review/publish/rights
  states, while private source refs, raw manifests, credentials, and learner-only
  fields never render.
- Loading, empty, error/retry, success, and unavailable-provider states are all
  explicit; no success state is fabricated from missing API data.
- Review and publish controls are disabled unless the server projection permits
  them; UI state is advisory and backend policy remains authoritative.
- Mobile 360px has no horizontal overflow, controls meet 44px targets, focus is
  visible, status is not color-only, and reduced motion remains usable.
- Add targeted browser coverage for success, empty/error/unavailable states,
  role-scoped controls, responsive layout, and accessibility smoke checks.

## Verification

- `pnpm --filter web typecheck`
- `pnpm --filter web lint`
- `pnpm --filter web exec next build`
- `pnpm e2e -- tests/e2e/admin-shell.spec.ts`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `git diff --check`
- `node scripts/story-doctor.mjs stories/in-progress/EP3-ST004-admin-library-inventory-and-review-ui.md`
- `pnpm story:verify stories/in-progress/EP3-ST004-admin-library-inventory-and-review-ui.md`

## Risk and Review

Medium risk because this is an operator-facing learner-content governance surface.
Review must check ownership, redaction, state handling, responsive behavior, and
browser accessibility. No provider or permission decision is made in the client.

## Definition of Done

The admin library surface is verified in the approved local browser harness,
server-boundary limitations are explicit, and no known P0/P1 authorization or
disclosure issue remains.



## Blocked Report

- Failed step: "node" "scripts/codex-runner.mjs" "review" ".codex-review-task.md"
- Exit code: 42
- Attempts: 1
- Summary: The automated loop produced a valid blocked outcome and stopped without further retries.

### Evidence

```text
Child process returned blocked exit code 42.
Command failed with exit code 42: "node" "scripts/codex-runner.mjs" "review" ".codex-review-task.md"
```
