---
id: EP1-ST028
title: Admin Editor RBAC Privileged Audit And Guarded Shell
status: blocked
type: fullstack
priority: high
phase: phase-1-learning-core
risk: high
delivery_mode: full-review
depends_on:
  - EP1-ST008
allowed_paths:
  - apps/api/prisma/schema.prisma
  - apps/api/prisma/migrations/**
  - apps/api/src/generated/**
  - apps/api/src/modules/admin/**
  - apps/api/src/modules/audit/**
  - apps/api/src/modules/auth/**
  - apps/api/src/modules/identity/**
  - apps/api/src/app.module.ts
  - apps/api/src/main.ts
  - apps/api/test/**
  - apps/web/src/app/admin/**
  - apps/web/src/features/admin/**
  - apps/web/src/widgets/admin/**
  - apps/web/src/shared/api/**
  - apps/web/test/**
  - apps/web/tests/**
  - tests/e2e/**
  - docs/06_BACKEND_ARCHITECTURE.md
  - docs/07_DATABASE_DESIGN.md
  - docs/08_API_CONTRACT.md
  - docs/10_TEST_STRATEGY.md
  - docs/11_SECURITY_PLAN.md
  - stories/ready/EP1-ST028-admin-editor-rbac-audit-shell.md
  - stories/in-progress/EP1-ST028-admin-editor-rbac-audit-shell.md
  - stories/review/EP1-ST028-admin-editor-rbac-audit-shell.md
  - stories/done/EP1-ST028-admin-editor-rbac-audit-shell.md
  - stories/blocked/EP1-ST028-admin-editor-rbac-audit-shell.md
  - _bmad-output/planning-artifacts/story-map.md
  - _bmad-output/implementation-artifacts/sprint-status.yaml
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
  - apps/api/src/modules/content-governance/**
  - apps/api/src/modules/vocabulary/**
  - public learner routes outside `/admin`
requires_human_approval: false
max_fix_rounds: 2
---

# Story: Admin Editor RBAC, Privileged Audit, And Guarded Shell

## Goal

Establish the Phase 1 privileged boundary so authorized editors and admins can reach
a truthful `/admin` shell and guarded operational capabilities, while every privileged
decision is backend-owned, auditable, and safe to extend with the CMS story.

## Dependency And Product Boundary

- Requires completed `EP1-ST008` Supabase verification, application-principal
  resolution, role guards, and identity repositories.
- Uses the canonical persisted roles `CONTENT_EDITOR`, `ADMIN`, and `SUPER_ADMIN`.
- `FREE_USER`, JWT claims, email, client booleans, and UI state must never grant
  privileged access.
- `EP1-ST029` owns CMS taxonomy/content mutation and publication APIs; this story
  creates only the guarded admin/audit foundation and must not implement CMS behavior.
- `/admin` remains inside `apps/web`; no separate admin application is introduced.

## Functional Requirements

1. Add a backend `admin` module with controller → service → repository boundaries and
   explicit OpenAPI/auth/error contracts.
2. Protect privileged routes with the existing authentication and role guards. Define
   the minimum capability policy explicitly: `CONTENT_EDITOR` may read the editor
   shell/approved read summaries, `ADMIN` may access operational summaries, and
   `SUPER_ADMIN` may perform role-assignment actions if that action is included.
3. Add one minimal read-only admin overview contract that returns only safe operational
   state needed by the shell; it must not expose secrets, provider payloads, private
   source locations, learner progress, or raw database errors.
4. Add an append-oriented audit boundary for privileged actions. If persistence is
   required, use an additive Prisma model/migration with actor, action, target,
   policy result, correlation ID, timestamp, and redacted bounded attributes. Never
   store tokens, passwords, raw claims, private answers, or provider payloads.
5. If role assignment is implemented in this slice, allow only a backend-validated
   `SUPER_ADMIN` action, enforce canonical role codes and active identities, make the
   write idempotent, and emit an audit event in the same application transaction.
6. Add `/admin` with explicit loading, unauthorized, forbidden, error, and success
   states. The UI must never hide an authorization failure as an empty state and must
   not claim CMS functionality that belongs to `EP1-ST029`.
7. Add deterministic credential-free unit/API/browser tests for authentication,
   role separation, ownership/actor checks, redaction, audit emission, malformed
   inputs, replay/concurrency where writes exist, and 360px accessibility behavior.

## Security And Data Invariants

- Backend application roles are the sole authorization authority; external JWT role
  claims and client-provided role fields are ignored or rejected.
- Privileged reads and writes fail closed for missing, invalid, inactive, suspended,
  or unauthorized principals.
- Audit records are append-oriented and correlation-linked; analytics is not an audit
  substitute. Redaction happens before persistence or adapter delivery.
- All mutating DTOs are strict and bounded. Retry-prone privileged writes use the
  existing idempotency convention or an equivalent unique request key.
- Any Prisma change is additive, has rollback notes in `docs/07_DATABASE_DESIGN.md`,
  is validated/generated locally, and is never applied to shared or production data.

## Implementation Boundaries

- Keep controllers thin and keep policy/transactions in services.
- Use `PrismaService`; never instantiate `PrismaClient` in feature code.
- Reuse existing auth guards, principal types, identity role catalog, correlation and
  redaction contracts before creating new abstractions.
- Keep route files thin and put admin UI orchestration in FSD feature/widget layers.
- Follow the EnglishPath token system and provide keyboard access, visible focus,
  mobile-first layout, and loading/empty/error/success states.
- Do not add dependencies, provider credentials, production configuration, CMS APIs,
  vocabulary behavior, or changes to `main`.

## Acceptance Criteria

- A valid authenticated editor/admin reaches only the capability allowed by its
  backend-resolved application role; a free learner, forged JWT-role claim, missing
  token, inactive identity, and unknown role are denied with sanitized errors.
- The admin overview and `/admin` shell expose only approved operational information,
  show clear authorization/error/loading/success states, and do not imply CMS or
  publication behavior before `EP1-ST029`.
- Every privileged mutation included in this story is strict, idempotent where
  retry-prone, transaction-safe, and accompanied by one redacted append-only audit
  event; no secrets or raw claims appear in responses, logs, or audit records.
- API responses use `/api/v1`, validated DTOs, stable error envelopes, correlation
  metadata, and OpenAPI declarations; controllers contain no business logic.
- Any persistence change is additive with rollback notes, Prisma validation/generation
  passes without a database connection, and no migration is run against shared data.
- Unit, API e2e, targeted browser/accessibility, full repository checks, story
  verification, and independent read-only review pass with no P0/P1 findings.
- Changed files remain within `allowed_paths`; no dependency, environment,
  production-credential, public-learner, vocabulary, CMS, or `main` changes occur.

## Verification Commands

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
- `node scripts/story-doctor.mjs stories/ready/EP1-ST028-admin-editor-rbac-audit-shell.md --ready-only`
- `pnpm story:verify stories/ready/EP1-ST028-admin-editor-rbac-audit-shell.md`
- `git diff --check`

## Review Classification

- `risk: high`, `delivery_mode: full-review`.
- Full review is mandatory because this story changes authorization, privileged
  operations, audit/data protection, and potentially Prisma persistence.
- Do not merge or promote until all security, ownership, redaction, migration, browser,
  and full quality gates have terminal evidence.

## Blocked Report

- Failed step: loop preflight before branch creation.
- Root cause: local `dev` is clean but ahead of `origin/dev` by commits `f4678c3` and
  `9d9d22b`; the harness requires exact upstream synchronization.
- No feature implementation was started for this story.
- AI request: `notes/ai-req/2026-08-04-EP1-ST028-dev-upstream-sync.md`.
