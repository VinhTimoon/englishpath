---
id: EP4-ST002
title: TOEIC Speaking Task and Submission API
status: review
type: backend
priority: high
phase: phase-4-toeic-speaking-writing-and-four-skills
depends_on:
  - EP4-ST001
allowed_paths:
  - apps/api/src/modules/toeic/**
  - apps/api/src/modules/access/**
  - apps/api/src/modules/audit/**
  - apps/api/test/**
  - apps/api/prisma/schema.prisma
  - apps/api/prisma/migrations/**
  - apps/api/src/generated/prisma/**
  - docs/07_DATABASE_DESIGN.md
  - docs/08_API_CONTRACT.md
  - docs/10_TEST_STRATEGY.md
  - docs/11_SECURITY_PLAN.md
  - stories/**
  - _bmad-output/implementation-artifacts/sprint-status.yaml
  - _bmad-output/planning-artifacts/story-map.md
forbidden_paths:
  - apps/api/.env
  - apps/api/src/modules/auth/**
  - apps/api/src/modules/ai-gateway/**
  - apps/api/src/modules/library/**
  - apps/api/src/modules/practice/**
  - apps/web/**
  - package.json
  - pnpm-lock.yaml
  - .github/**
  - main
requires_human_approval: false
max_fix_rounds: 2
risk: high
delivery_mode: full
---

# Story: TOEIC Speaking Task and Submission API

## Goal

Let an authenticated learner start an approved Speaking task and submit a
bounded response acknowledgement safely, with owner isolation, server-side
validation, idempotent retry behavior, and no premature recording, AI, or
official-score behavior.

## Scope

Build the protected backend API and additive persistence boundary for Speaking
task sessions/submissions using the immutable task/rubric models from
EP4-ST001. The API may accept text-safe submission metadata and a controlled
recording placeholder/reference contract for the later storage story, but it
must not upload, resolve, or expose provider media. Persist learner ownership,
task version, lifecycle, request identity, and submission metadata only. Use
existing auth guards, DTO validation, Prisma service/repository boundaries,
correlation metadata, and sanitized TOEIC error handling.

## Acceptance Criteria

- Authenticated learners can start an eligible published Speaking task and
  receive a safe task projection plus an owner-scoped session identifier. Draft,
  withdrawn, unknown, wrong-skill, or unavailable versions fail closed without
  revealing private task/provider metadata.
- A protected submission endpoint validates session ownership, task-version
  identity, lifecycle, response mode, bounded duration/size/metadata, and
  server-authorized idempotency/request identity. It rejects missing, malformed,
  duplicate-conflicting, late, cross-user, or already-finalized submissions
  deterministically.
- Exact submission retries return the original acknowledgement and do not create
  a second submission or mutate a finalized session. A changed payload using the
  same idempotency key returns a safe conflict. Concurrent finalize/submit paths
  use an atomic owner/lifecycle check.
- The API never returns raw audio bytes, object keys, provider URLs, bearer
  tokens, rubric internals, hidden scoring formulas, official scores, or raw
  persistence rows. Submission responses expose only stable IDs, lifecycle,
  accepted metadata, timestamps, and safe error envelopes.
- Additive persistence changes include owner/task-version/session/submission
  linkage, uniqueness for idempotency, lifecycle timestamps, and indexes needed
  for owner-scoped reads. No destructive migration or production data mutation
  is allowed; update database design and migration evidence.
- Add unit, repository, and API E2E coverage for authentication, task
  publication gating, owner isolation, DTO allowlists, valid submission,
  exact replay, changed-payload conflict, duplicate/finalized/late submission,
  atomic lifecycle behavior, safe redaction, and sanitized errors. Preserve all
  existing TOEIC practice/timed-test behavior.
- No recording provider, AI gateway, official score, or frontend is activated
  in this story. If the approved contract requires real media storage,
  production credentials, legal/licensed prompt decisions, or a destructive
  migration, create an AI request and block instead of assuming approval.

## Verification

- `node scripts/story-doctor.mjs stories/review/EP4-ST002-toeic-speaking-task-submission-api.md`
- `pnpm story:verify stories/in-progress/EP4-ST002-toeic-speaking-task-submission-api.md`
- `pnpm prisma:validate`
- `pnpm --filter api test -- --runInBand "toeic|access|audit"`
- `pnpm --filter api test:e2e -- toeic-speaking.e2e-spec.ts toeic-practice.e2e-spec.ts toeic-timed-test.e2e-spec.ts`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm e2e`
- `git diff --check`

## Implementation Guardrails

- Keep controller -> service -> repository layering and use `PrismaService`;
  never instantiate PrismaClient in a controller/service. Use strict DTO
  whitelist/forbid rules and existing auth principal ownership.
- Treat server time and lifecycle as authoritative. Do not trust client score,
  duration, publication state, owner ID, or task version fields beyond the
  validated request contract.
- Use additive Prisma changes only, document them, and do not run destructive
  migrations. Do not include recording blobs or provider locators until
  EP4-ST003 defines the controlled storage contract.
- Do not modify auth, AI gateway, library, practice, frontend, package, `.env`,
  CI, or production deployment files.

## Definition of Done

Speaking task start/submission is authenticated, owner-isolated, persisted,
bounded, idempotent, redacted, and covered by unit/repository/API E2E gates;
existing TOEIC flows remain green and later recording/AI/UI stories have a
stable server contract.

## Story Creation Notes

- Created after EP4-ST001 close commit `980257b`.
- EP4-ST002 implementation is complete and in review; later EP4/EP5 stories remain
  backlog until their declared dependencies pass.



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

## AI Request

Blocked by the approved persistence/source boundary decision request:
`notes/ai-req/2026-08-10-ep4-st002-speaking-submission-persistence-boundary.md`.

## Owner Decision / Recovery Record

- Owner approved Option 1 on 2026-08-10 and authorized resuming this same
  story; no recovery story is created.
- The task source boundary is an EnglishPath-owned, credential-free reviewed
  fixture/catalogue. Supplied Drive sources remain read-only references; no
  Drive original is edited or deleted.
- The generated Prisma client path is explicitly added to the allowed scope.
- Recording storage, provider media, AI, official scoring, and frontend remain
  out of scope. The local catalogue is bounded to reviewed EnglishPath-owned
  fixture data until a governed source import is available.

## Implementation Tasks

- [x] Add additive Speaking task/session/submission persistence and migration.
- [x] Add owner-scoped repository and service with publication, bounds,
  lifecycle, and idempotency policy.
- [x] Add strict DTO/controller routes and safe projections.
- [x] Add unit, repository, and API E2E regression coverage.
- [x] Update database/API/security/test documentation and run full gates.

## Implementation Record

- Added published EnglishPath-owned Speaking fixture `ep-speaking-read-aloud-001`
  behind a catalogue boundary. It is credential-free and does not expose
  provider/source internals.
- Added additive `ToeicSpeakingSession` and `ToeicSpeakingSubmission` models,
  owner/idempotency indexes, and transactional ACTIVE-to-FINALIZED compare and
  set. The migration is validation/generated evidence only.
- Added protected start, read, and submit routes with strict DTO allowlists,
  bounded recording metadata, exact replay, changed-key conflict, publication
  gating, owner scoping, and learner-safe projections.

## Verification Evidence

- Story doctor and story verification passed.
- Prisma validation and generated-client TypeScript validation passed.
- Focused unit: 1 suite / 4 tests passed.
- Focused API E2E: 1 suite / 2 tests passed.
- TOEIC/access/audit regression: 22 suites / 153 tests passed.
- TOEIC practice/speaking/timed-test E2E: 2 suites / 21 tests passed.
- Full typecheck, test (66 suites / 473 tests), build, and browser E2E (87/87)
  passed. Full lint passed after the final lint fixes.
- `git diff --check` passed.
