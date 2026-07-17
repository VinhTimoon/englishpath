---
id: EP1-ST008
title: Supabase Auth Profile And RBAC API
status: ready
type: backend
priority: critical
phase: phase-1-learning-core
allowed_paths:
  - apps/api/src/modules/access/**
  - apps/api/src/modules/identity/**
  - apps/api/src/modules/auth/**
  - apps/api/src/app.module.ts
  - apps/api/src/config/**
  - apps/api/test/**
  - apps/api/package.json
  - package.json
  - pnpm-lock.yaml
  - apps/api/.env.example
  - docs/06_BACKEND_ARCHITECTURE.md
  - docs/08_API_CONTRACT.md
  - docs/10_TEST_STRATEGY.md
  - docs/11_SECURITY_PLAN.md
  - stories/**
  - notes/ai-req/**
forbidden_paths:
  - apps/web/**
  - apps/api/prisma/**
  - apps/api/src/generated/**
  - .env
requires_human_approval: false
max_fix_rounds: 3
---

# Story: Supabase Auth Profile And RBAC API

## Goal

Verify Supabase JWT evidence, resolve backend application identity/roles, and expose
owner-protected profile APIs with fail-closed Nest guards and integration tests.

## Dependency

- Requires completed `EP1-ST007` identity schema and repositories.
- Uses `EP0-ST019` access contracts; token claims never grant application roles.
- `EP1-ST009` owns register/login/logout/recovery UI and Supabase browser session flows.
- Onboarding, admin mutation/audit UI, entitlement, and production credentials are out
  of scope.

## Requirements

- Add a production-capable Supabase verifier that validates algorithm, signature,
  issuer, audience, expiry/not-before, and subject using injected configuration/key
  resolution; tests use local keys and no network or credentials.
- If a vetted JWT verification dependency is missing, create a structured library
  request in `notes/ai-req` before installation and record version/license/supply-chain
  assessment; do not implement custom cryptography.
- Resolve verified provider subject through application repositories; inactive/missing
  identities fail closed and JWT email/role claims never become authorization.
- Add authentication, required-role, and owner guards plus typed request principal.
- Add `GET /api/v1/profile` and validated `PATCH /api/v1/profile` using
  controller-service-repository boundaries and sanitized error envelopes/correlation ID.
- Assign `FREE_USER` idempotently only during first application-identity provisioning;
  never accept role from request/JWT.
- Add Swagger and credential-free unit/API e2e tests for valid/expired/wrong
  issuer/audience/signature tokens, inactive/missing identity, ownership, RBAC, mass
  assignment, malformed DTOs, and secret/error redaction.

## Acceptance Criteria

- Protected profile APIs require verified Supabase evidence plus active backend identity.
- A user can read/update only their own minimal profile; role/profile mass assignment is
  rejected and editor/admin policy is backend-owned.
- Tests require no live Supabase, PostgreSQL, credentials, or network.
- No Prisma migration/generated/frontend change is introduced.
- Full checks, story verification, diff check, and Codex review pass with no P0/P1.

## Verification

- `pnpm story:checks`
- `pnpm story:verify stories/review/EP1-ST008-supabase-auth-profile-rbac-api.md`
- `git diff --check`
