---
id: EP2-ST003
title: TOEIC Admin Import Review and Publish Workflow
status: in-progress
type: backend
priority: critical
phase: phase-2-toeic-listening-reading
depends_on:
  - EP2-ST002
allowed_paths:
  - apps/api/src/modules/toeic/**
  - apps/api/src/modules/auth/**
  - apps/api/src/modules/access/**
  - apps/api/src/modules/audit/**
  - apps/api/src/app.module.ts
  - apps/api/test/**
  - docs/06_BACKEND_ARCHITECTURE.md
  - docs/08_API_CONTRACT.md
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

# Story: TOEIC Admin Import Review and Publish Workflow

## Goal

Give authorized content operators a safe, auditable workflow to import a TOEIC
question version, bind human review evidence to the exact content, and publish only
licensed, approved content that the learner question-bank API can deliver.

## Scope

Implement the TOEIC-specific import, review, and publish API through the existing
NestJS module boundaries. Reuse the existing application principal, role policy,
correlation metadata, audit service, and `ToeicQuestion`/
`ToeicQuestionVersion` schema from EP2-ST001. Do not implement learner practice
sessions, timers, scoring, UI, seed content, external storage, provider setup, or
schema/migration changes.

## Acceptance Criteria

- Add protected admin/editor endpoints for importing a new canonical question or
  immutable version, recording a separate human review decision, and publishing a
  reviewed version. Transport routes remain under `/api/v1/toeic` and use strict
  DTO allowlisting with sanitized stable envelopes.
- Import accepts the complete governed question payload, including the authoritative
  answer and source/license evidence, but those fields are never returned in a
  learner response or unrestricted error. It rejects malformed identifiers, enum
  values, options, answer references, dates, duplicate import identity, duplicate
  source/checksum/version identity, and invalid version lineage.
- Only `CONTENT_EDITOR`, `ADMIN`, or `SUPER_ADMIN` may import/review. Only `ADMIN`
  or `SUPER_ADMIN` may publish. Roles, ownership, license, review, and publication
  decisions come from backend-resolved application policy; client booleans or JWT
  role claims cannot grant access.
- Import creates or replays an immutable draft by an idempotency-safe import identity
  and never overwrites a published version. A duplicate exact request replays the
  original safe operator result; a conflicting payload returns a sanitized conflict.
- Review binds reviewer identity, decision, timestamp, exact canonical question,
  version, checksum, and source version. Review cannot approve a rejected, changed,
  incomplete, or self-reviewed version, and reviewer evidence is not accepted from
  a client-created authorization decision.
- Publish requires an approved review bound to the exact version, approved license,
  compatible usage/access scope, complete source and rights evidence, and no expired
  validity. It records server publication time and writes an audit event. Publishing
  a version twice or publishing stale/mismatched evidence is rejected without
  changing learner-visible content.
- Every allowed and denied import/review/publish decision emits a redacted audit
  event with actor, action, target, policy result, correlation ID, and bounded scalar
  attributes. Raw answer keys, source URLs, rights documents, provider claims, and
  database errors never enter HTTP errors or audit attributes.
- Add deterministic service/repository/API tests for role separation, self-review,
  idempotent replay/conflict, duplicate identity, lineage, answer/reference and
  license gates, stale review evidence, publish rejection, successful publication,
  audit behavior, unauthorized access, and safe response/error projection. Tests
  must not require Supabase credentials, a database, or network access.
- Document the endpoint contract, governance state transitions, role boundary,
  audit/redaction guarantees, and test evidence in the approved backend/API/test
  documents.

## Technical Requirements

- Use `PrismaService` and the existing TOEIC Prisma models through repository
  methods; controllers remain HTTP-only and services own policy/state transitions.
- Reuse `AuthenticationGuard`, application principal roles, `AuditService`, and the
  established correlation/error conventions. Do not introduce a parallel auth or
  audit implementation.
- Use explicit safe operator projections. The authoritative answer may be accepted
  and persisted only as backend governance data; it must not cross the learner API
  boundary created by EP2-ST002.
- Keep schema and generated-client paths untouched. If the approved workflow cannot
  be implemented with the EP2-ST001 schema, stop and mark this story blocked with
  technical evidence rather than changing the schema inside this story.

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
- `node scripts/story-doctor.mjs stories/in-progress/EP2-ST003-toeic-admin-import-review-publish-workflow.md`
- `pnpm story:verify stories/in-progress/EP2-ST003-toeic-admin-import-review-publish-workflow.md`

## Risk and Review

Risk is high because this workflow can publish unlicensed content, expose answer
keys, or grant privileged actions. Full review and full quality gates are mandatory;
the story cannot use the fast path.

## Dependency and Lifecycle Notes

`EP2-ST002` is done and provides the protected learner projection. Keep EP2-ST004
and later stories in backlog until this governance workflow passes or an explicit
owner decision records why its dependency is deferred.
