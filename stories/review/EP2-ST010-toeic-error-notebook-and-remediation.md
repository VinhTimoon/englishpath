---
id: EP2-ST010
title: TOEIC Error Notebook and remediation integration
status: review
type: vertical-slice
priority: high
phase: phase-2-toeic-listening-reading
depends_on:
  - EP2-ST009
  - EP1-ST024
allowed_paths:
  - apps/api/src/modules/practice/**
  - apps/api/src/modules/toeic/**
  - apps/api/prisma/schema.prisma
  - apps/api/prisma/migrations/**
  - apps/api/src/generated/**
  - apps/api/test/**
  - apps/web/src/app/error-notebook/**
  - apps/web/src/app/toeic/test/**
  - apps/web/src/widgets/practice/**
  - apps/web/src/widgets/toeic-timed-test/**
  - apps/web/src/features/**
  - apps/web/src/entities/**
  - tests/e2e/**
  - tests/unit/**
  - docs/03_USER_FLOWS.md
  - docs/05_FRONTEND_ARCHITECTURE.md
  - docs/06_BACKEND_ARCHITECTURE.md
  - docs/07_DATABASE_DESIGN.md
  - docs/08_API_CONTRACT.md
  - docs/09_UI_DESIGN_SYSTEM.md
  - docs/10_TEST_STRATEGY.md
  - docs/11_SECURITY_PLAN.md
  - docs/13_DECISION_LOG.md
  - notes/ai-req/2026-08-06-ep2-st010-error-notebook-schema-ownership.md
  - stories/**
  - _bmad-output/implementation-artifacts/sprint-status.yaml
  - _bmad-output/planning-artifacts/story-map.md
forbidden_paths:
  - apps/api/.env
  - apps/web/.env
  - packages/**
  - package.json
  - pnpm-lock.yaml
  - main
requires_human_approval: true
max_fix_rounds: 2
risk: high
delivery_mode: full
---

# Story: TOEIC Error Notebook and remediation integration

## Goal

After a finalized TOEIC MINI/HALF attempt, capture each incorrect answer once
in the learner's existing private Error Notebook and show a safe remediation
entry point from the TOEIC result and notebook. Preserve existing daily-practice
capture behavior, owner isolation, and answer-key secrecy.

## Acceptance Criteria

1. The approved shared Error Notebook ownership model can reference either a
   daily practice session or a TOEIC timed session without synthetic rows or
   weakened foreign keys. The additive migration and database documentation
   include indexes, uniqueness, rollback notes, and no destructive statements.
2. Finalized `SUBMITTED`/`EXPIRED` TOEIC attempts capture only incorrect answers,
   idempotently across repeated analysis/result reads and finalization races.
   Correctness is computed server-side; the browser never submits or receives
   answer keys/correctness flags before the approved notebook projection.
3. Notebook reads remain authenticated, owner-scoped, paginated/bounded, and
   safe. A non-owner receives the existing sanitized not-found/forbidden
   behavior, and no private provider/governance fields leak.
4. TOEIC results show a safe remediation link/state when captured entries exist;
   no-entry and unavailable states are explicit and Vietnamese, responsive, and
   keyboard accessible. Existing daily Error Notebook UI remains functional.
5. Add deterministic service/repository/API E2E/unit/browser coverage for
   capture, duplicate/retry/race behavior, correct-vs-incorrect filtering,
   practice regression, ownership, pagination/bounds, disclosure, empty/error/
   success UI, 360px layout, keyboard access, and accessibility.
6. Update approved flow, architecture, database, API, UI, security, decision,
   and test documents with the chosen ownership model and evidence. Do not add
   Phase 3+ behavior, AI calls, paid providers, or official TOEIC conversion.

## Approval evidence

The owner approved Option 1 on 2026-08-07 in the linked
[AI request](../../notes/ai-req/2026-08-06-ep2-st010-error-notebook-schema-ownership.md).
The story may resume from `ready` using an additive local migration only; no
remote/shared database migration or production promotion is authorized.

## Former blocker, now resolved

The current `ErrorNotebookEntry.sessionId` is a required `PracticeSession` FK,
while TOEIC timed attempts use the separate `ToeicTimedTestSession` boundary.
The approved implementation must add an explicit source discriminator and
nullable references while preserving the existing practice relation. Using a
synthetic `PracticeSession`, a fake foreign key, or an in-memory-only bridge is
still forbidden.

## Verification commands after approval

- `pnpm --filter api exec prisma validate --schema prisma/schema.prisma`
- `pnpm --filter api exec jest --runInBand src/modules/practice src/modules/toeic`
- `pnpm --filter api test:e2e -- --runInBand`
- `node tests/unit/toeic-timed-test.unit.mjs`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm format:check`
- `pnpm planning:traceability`
- `pnpm story:verify stories/in-progress/EP2-ST010-toeic-error-notebook-and-remediation.md`
- `pnpm e2e`
- `git diff --check`

