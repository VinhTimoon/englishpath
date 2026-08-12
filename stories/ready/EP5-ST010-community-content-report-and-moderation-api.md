---
id: EP5-ST010
title: Community content reporting and moderation API
status: ready
type: backend
priority: high
phase: phase-5-full-test-adaptive-ai-and-community
risk: high
delivery_mode: full-review
depends_on:
  - EP1-ST028
allowed_paths:
  - apps/api/prisma/schema.prisma
  - apps/api/prisma/migrations/**
  - apps/api/src/generated/**
  - apps/api/src/modules/community/**
  - apps/api/src/modules/audit/**
  - apps/api/src/app.module.ts
  - apps/api/test/**
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
  - apps/api/.env*
  - apps/web/**
  - package.json
  - pnpm-lock.yaml
  - .github/**
  - provider credentials or direct provider calls
  - production data or shared Supabase migrations
  - main
  - destructive migrations
requires_human_approval: false
max_fix_rounds: 2
---

# Story: Community content reporting and moderation API

## Goal

Establish the server-owned, auditable community boundary needed by the later
sharing UI. Authenticated learners can submit bounded text for review, read only
published community posts, and report a published post. Authorized
`CONTENT_EDITOR`, `ADMIN`, and `SUPER_ADMIN` operators can inspect a paginated
moderation queue and apply an explicit moderation decision. No post is published
directly by a learner or by a client-provided status.

## Scope

Implement one NestJS `community` module using the existing
controller -> service -> repository layering and `PrismaService`.

The additive API surface is:

- `POST /api/v1/community/posts`: authenticated learner creates a bounded post
  in `PENDING_REVIEW`; the request accepts only the approved content fields and
  a required idempotency key.
- `GET /api/v1/community/posts`: authenticated learners receive only published
  posts, with bounded `limit`/`offset` pagination and a stable safe projection.
- `POST /api/v1/community/posts/:postId/reports`: authenticated learner submits
  one bounded report for a post, owner-attributed and idempotent. A learner may
  not report a missing or unpublished target through a distinguishable response.
- `GET /api/v1/community/moderation/queue`: a guarded content editor/admin
  receives a paginated safe queue projection containing no private report text,
  credentials, claims, or raw database fields.
- `POST /api/v1/community/moderation/:postId/decision`: a guarded operator
  applies `PUBLISH`, `REJECT`, or `ARCHIVE` to a pending/flagged post. The
  decision is strict, actor-owned, idempotent, transaction-safe, and emits one
  redacted append-only audit event.

The API must not add comments, follows, reactions, direct messaging, search,
notifications, automatic AI moderation, provider configuration, media uploads,
or the Phase 5 sharing UI. EP5-ST011 owns learner and moderator UI.

## Acceptance Criteria

1. Authenticated post creation accepts only a strict, bounded DTO; identity,
   owner, timestamps, status, and publication state are server-owned. Every new
   post starts in `PENDING_REVIEW` and cannot be published by the caller.
2. Published listing is authenticated, paginated, deterministic, and returns
   only an allowlisted learner-safe projection. Draft, pending, rejected,
   flagged, archived, report, actor, audit, and internal persistence fields do
   not appear in the listing.
3. A learner can report an eligible published post with one bounded reason and
   required idempotency key. Reports are owner-scoped, duplicate-safe, do not
   reveal whether an unpublished/private target exists, and move the target into
   a server-owned flagged/reviewable state when policy requires it.
4. The moderation queue is protected by the existing authentication and role
   guards and is available only to the approved application roles. A forged JWT
   role, client role field, free learner, missing token, inactive identity, or
   unknown role cannot read or mutate moderation data.
5. Moderation decisions accept only `PUBLISH`, `REJECT`, or `ARCHIVE`, enforce
   valid server-side state transitions, record the authenticated actor and
   correlation ID, and are idempotent without applying a second state change or
   second audit side effect. Rejected/archived content is never returned by the
   published listing.
6. Prisma changes are additive only and use explicit ownership, status, report,
   idempotency, and audit relationships/constraints. No destructive migration,
   shared database execution, credential change, or production deployment is
   performed. `docs/07_DATABASE_DESIGN.md` records the model and rollback note.
7. Controllers remain transport-only; DTO validation is strict and bounded;
   services own policy and transactions; repositories own Prisma access; API
   responses use `/api/v1`, standard envelopes, correlation metadata, and
   sanitized errors. OpenAPI decorators/contracts are updated consistently.
8. Unit and API E2E coverage proves authentication, owner isolation, strict
   validation, pagination, unpublished-content redaction, report idempotency,
   role separation, valid/invalid moderation transitions, audit redaction,
   moderation idempotency, and absence of sensitive fields. Existing API tests
   remain green.
9. No frontend, provider, AI, package, environment, CI, or Phase 6 change is
   introduced. The implementation is ready for EP5-ST011 to consume without
   requiring client-side moderation or publication assumptions.

## Server-owned state and safe projection

Use explicit enums and transitions; do not accept status or actor IDs from
clients. The minimum post lifecycle is:

`PENDING_REVIEW -> PUBLISHED | REJECTED | ARCHIVED` and
`PUBLISHED -> FLAGGED -> PUBLISHED | ARCHIVED`.

The learner post projection may contain only stable post ID, bounded title/body
or body-equivalent approved text, author display projection allowed by the
approved contract, and published/created timestamps. Do not expose email,
application user ID, reports, moderation notes, audit attributes, raw claims,
private source locations, or internal provider/policy payloads. If the approved
contract does not define an author display field, omit author identity rather
than inventing one.

The moderation projection may contain only the bounded fields needed to decide
the item and report count/reason category; never expose private report text or
unredacted actor data. Exact fields must be shaped in the service, not by
serializing Prisma records.

## Architecture and security constraints

- Reuse `AuthenticationGuard`, `RequiredRoleGuard`/existing admin guard,
  `ApplicationPrincipal`, `authCorrelationId`, `AuditService`, and the standard
  exception/envelope conventions.
- Use `@Body()` DTOs with `ValidationPipe({ whitelist: true,
  forbidNonWhitelisted: true, transform: true })`; reject unknown fields,
  oversized text, invalid enums, invalid IDs, and missing idempotency keys.
- Enforce owner scoping from `request.principal.applicationUserId`; never trust
  `userId`, `actorId`, role, status, or publication fields from a request.
- Put each mutating post/report/decision action and its idempotency result in
  the appropriate application transaction. Exact same-owner/key/request
  retries replay a safe result; conflicting reuse returns a sanitized conflict.
- Append audit events with the existing redaction boundary. Never persist or
  log tokens, raw claims, emails, private report text, unbounded user content,
  or raw Prisma errors.
- Do not call an external moderation or AI provider. Pending review is the safe
  default until a human operator decides; any local policy used to flag content
  must be deterministic, bounded, documented, and must not silently publish.

## Verification

- `pnpm format:check`
- `pnpm planning:traceability`
- `pnpm tool:test`
- `pnpm prisma:validate`
- `pnpm --filter api exec prisma generate`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm --filter api test:e2e`
- `pnpm build`
- `pnpm e2e`
- `node scripts/story-doctor.mjs stories/ready/EP5-ST010-community-content-report-and-moderation-api.md --ready-only`
- `pnpm story:verify stories/ready/EP5-ST010-community-content-report-and-moderation-api.md`
- `git diff --check`

## References

- [Source: _bmad-output/planning-artifacts/story-map.md#Phase-5-Full-Test-Adaptive-AI-And-Community]
- [Source: docs/02_PRD.md#Functional-Requirements] (`FR-026`, `FR-029`)
- [Source: docs/03_USER_FLOWS.md#UF-013-AI-Community-And-Entitlement-Policy]
- [Source: docs/04_SYSTEM_ARCHITECTURE.md#Canonical-Ownership]
- [Source: docs/06_BACKEND_ARCHITECTURE.md#Transaction-and-Consistency-Rules]
- [Source: docs/07_DATABASE_DESIGN.md#Community-and-moderation]
- [Source: docs/08_API_CONTRACT.md#API-Standards]
- [Source: docs/11_SECURITY_PLAN.md#Abuse-and-Quota-Controls]
- [Source: stories/done/EP1-ST028-admin-editor-rbac-audit-shell.md]

## Definition of Done

The community API is authenticated, owner/role scoped, strictly validated,
paginated, idempotent, auditable, and safe by default; only human moderation
can publish content; targeted and full quality gates pass; the story is moved
through `review` to `done`, fast-forward merged into `dev`, and no change is
made to `main` or Phase 6.
