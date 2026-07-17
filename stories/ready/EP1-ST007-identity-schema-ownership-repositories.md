---
id: EP1-ST007
title: Identity Schema And Ownership Repositories
status: ready
type: backend
priority: critical
phase: phase-1-learning-core
allowed_paths:
  - apps/api/prisma/schema.prisma
  - apps/api/prisma/migrations/**
  - apps/api/src/generated/prisma/**
  - apps/api/src/modules/identity/**
  - docs/06_BACKEND_ARCHITECTURE.md
  - docs/07_DATABASE_DESIGN.md
  - docs/10_TEST_STRATEGY.md
  - docs/11_SECURITY_PLAN.md
  - stories/**
forbidden_paths:
  - notes/**
  - apps/web/**
  - apps/api/src/app.module.ts
  - apps/api/src/modules/access/**
  - apps/api/src/modules/health/**
  - apps/api/src/main.ts
  - .env
requires_human_approval: false
max_fix_rounds: 3
---

# Story: Identity Schema And Ownership Repositories

## Goal

Add the persisted EnglishPath application identity, profile, and role model plus
framework-independent ownership-aware repository contracts and Prisma adapters, so a
later Supabase guard can resolve verified external subjects without trusting token roles.

## Dependency

- Requires completed `EP0-ST019` auth and application identity foundation contracts.
- Can proceed independently of `EP1-ST005` because it changes only backend/database
  paths.
- `EP1-ST008` owns production Supabase JWT verification, runtime registration, guards,
  protected auth/profile APIs, default role assignment, and RBAC integration tests.
- `EP1-ST010` and later stories own onboarding goals, placement, roadmap, learning
  progress, entitlement, and preference persistence.

## Business Rules

- A provider and external subject map to exactly one application user; email is contact
  data and never the ownership key.
- External JWT claims do not assign roles. Roles and ownership are resolved only from
  application data after provider evidence has been verified.
- Persisted roles cover `FREE_USER`, `PREMIUM_USER`, `CONTENT_EDITOR`, `ADMIN`, and
  `SUPER_ADMIN`; `GUEST` is anonymous request state and is not persisted as a user role.
- User status is explicit and fail-closed for inactive, suspended, or retained/deleted
  records. This story does not implement deletion policy or expose sensitive records.
- Profile data is minimal: display name, avatar URL, locale, and timezone. Learning goal,
  target score, daily minutes, and skill preferences belong to onboarding stories.
- A user may have multiple roles, role assignments are unique, and assignment metadata
  supports later audit integration without treating analytics as audit evidence.
- The migration must be additive/non-destructive relative to the current baseline and
  include rollback notes; it must not be applied to a remote or production database.

## BE Requirements

- Replace the placeholder user model with explicit application user, profile, role, and
  user-role assignment models using database-safe enums, timestamps, unique provider
  identity constraints, required indexes, and one-to-one profile integrity.
- Preserve a stable application user ID independent from the Supabase subject and avoid
  storing raw JWTs, passwords, refresh tokens, provider payloads, or token-derived roles.
- Define domain models and sanitized typed errors for not found, duplicate identity,
  inactive identity, forbidden ownership, and invalid profile/role input.
- Define repository ports for external-identity resolution, user/profile persistence,
  role lookup/assignment, and explicit ownership checks; all caller-owned reads/writes
  require the application user ID rather than email or external claims.
- Implement Prisma adapters through the injected Prisma client/service contract without
  creating a client directly or registering a Nest runtime module in this story.
- Add unit tests with credential-free mocked Prisma delegates for successful mapping,
  missing/inactive users, profile ownership isolation, duplicate provider identity,
  unique role assignment, role separation from token data, sanitized failures, and
  transaction behavior where atomicity is required.
- Add migration/schema tests or validation evidence for unique provider+subject,
  one-profile-per-user, role-assignment uniqueness, foreign keys, indexes, and
  non-destructive rollback notes; regenerate the checked-in Prisma client.

## Acceptance Criteria

- Prisma validation and generation succeed without connecting to a database; repository
  unit tests require no Supabase, PostgreSQL, credentials, or network.
- The schema enforces one application identity per provider subject, one profile per
  user, unique role codes, and unique user-role assignments.
- Repositories cannot read or mutate another user's profile when given a different owner
  ID, and no role can be inferred from email or external JWT claims.
- Errors are stable and sanitized; no email, subject, profile value, token, or provider
  payload appears in outward error messages.
- The migration is additive/non-destructive, includes explicit rollback notes, and is not
  run against remote infrastructure.
- No route, guard, API DTO, app-module registration, frontend, environment, onboarding,
  entitlement, or production Supabase integration is introduced.
- Database design/security/testing documentation, full repository checks, diff check,
  story verification, and read-only Codex review pass with no P0/P1 findings.

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
- `pnpm story:verify stories/review/EP1-ST007-identity-schema-ownership-repositories.md`
- `git diff --check`
