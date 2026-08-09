---
id: EP3-ST007
title: Player, Resume, Bookmark, and Personal Note UI
status: blocked
type: fullstack
priority: high
phase: phase-3-licensed-content-library-and-listening
depends_on:
  - EP3-ST006
allowed_paths:
  - apps/api/prisma/schema.prisma
  - apps/api/prisma/migrations/**
  - apps/api/src/modules/library/**
  - apps/api/src/modules/access/**
  - apps/api/src/generated/**
  - apps/api/test/**
  - apps/web/src/app/library/**
  - apps/web/src/features/library/**
  - apps/web/src/widgets/library/**
  - apps/web/src/shared/**
  - tests/e2e/library-player.spec.ts
  - docs/04_SYSTEM_ARCHITECTURE.md
  - docs/06_BACKEND_ARCHITECTURE.md
  - docs/07_DATABASE_DESIGN.md
  - docs/08_API_CONTRACT.md
  - docs/09_UI_DESIGN_SYSTEM.md
  - docs/10_TEST_STRATEGY.md
  - docs/11_SECURITY_PLAN.md
  - stories/**
  - _bmad-output/implementation-artifacts/sprint-status.yaml
  - _bmad-output/planning-artifacts/story-map.md
forbidden_paths:
  - apps/api/.env
  - apps/api/src/modules/auth/**
  - apps/api/src/modules/toeic/**
  - apps/web/src/app/admin/**
  - package.json
  - pnpm-lock.yaml
  - .github/**
  - main
requires_human_approval: false
max_fix_rounds: 2
risk: high
delivery_mode: full
---

# Story: Player, Resume, Bookmark, and Personal Note UI

## Goal

Let an authenticated learner open an eligible library item, play or inspect
its controlled media when available, resume from server-owned progress, and
save private bookmarks and notes without exposing provider references or
allowing cross-user access.

## Scope

Extend the EP3-ST006 item boundary with additive, owner-scoped learning state
for library items: a bounded playback position/status, idempotent progress
updates, private bookmarks, and private personal notes. Build the responsive
learner player/detail UI on the existing `/library` route and shared frontend
patterns. The server remains authoritative for eligibility, ownership, bounds,
and persistence. Use the controlled media state from EP3-ST006; do not add
real storage credentials, unsigned URLs, provider calls, listening drills,
shadowing, or Phase 4/5 work.

## Acceptance Criteria

- An authenticated learner can open a published, eligible library item through
  the EP3-ST006 endpoint and sees title, taxonomy, transcript, duration, and
  an explicit `AVAILABLE`, `PENDING`, `QUARANTINED`, or `RETIRED` media state.
  The UI never fabricates a player URL when media is unavailable and never
  exposes Drive IDs, object keys, reviewer evidence, or provider metadata.
- The API persists learner-owned item progress with a constrained state
  (`not_started`, `in_progress`, `completed`, `abandoned`) and bounded position
  data. Updates are authenticated, owner-scoped, idempotent, and cannot move
  progress outside the known item duration or mutate another learner's state.
  Resume data is returned from the server and wins over stale browser storage.
- The API supports owner-scoped bookmarks and personal notes for an eligible
  library item. Bookmark timestamps and note text have strict bounds and
  validation; duplicate writes are safe, reads are deterministic, and no
  learner can read, update, or delete another learner's records. Missing or
  ineligible items fail closed with the existing indistinguishable access
  behavior.
- The player/detail UI has mobile-first loading, empty/unavailable, error with
  retry, and success states; transcript navigation and progress controls are
  keyboard accessible, have labels, and do not claim playback completion until
  the server accepts the completion update. Optimistic UI must reconcile with
  the authoritative response and show save failures without losing unsaved
  note text.
- Add API unit and E2E tests for auth, eligibility, owner isolation, bounds,
  idempotency, media-state rendering, progress conflict/reconciliation,
  bookmark/note CRUD, sanitization, and not-found indistinguishability. Add
  browser coverage for the learner journey, unavailable media, resume, note,
  bookmark, retry, keyboard access, and mobile layout. Existing catalog and
  backend quality gates remain green.
- Update approved architecture/database/API/security/UI/test documentation to
  describe the additive owner-scoped records, lifecycle/bounds, redaction
  boundary, and client/server state reconciliation. Do not perform destructive
  migrations or change credentials, auth, TOEIC, or provider activation.

## Verification

- `node scripts/story-doctor.mjs stories/in-progress/EP3-ST007-player-resume-bookmark-and-notes.md`
- `pnpm story:verify stories/in-progress/EP3-ST007-player-resume-bookmark-and-notes.md`
- `pnpm --filter api exec prisma validate`
- `pnpm --filter api exec node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand src/modules/library/**/*.spec.ts src/modules/access/**/*.spec.ts`
- `pnpm --filter api test:e2e -- library-player.e2e-spec.ts`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm story:test -- library-player.spec.ts`
- `git diff --check`

## Implementation Guardrails

- Preserve the EP3-ST005 eligibility predicate and EP3-ST006 safe projection;
  do not duplicate access rules in the browser or controller.
- Follow Controller -> Service -> Repository and PrismaService boundaries;
  DTOs must validate all write inputs. Additive schema changes require a
  reviewed migration and a matching update to `docs/07_DATABASE_DESIGN.md`.
- Keep route files thin and use existing TanStack Query/Zustand/shared UI
  conventions. Every new screen state must be explicit and mobile-first.
- Treat note content as plain text: bound length, reject invalid control data,
  and render safely without HTML injection. Do not log note bodies or private
  learner state.
- If the required migration is destructive, shared-data destructive, or needs
  external provider configuration, stop and create the required AI request;
  do not silently broaden scope or mark this story done.

## Risk and Review

High risk: this changes learner progress persistence, data ownership, and a
learner-facing playback boundary. Full review and full quality gates are
mandatory. Automated review may be unavailable under the known Windows
`CreateProcessWithLogonW failed: 2` runner limitation; if so, record the
manual adversarial review and all actual evidence in the story rather than
claiming automated review passed.



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
