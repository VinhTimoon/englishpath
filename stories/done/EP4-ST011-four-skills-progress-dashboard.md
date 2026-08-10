---
id: EP4-ST011
title: Four Skills Progress Dashboard
status: done
type: backend
priority: medium
phase: phase-4-toeic-speaking-writing-and-four-skills
depends_on:
  - EP4-ST010
allowed_paths:
  - apps/api/src/modules/roadmap/**
  - apps/api/test/**
  - apps/web/app/**
  - apps/web/src/**
  - apps/web/tests/**
  - tests/e2e/**
  - docs/05_FRONTEND_ARCHITECTURE.md
  - docs/06_BACKEND_ARCHITECTURE.md
  - docs/08_API_CONTRACT.md
  - docs/09_UI_DESIGN_SYSTEM.md
  - docs/10_TEST_STRATEGY.md
  - docs/11_SECURITY_PLAN.md
  - notes/ai-req/**
  - _bmad-output/brainstorming/**
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

Add the minimal server-owned projection consumed by the future learner-facing
dashboard, extending the existing roadmap/today API with the EP4-ST010 safe
balance projection. This recovery slice does not implement frontend UI. Do not
create a second progress store, fake completion, official score, AI feedback,
submission, or provider integration.

## Acceptance Criteria

- The API presents exactly four canonical projection entries in the approved
  order with server-owned bounded target/reference values and explanation;
  frontend code never needs to infer progress from task types or aggregates.
- The projection is returned only after authentication and is owner-scoped;
  the repository receives the authenticated application user ID and no client
  supplied user ID is accepted.
- Missing Speaking/Writing pools are represented explicitly as unavailable,
  with no fabricated target, completion, prompt, score, or task reference.
- Existing roadmap/today response fields and behavior remain unchanged; the
  additive projection is the server source of truth for a later dashboard
  consumer and does not persist a second progress state.
- Unit and API/E2E coverage proves safe field projection, canonical ordering,
  backward compatibility, unavailable handling, and ownership/auth behavior.
- No schema/auth/AI/provider changes are needed. This story adds only the
  minimal roadmap API projection. If the existing policy cannot determine a
  field, stop rather than deriving hidden or fabricated values.

## Verification

- `node scripts/story-doctor.mjs stories/done/EP4-ST011-four-skills-progress-dashboard.md`
- `pnpm story:verify stories/done/EP4-ST011-four-skills-progress-dashboard.md`
- `pnpm --filter api test -- --runInBand src/modules/roadmap/four-skills.balance.spec.ts`
- `pnpm --filter api test:e2e -- roadmap-today.e2e-spec.ts`
- `pnpm --filter api exec tsc --noEmit`
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

The additive Four Skills API projection is useful, honest, owner-scoped,
allowlisted, regression-tested, and integrated with the existing learner
roadmap without changing progress semantics; frontend work remains a later
consumer story.

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

## Recovery Record

- Owner decision: approve Option 1 from the roadmap projection AI request.
- Resume this same EP4-ST011 story in place; do not create a recovery story.
- Scope is the minimal authenticated `GET /api/v1/roadmaps/current` additive
  projection. No EP4-ST002, EP4-ST005, or EP4-ST007 implementation is allowed.
- Speaking/Writing remain explicit unavailable entries unless an approved task
  reference is already present; no task, target, progress, or provider data is
  fabricated.

## Recovery Verification

- Added an additive `fourSkills` projection to the existing roadmap service;
  existing roadmap, today, and aggregate fields remain unchanged.
- Reused the EP4-ST010 learner-safe projection boundary. Reading/Listening are
  projected only from existing roadmap-owned items; generic Speaking/Writing
  items are not promoted to approved TOEIC activities and therefore fail closed
  as unavailable.
- Added owner-scoped API regression coverage and allowlist assertions. No
  Prisma, auth, submission, provider, credential, or frontend changes were
  made.

## Manual Review

- PASS: canonical order is fixed as READING, LISTENING, SPEAKING, WRITING and
  every entry exposes only `skill`, `activityKind`, `target`, `reference`,
  `allocationReason`, `completionState`, and `availability`.
- PASS: unavailable entries use null activity/target/reference values and
  `UNAVAILABLE` state; they cannot become zero or completed through client
  inference.
- PASS: the existing authenticated controller calls the service with
  `request.principal.applicationUserId`, and the repository lookup remains
  owner-scoped with no client user ID input.
- PASS: no provider, rubric, submission, credential, answer, or private
  implementation fields cross the response boundary.

## Quality Gates

- `node scripts/story-doctor.mjs stories/done/EP4-ST011-four-skills-progress-dashboard.md` passed.
- `pnpm story:verify stories/done/EP4-ST011-four-skills-progress-dashboard.md` passed.
- Targeted Four Skills unit: 1 suite / 7 tests passed.
- Targeted roadmap API E2E: 1 suite / 4 tests passed.
- `pnpm --filter api exec tsc --noEmit` passed.
- `pnpm lint` passed.
- `pnpm typecheck` passed.
- `pnpm test` passed: 65 suites / 469 tests.
- `pnpm build` passed for API and web.
- `pnpm e2e` passed: 87 tests.
- `git diff --check` passed.
