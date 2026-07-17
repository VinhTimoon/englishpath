---
id: EP0-ST019
title: Auth JWT And Application Identity Foundation Contracts
status: ready
type: backend
priority: critical
phase: phase-0-foundation
allowed_paths:
  - apps/api/src/modules/access/**
  - docs/06_BACKEND_ARCHITECTURE.md
  - docs/08_API_CONTRACT.md
  - docs/11_SECURITY_PLAN.md
  - stories/**
forbidden_paths:
  - notes/**
  - apps/web/**
  - apps/api/prisma/**
  - apps/api/src/app.module.ts
  - apps/api/src/generated/**
  - .env
requires_human_approval: false
max_fix_rounds: 3
---

# Story: Auth JWT And Application Identity Foundation Contracts

## Goal

Define the fail-closed boundary between a Supabase-authenticated external identity and
EnglishPath application authorization, with a credential-free local adapter for unit
tests and later auth stories.

## Dependency

- Requires completed `EP0-ST018` browser E2E foundation on `dev`.
- Must complete before `EP0-ST020` shared taxonomy and rights foundation begins.
- `EP1-ST007` owns persisted User/Profile/Role schema and repositories.
- `EP1-ST008` owns the production Supabase verifier, guards, protected APIs, ownership,
  and RBAC integration tests.

## Business Rules

- A verified external subject identifies a caller but never grants an application role,
  ownership right, admin capability, or entitlement by itself.
- The production verifier must eventually validate signature, expiry, issuer, audience,
  and subject; contracts fail closed when identity evidence is missing or invalid.
- Bearer tokens, secrets, raw JWT claims, and provider errors must not appear in outward
  errors or logs.
- The local adapter accepts only explicit in-memory fixtures supplied by a test and is
  never registered in the application runtime module.
- No real Supabase credential, network call, database access, schema migration, or auth
  endpoint is part of this foundation story.

## BE Requirements

- Add framework-independent access contracts for bearer credential extraction,
  external identity verification, application principal resolution, and authorization
  policy checks.
- Represent external identity with a stable provider, subject, issuer, audience, and
  optional verified email; exclude role, ownership, entitlement, and admin claims.
- Define typed fail-closed error codes for missing/malformed bearer credentials,
  invalid identity evidence, unresolved application identity, forbidden role, and
  forbidden ownership.
- Add a deterministic local token verifier backed by explicit fixtures, including
  success, unknown token, malformed token, expiry, issuer, and audience behavior.
- Add unit tests for happy paths, boundary/failure paths, redacted errors, case-insensitive
  Bearer scheme parsing, rejection of ambiguous/multiple credentials, and proof that
  token claims cannot supply application authorization.
- Keep contracts independent from Nest controllers/guards and Prisma so later adapters
  can implement them without changing domain semantics.

## Documentation Requirements

- Document the two-stage identity flow: verify external identity, then resolve roles and
  ownership from application data.
- Document which checks belong to the Phase 1 production Supabase adapter and state that
  the local fixture adapter cannot be wired into runtime.
- Preserve `/api/v1`, backend-owned authorization, and sanitized error conventions.

## Acceptance Criteria

- Unit tests run without `.env`, Supabase, PostgreSQL, Redis, or network access.
- Missing, malformed, duplicated, expired, wrong-issuer, wrong-audience, and unknown
  credentials fail closed with stable sanitized codes and no token value in errors.
- A valid fixture yields only external identity fields; no role, ownership, entitlement,
  or admin authority can be derived from token data.
- Application principal and authorization policy ports require backend application data
  before protected decisions can be made.
- No runtime module, route, schema, migration, generated source, or frontend file changes.
- Full repository checks, diff check, story verification, and read-only Codex review pass
  with no P0/P1 findings.

## Verification

- `pnpm format:check`
- `pnpm planning:traceability`
- `pnpm tool:test`
- `pnpm prisma:validate`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm --filter api test:e2e`
- `pnpm build`
- `pnpm e2e`
- `pnpm story:verify stories/review/EP0-ST019-auth-identity-foundation-contracts.md`
- `git diff --check`
