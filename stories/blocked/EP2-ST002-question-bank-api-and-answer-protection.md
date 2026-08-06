---
id: EP2-ST002
title: TOEIC Question Bank API and Answer Protection
status: blocked
type: backend
priority: critical
phase: phase-2-toeic-listening-reading
depends_on:
  - EP2-ST001
allowed_paths:
  - apps/api/src/modules/toeic/**
  - apps/api/src/app.module.ts
  - apps/api/src/toeic-question-schema.spec.ts
  - apps/api/test/**
  - docs/08_API_CONTRACT.md
  - docs/06_BACKEND_ARCHITECTURE.md
  - docs/10_TEST_STRATEGY.md
  - stories/**
  - _bmad-output/implementation-artifacts/sprint-status.yaml
  - _bmad-output/planning-artifacts/story-map.md
forbidden_paths:
  - apps/api/.env
  - apps/api/prisma/**
  - apps/api/src/generated/**
  - apps/web/**
  - packages/**
  - package.json
  - pnpm-lock.yaml
  - main
requires_human_approval: false
max_fix_rounds: 2
risk: high
delivery_mode: full
---

# Story: TOEIC Question Bank API and Answer Protection

## Goal

Expose a protected, paginated TOEIC question-bank read contract that returns only
eligible reviewed/published/licensed content while keeping the authoritative answer,
rights evidence, source locations, and review internals on the backend.

## Scope

Implement only the TOEIC question repository, service, controller, DTOs, module
wiring, safe response projections, API contract documentation, and credential-free
unit/API tests. Do not implement admin import/review/publish actions, listening or
reading sessions, timers, scoring, remediation, UI, database migrations, or seed
content; those belong to later stories.

## Acceptance Criteria

- Add `GET /api/v1/toeic/questions` with strict DTO validation, explicit pagination,
  deterministic ordering, and filters for Part, question type, difficulty, topic,
  and optional stimulus group.
- Add `GET /api/v1/toeic/questions/:id` for one eligible question version using a
  stable ID; unknown, unpublished, unreviewed, unlicensed, retired, or expired
  records are never returned as learner content.
- Require backend authentication for learner question delivery and use the existing
  bearer guard; no client-supplied role, entitlement, review, license, or publication
  boolean can bypass the policy.
- Return only a safe learner projection containing question/version identity, Part,
  question type, difficulty, topic/stimulus metadata, prompt, options, optional
  media reference, and learner-safe explanation fields. `correctAnswer`, source
  identity/URL/checksum/version, provenance, rights owner, license state, review
  evidence, reviewer identity, and publication internals must be absent from every
  success response and error detail.
- Enforce the stable response envelope, validated correlation metadata, and
  pagination metadata from the API contract. Reject unknown query/body fields and
  invalid page/size/filter values with sanitized validation errors.
- Keep controller HTTP-only, service policy/projection logic, and repository Prisma
  access separate. Repository queries must select only the fields needed by the
  safe projection and apply review/publication/license/time gates server-side.
- Add deterministic unit tests for filters, pagination, eligibility, answer-key
  redaction, unauthorized access, empty results, and repository failures; add API
  coverage for authentication/validation and the exact response shape without
  requiring real Supabase credentials or network access.
- Update `docs/08_API_CONTRACT.md`, `docs/06_BACKEND_ARCHITECTURE.md`, and
  `docs/10_TEST_STRATEGY.md` with the endpoint, redaction rules, policy boundary,
  and test evidence.

## Technical Requirements

- Use `PrismaService` and the `ToeicQuestionVersion` model from EP2-ST001; do not
  instantiate PrismaClient or query the database from controllers/services.
- Use `/api/v1/toeic`, NestJS DTO validation with `whitelist` and
  `forbidNonWhitelisted`, `AuthenticationGuard`, the existing correlation ID/error
  conventions, and a bounded page size consistent with the vocabulary APIs.
- Return a deterministic current published version per canonical question. Do not
  expose historical versions or choose a version on the client.
- Apply eligibility as reviewed status, published state, approved license, reached
  publication time, and no expired validity. Default-deny malformed or incomplete
  governance data.
- Do not add a public route, frontend consumer, migration, seed, external provider,
  credential, or production configuration.

## Verification Commands

- `pnpm --filter api exec jest --runInBand src/modules/toeic`
- `pnpm --filter api test:e2e -- --runInBand`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm format:check`
- `pnpm planning:traceability`
- `git diff --check`
- `node scripts/story-doctor.mjs stories/ready/EP2-ST002-question-bank-api-and-answer-protection.md`
- `pnpm story:verify stories/ready/EP2-ST002-question-bank-api-and-answer-protection.md`

## Risk and Review

Risk is high because a projection or authorization mistake can disclose TOEIC
answers or unlicensed content. Full review is mandatory. The story is complete only
when focused tests, API E2E, full quality gates, and a manual diff review confirm
that no answer or governance field crosses the HTTP boundary.

## Dependency and Lifecycle Notes

`EP2-ST001` is done and supplies the canonical schema. Keep all later Phase 2
stories in backlog until this API contract and its redaction evidence pass. If the
approved contract requires a schema or rights decision outside this scope, stop and
create an AI request instead of weakening answer protection.



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
