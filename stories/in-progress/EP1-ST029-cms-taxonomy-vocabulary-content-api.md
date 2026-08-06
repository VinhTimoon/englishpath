---
id: EP1-ST029
title: Persisted CMS Taxonomy And Governed Content Lifecycle API
status: in-progress
type: backend
priority: critical
phase: phase-1-learning-core
risk: high
delivery_mode: full-review
depends_on:
  - EP1-ST008
  - EP1-ST020
  - EP1-ST028
allowed_paths:
  - apps/api/prisma/schema.prisma
  - apps/api/prisma/migrations/**
  - apps/api/src/generated/**
  - apps/api/src/modules/cms/**
  - apps/api/src/modules/content-governance/**
  - apps/api/src/modules/admin/**
  - apps/api/src/modules/auth/**
  - apps/api/src/app.module.ts
  - apps/api/test/**
  - docs/06_BACKEND_ARCHITECTURE.md
  - docs/07_DATABASE_DESIGN.md
  - docs/08_API_CONTRACT.md
  - docs/10_TEST_STRATEGY.md
  - docs/11_SECURITY_PLAN.md
  - stories/ready/EP1-ST029-cms-taxonomy-vocabulary-content-api.md
  - stories/in-progress/EP1-ST029-cms-taxonomy-vocabulary-content-api.md
  - stories/review/EP1-ST029-cms-taxonomy-vocabulary-content-api.md
  - stories/done/EP1-ST029-cms-taxonomy-vocabulary-content-api.md
forbidden_paths:
  - apps/api/.env
  - apps/web/.env
  - apps/web/.env.local
  - "**/package.json"
  - "**/pnpm-lock.yaml"
  - packages/**
  - provider configuration
  - production credentials
  - main
  - destructive migrations
  - apps/api/src/modules/vocabulary/**
  - apps/api/src/modules/identity/**
  - apps/web/**
  - public learner routes
requires_human_approval: false
max_fix_rounds: 2
---

# Story: Persisted CMS Taxonomy And Governed Content Lifecycle API

## Goal

As a content editor or administrator, I want a persisted, role-guarded CMS
taxonomy and content-version lifecycle API, so that reviewed learning content can
be created, audited, and published without bypassing rights or human review.

This is the dependency root for `EP1-ST030` through `EP1-ST036`. It creates no
admin UI, learner route, import worker, or content seed batch.

## Acceptance Criteria

1. A strict `/api/v1/cms` API can create and list bounded taxonomy nodes with
   parent validation, canonical taxonomy fields, and deterministic pagination;
   duplicate or malformed taxonomy input returns a sanitized validation error.
2. An authenticated `CONTENT_EDITOR`, `ADMIN`, or `SUPER_ADMIN` can create one
   immutable draft content version with source, checksum, source version,
   provenance, usage scope, access tier, rights owner, license state, taxonomy
   reference, bounded title/body, and a client request key. Retries with the same
   `(contentId, clientRequestId)` return the original version without duplication.
3. Every new version starts as `reviewStatus=draft` and `publishStatus=draft`;
   no client field, JWT claim, or UI boolean can mark it reviewed or published.
   A revision must have a new version ID and changed checksum or source version.
4. Review requires a backend-resolved human actor with the canonical
   `content:review` permission, binds evidence to the exact content/version,
   checksum, and source version, rejects self-review for imported or AI-assisted
   content, and records approved or rejected review state.
5. Publish requires a separate backend-resolved human `content:publish` decision,
   approved review evidence, compatible non-expired rights, matching usage/access
   scope, and an unpublished draft. Rejected, unknown, blocked, expired, or
   incompatible rights fail closed; publication cannot be repeated or performed
   in place on an already published version.
6. All CMS mutation and denied policy decisions emit one redacted append-only
   audit event with actor, action, target, result, correlation ID, and bounded
   attributes. Raw source URLs, rights documents, content payloads, claims,
   tokens, reviewer notes, and database errors are never returned or audited.
7. CMS routes use `/api/v1`, DTO validation with whitelist/forbid-unknown-fields,
   stable error envelopes, correlation metadata, OpenAPI declarations, and
   controller/service/repository boundaries. Learner-facing vocabulary routes
   remain unchanged and only existing published projections may consume this data.
8. The Prisma change is additive, documented with rollback notes, generated and
   validated without a database connection, and no migration runs against shared
   or production data.
9. Unit, API E2E, authorization, idempotency, malformed-input, lifecycle,
   redaction, audit, and scope verification pass; no changed file is outside the
   allowed paths.

## Implementation Boundaries

- Reuse `content-governance` policy functions and `AuditService`; do not create a
  second taxonomy or authorization vocabulary.
- Resolve permissions from the persisted application principal. The current role
  adapter may map `CONTENT_EDITOR` to review and `ADMIN`/`SUPER_ADMIN` to review
  and publish, but the service must still issue an action-bound human decision.
- Keep persisted governance metadata separate from learner projections. Do not
  modify `GovernedVocabularyItem` or learner vocabulary behavior in this story.
- Use an additive Prisma migration only. Do not seed shared data or configure
  Supabase/provider credentials.

## Verification

- `node scripts/story-doctor.mjs stories/ready/EP1-ST029-cms-taxonomy-vocabulary-content-api.md --ready-only`
- `pnpm story:verify stories/ready/EP1-ST029-cms-taxonomy-vocabulary-content-api.md`
- `pnpm format:check`
- `pnpm planning:traceability`
- `pnpm tool:test`
- `pnpm prisma:validate`
- `pnpm --filter api exec prisma generate`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm --filter api test:e2e -- --runInBand`
- `pnpm build`
- `pnpm e2e`
- `git diff --check`

## Dev Notes

- Relevant contracts: `docs/06_BACKEND_ARCHITECTURE.md` §Content Governance
  Contract Foundation, `docs/07_DATABASE_DESIGN.md` §Content Inventory and
  Canonical Boundaries and §Planned Content Version Invariants,
  `docs/08_API_CONTRACT.md` §Domain-Specific Contract Constraints, and
  `docs/11_SECURITY_PLAN.md` §Data and Content Protection.
- Existing policy source: `apps/api/src/modules/content-governance/**`.
- Existing auth/audit patterns: `apps/api/src/modules/auth/**` and
  `apps/api/src/modules/audit/**`; do not bypass them.
- Backend module shape is controller → service → repository → `PrismaService`.
- Use the existing correlation/error filter conventions and test fake-Prisma
  patterns; do not expose generated Prisma types directly from HTTP responses.
