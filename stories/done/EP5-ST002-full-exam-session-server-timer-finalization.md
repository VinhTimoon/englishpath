---
id: EP5-ST002
title: Full exam session, server timer, finalization, and idempotency
status: done
type: backend
priority: highest
phase: phase-5-full-test-adaptive-ai-and-community
depends_on:
  - EP5-ST001
allowed_paths:
  - apps/api/src/modules/toeic/full-mock-test/**
  - apps/api/src/modules/toeic/toeic-timed-test.models.ts
  - apps/api/src/modules/toeic/toeic-timed-test.policy.ts
  - apps/api/src/modules/toeic/toeic-timed-test.repository.ts
  - apps/api/src/modules/toeic/toeic-timed-test.service.ts
  - apps/api/src/modules/toeic/toeic-timed-test.selection.ts
  - apps/api/src/modules/toeic/dto/toeic-timed-test.dto.ts
  - apps/api/src/modules/toeic/toeic.controller.ts
  - apps/api/src/modules/toeic/toeic.module.ts
  - apps/api/src/modules/toeic/**/*.spec.ts
  - apps/api/test/toeic-timed-test.e2e-spec.ts
  - apps/api/prisma/schema.prisma
  - apps/api/prisma/migrations/20260811120000_ep5_full_timed_test_mode/migration.sql
  - apps/api/src/generated/prisma/**
  - docs/06_BACKEND_ARCHITECTURE.md
  - docs/07_DATABASE_DESIGN.md
  - docs/08_API_CONTRACT.md
  - docs/10_TEST_STRATEGY.md
  - docs/11_SECURITY_PLAN.md
  - docs/13_DECISION_LOG.md
  - stories/**
  - _bmad-output/implementation-artifacts/sprint-status.yaml
  - _bmad-output/planning-artifacts/story-map.md
forbidden_paths:
  - apps/api/.env
  - apps/api/prisma/migrations/**/migration_lock.toml
  - apps/web/**
  - packages/**
  - package.json
  - pnpm-lock.yaml
  - main
  - shared Supabase or production data
requires_human_approval: false
max_fix_rounds: 2
risk: high
delivery_mode: full
---

# Story: Full exam session, server timer, finalization, and idempotency

## Goal

Expose the first real full TOEIC mock-test session on the existing authenticated
timed-test boundary. A learner must receive one server-owned, immutable 200-item
blueprint from EP5-ST001, answer within the server deadline, resume safely, and
obtain one authoritative finalization result without duplicate scoring or cross-user
access.

## User value

As an authenticated learner, I want to start and complete a full mock test with a
trusted server timer, so that refreshes, retries, late submissions, and duplicate
requests cannot lose my attempt or change my result.

## Scope

This story implements only the backend session boundary for `FULL`. It may extend
the existing timed-test route contract additively and the existing session mode enum.
It does not implement the exam UI (EP5-ST003), scoring/weakness analysis changes
(EP5-ST004), new content imports, integrity telemetry, AI, or Phase 6 work.

## Existing contract and constraints

- Baseline is commit `1ce0d9d`, which contains the reviewed EP5-ST001 full-mock
  policy and deterministic assembler.
- Existing `ToeicTimedTestSession` and `ToeicTimedTestAnswer` persistence is the
  approved owner-scoped session model. Do not add a second session model.
- Existing `MINI` and `HALF` behavior, policy values, response fields, and browser
  journeys are regression contracts and must remain unchanged.
- The existing repository eligibility predicate is the only catalogue boundary.
  Never accept learner-supplied question IDs, quotas, policy versions, scores, or
  deadlines as authority.
- The full mock must use the EP5-ST001 policy and assembler, not a copied quota map.
  A missing or malformed eligible catalogue fails atomically; it must never create a
  partial, guessed, or fabricated session.
- The migration is additive local/generated evidence only. Do not apply it to shared
  Supabase or production infrastructure during this story.

## Acceptance Criteria

1. The server-owned timed-test policy exposes `FULL` exactly as defined by EP5-ST001:
   200 total questions, 7,200 seconds, 100 Listening, 100 Reading, and exact Part
   quotas 6/25/39/30/30/16/54. The policy version is persisted with the session.
2. `POST /api/v1/toeic/tests/sessions` accepts `mode: FULL` with the existing strict
   DTO and standard authenticated envelope. Unknown fields and invalid modes remain
   rejected. `MINI` and `HALF` requests are behaviorally backward compatible.
3. A FULL start reads only the backend eligible private catalogue, invokes the
   EP5-ST001 assembler, and persists the exact ordered `selectedVersionIds` as the
   session snapshot. The response contains learner-safe question fields only; it
   never contains `correctAnswer`, source/license/governance evidence, provider data,
   credentials, or internal selection details.
4. FULL start is atomic on insufficient/malformed content: no session is persisted
   and the API returns the existing sanitized catalogue/content error contract. It
   never returns a partial test or silently falls back to MINI/HALF.
5. Start idempotency remains actor-bound through `(userId, clientSessionId)`. The
   exact same FULL request replays the same session and question snapshot; a changed
   mode for the same client session conflicts. Concurrent unique-key races resolve to
   the same owner session or a sanitized conflict without duplicate sessions.
6. Session reads, answers, submit, result, and all repository lookups remain
   authenticated and owner-scoped. A learner cannot read, answer, finalize, or infer
   another learner's session by ID or client session ID.
7. The deadline is calculated only from the server clock and persisted `deadlineAt`.
   Client time, client duration, and client completion claims are ignored. Active
   reads expose bounded remaining time; late reads/answers finalize or reject through
   the existing safe expiry behavior.
8. Answer writes remain retry-safe and authoritative: the server validates that the
   question belongs to the immutable snapshot and that the option is valid; same
   retries replay, changed retries conflict, closed/expired sessions reject, and no
   pre-finalization correctness or answer key leaks.
9. Submit is atomic and exactly-once: before the deadline an incomplete session is
   rejected without finalization; a complete session becomes `SUBMITTED`; a late
   session becomes `EXPIRED`; duplicate submit returns the persisted terminal result
   without a second score or state transition. The persisted score is server-derived.
10. The additive Prisma change is limited to allowing `FULL` in the existing
    `ToeicTimedTestMode` enum and is documented. No destructive SQL, new persistence
    model, shared-database execution, or unrelated schema change is introduced.
11. Unit and API E2E tests cover FULL policy/assembly integration, exact 200-question
    response shape, insufficient catalogue atomicity, owner isolation, idempotent
    start, server deadline/expiry, answer retry/conflict, incomplete submit, terminal
    replay, and redaction. The existing browser regression journey in
    `tests/e2e/toeic-timed-test.spec.ts` continues to cover the unchanged MINI/HALF
    learner behavior; the FULL browser UI is explicitly owned by EP5-ST003 because
    this backend story forbids frontend changes.

## Verification commands

```text
pnpm story:doctor -- stories/in-progress/EP5-ST002-full-exam-session-server-timer-finalization.md
pnpm planning:traceability
pnpm --filter api exec jest --runInBand src/modules/toeic/toeic-timed-test.policy.spec.ts src/modules/toeic/toeic-timed-test.service.spec.ts src/modules/toeic/toeic-timed-test.repository.spec.ts src/modules/toeic/full-mock-test
pnpm --filter api exec jest --runInBand test/toeic-timed-test.e2e-spec.ts
pnpm --filter api exec prisma validate --schema prisma/schema.prisma
pnpm --filter api lint
pnpm --filter api typecheck
pnpm format:check
pnpm story:verify stories/in-progress/EP5-ST002-full-exam-session-server-timer-finalization.md
pnpm story:checks
git diff --check
```

## Review and risk controls

- `risk: high`; full review is mandatory because this changes authenticated
  persistence, timer authority, answer integrity, and learner progress.
- Keep `max_fix_rounds: 2`. If a required change crosses a forbidden path or needs
  shared Supabase/production approval, stop and record the exact blocker rather than
  weakening the contract.
- Never run a migration against shared Supabase or production from the loop.
- Do not resume any historical blocked/superseded story; this story is the successor
  for the session boundary only and does not erase EP5-ST001 history.

## Developer notes

- Read the complete existing timed-test models, policy, selection helper, repository,
  service, DTO, controller, module, Prisma timed-session models, API contract, and
  timed-test tests before modifying code.
- Reuse `FullMockPolicy`/`assembleFullMock` and the existing
  `selectNewestByCanonical` behavior. Keep all business rules in services/policies
  and database access in the repository.
- Preserve the standard correlation/error envelope and strict validation pipeline.
- Do not update frontend files in this story. The next story owns learner exam UI.

## Completion note

Created as the sole dependency-ready Phase 5 story after EP5-ST001 passed review and
merged into `dev`; Phase 6 remains suspended indefinitely by product direction.

## Recovery Evidence

- The first implementation loop reached build and quality checks but its review was
  blocked by the Windows read-only Codex sandbox (`CreateProcessWithLogonW failed: 2`)
  after reporting two actionable P1 findings.
- This existing story is being resumed; no recovery story is created. The blocked
  report remains below as historical evidence and must not be deleted.
- Recovery fixes must regenerate the tracked Prisma client after the additive enum
  change and add explicit FULL policy, 200-item assembly/session, atomic failure,
  idempotency, timer, and redaction coverage.

## Recovery Review Evidence

- Final Codex review result: `pass`; no P0/P1 findings.
- P2 notes are retained as non-blocking follow-up risks: runtime shared-database
  concurrency remains outside this credential-free story gate, and some FULL
  lifecycle assertions reuse the existing generic timed-test coverage.
- Targeted API tests: 45 unit/repository tests and 21 API E2E tests passed.
- Full quality gate passed: 73 API unit suites / 518 tests, 22 API E2E suites /
  124 tests, 99 Chromium browser tests, lint, typecheck, build, Prisma validate,
  format, planning traceability, story verification, and `git diff --check`.



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
