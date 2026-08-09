---
id: EP3-ST008
title: Listening Drills and Persisted Outcomes
status: review
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
  - tests/e2e/library-listening.spec.ts
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

# Story: Listening Drills and Persisted Outcomes

## Goal

Let an authenticated learner complete a short server-governed listening drill
for an eligible licensed item and receive a safe result that is persisted to
the learner's own history without leaking answers or provider data.

## Scope

Add a provider-neutral drill boundary over EP3-ST006 content. A drill adapter
may use local approved fixtures only and must return stable drill identity,
prompt, options, and bounded metadata; correct answers remain server-side until
submission. Persist one owner-scoped outcome per attempt with score, answer
status, and completion timestamp. Build the learner drill UI within the
existing library item route with loading, unavailable, error/retry, active,
submitted, and empty states. Do not add TOEIC scoring, shadowing, AI calls,
provider activation, credentials, or Phase 4/5 work.

## Acceptance Criteria

- `GET /api/v1/library/items/:versionId/drill` requires authentication,
  rechecks EP3-ST005 eligibility, and returns only a bounded drill projection:
  stable drill/question IDs, prompt, options, item reference, and safe media
  state. It never returns `correct_answer`, answer keys, scoring rules that
  reveal the answer, provider locators, source IDs, or reviewer evidence.
- A learner can submit one answer to a server-owned drill question through an
  authenticated endpoint. The server validates question/item identity,
  accepts only allowed option IDs, scores against the server-side fixture,
  and returns the result only after submission. Repeated submissions are
  idempotent and cannot create duplicate outcomes or change a finalized
  outcome.
- Outcomes are persisted with the authenticated application user, item,
  drill/question identity, selected option, correctness, score, and server
  timestamp. Reads are owner-scoped and deterministic; another learner cannot
  read or mutate the outcome. Unknown, ineligible, expired, withdrawn, or
  malformed content fails closed with the existing access behavior.
- The learner UI supports explicit loading, no-drill/unavailable, API error
  with retry, active question, submitted result, and empty history states.
  Answer choices are keyboard accessible, cannot be changed after server
  submission, and never show correctness before submission. Mobile 360px has
  no overflow and the result remains understandable without color alone.
- Add unit, API E2E, and browser coverage for authentication, answer-key
  redaction, invalid options, eligibility isolation, duplicate submission,
  finalized outcome immutability, owner isolation, retry, unavailable/empty
  states, keyboard interaction, mobile layout, and accessibility smoke checks.
- Update approved database/API/security/UI/test documentation for the drill
  adapter boundary, answer secrecy, outcome ownership, idempotency, and
  finalized-result rules. Schema changes must be additive and non-destructive;
  no credentials or external provider configuration may be added.

## Verification

- `node scripts/story-doctor.mjs stories/review/EP3-ST008-listening-drills-and-persisted-outcomes.md`
- `pnpm story:verify stories/review/EP3-ST008-listening-drills-and-persisted-outcomes.md`
- `pnpm --filter api exec prisma validate`
- `pnpm --filter api exec node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand src/modules/library/**/*.spec.ts src/modules/access/**/*.spec.ts`
- `pnpm --filter api test:e2e -- library-listening.e2e-spec.ts`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm exec playwright test tests/e2e/library-listening.spec.ts`
- `git diff --check`

## Implementation Guardrails

- Reuse EP3-ST005 eligibility and EP3-ST006 safe item/media projections;
  controllers remain thin and all business rules stay in service/repository
  layers.
- Keep answer keys in the backend adapter/service only. Never serialize them
  into API envelopes, logs, browser fixtures, or client state before submit.
- Use PrismaService through a repository, validate DTOs strictly, include the
  authenticated user in every outcome query, and use a unique attempt key or
  finalized record rule for idempotent submission.
- Keep local fixtures credential-free and provider-neutral. If real licensed
  content, storage activation, a destructive migration, or an external paid
  service is required, create the required AI request and block this story.



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

- The original blocked lifecycle and commit `a00e2ef` are preserved as history.
- EP3-ST008 was resumed in place on `story/ep3-st008`; no new recovery story
  was created and no history was rewritten.
- The implementation now uses the approved local drill fixture and completes
  the full learner/API persistence path without external provider activation.

## Recovery Verification and Manual Review

- `pnpm story:checks` passed: format, planning traceability, tooling `59/59`,
  Prisma validation, lint, typecheck, unit `62 suites / 449 tests`, API E2E
  `16 suites / 102 tests`, production build, and browser E2E `83/83`.
- Focused coverage passed for library unit tests, listening API E2E `3/3`,
  and listening browser E2E `2/2`; `git diff --check` passed.
- Manual high-risk review found no P0/P1 findings: answer keys stay server-side,
  eligibility is rechecked, outcomes are owner-scoped and uniquely persisted,
  finalized submissions replay immutably, invalid options fail closed, and
  the UI covers loading, unavailable, error/retry, active, submitted, empty,
  keyboard, mobile, and accessible result states.
- Automated review was unavailable before repository inspection because the
  Windows subagent runner returned `CreateProcessWithLogonW failed: 2`; this is
  recorded as an environment limitation, not as a passed automated review.
