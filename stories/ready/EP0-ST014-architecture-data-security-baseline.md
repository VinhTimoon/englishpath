---
id: EP0-ST014
title: Architecture Data And Security Baseline
status: ready
type: planning
priority: critical
phase: phase-0-foundation
allowed_paths:
  - docs/04_SYSTEM_ARCHITECTURE.md
  - docs/06_BACKEND_ARCHITECTURE.md
  - docs/07_DATABASE_DESIGN.md
  - docs/08_API_CONTRACT.md
  - docs/11_SECURITY_PLAN.md
  - docs/13_DECISION_LOG.md
  - _bmad-output/planning-artifacts/architecture.md
  - stories/**
forbidden_paths:
  - apps/**
  - packages/**
  - scripts/**
  - .github/**
  - .env
  - notes/englishpath_product_spec.md
  - notes/ENGLISHPATH_AGENT_WORKFLOW.md
requires_human_approval: false
max_fix_rounds: 2
---

# Story: Architecture Data And Security Baseline

## Goal

Create a concise technical baseline for Phase 0B through Phase 6 so product stories
share explicit system boundaries, API conventions, conceptual data ownership,
security controls, and durable architectural decisions before schema or feature work.

## Source Of Truth

- `notes/englishpath_product_spec.md` defines product and security intent.
- `docs/01_PRODUCT_SCOPE.md`, `docs/02_PRD.md`, and `docs/03_USER_FLOWS.md` define
  the approved planning baseline from `EP0-ST013`.
- Existing application code defines current implementation evidence. The architecture
  documents must distinguish current capabilities from planned target capabilities.

## Architecture Requirements

- Describe the current monorepo and the target modular-monolith topology for Next.js,
  NestJS, PostgreSQL/Supabase, storage, queues, analytics, monitoring, email, and AI.
- Define frontend-to-backend trust boundaries and require all privileged business
  decisions, role checks, ownership checks, quotas, scoring, and answer validation to
  remain backend-owned.
- Standardize NestJS module layers as controller to service to repository, with DTOs
  and external providers behind adapter interfaces. Controllers remain thin and
  repositories own persistence access.
- Define local/mock adapters for storage, analytics, monitoring, email, and AI so
  automated tests require no production credentials or paid services.
- Keep CMS MVP under `/admin` in `apps/web`; do not introduce `apps/admin`.
- Prefer PostgreSQL full-text and pgvector before Meilisearch, Qdrant, or Neo4j.

## API Contract Requirements

- Keep REST prefix `/api/v1` and document versioning rules.
- Define DTO validation, Swagger/OpenAPI ownership, stable success/error envelopes,
  pagination metadata, request correlation IDs, and idempotency expectations.
- Record representative auth, validation, forbidden, not-found, conflict, rate-limit,
  and internal error semantics without claiming those mechanisms are implemented.
- Preserve the existing health endpoint contract and label broader conventions as
  planned until implementation stories deliver them.

## Data Requirements

- Define conceptual ownership and relationships for User, Profile, Role, Onboarding,
  Placement, Roadmap, Vocabulary/SRS, QuizAttempt, DailySentence, Progress,
  ContentLicense, and AuditLog.
- Include content lifecycle fields for source, `licenseStatus`, and `reviewStatus`;
  AI-assisted content is draft-only until human approval.
- Document identifier, timestamp, soft-delete, indexing, transaction, retention, and
  migration principles without changing Prisma or creating a migration.
- Keep Supabase Auth identity separate from application profile/role data and define
  how the verified auth subject maps to owned application records.

## Security Requirements

- Define Supabase JWT verification at the backend, ownership checks, learner/editor/
  admin RBAC, least privilege, and audit requirements for privileged mutations.
- Cover secret handling, CORS, security headers, validation, rate limits, uploads,
  signed/private files, content licensing, logging redaction, and dependency risk.
- Require quiz and TOEIC answer keys and server timers to remain server-side until a
  validated submission is finalized; suspicious events are auditable.
- Require all AI calls through a provider-neutral backend gateway with quotas, cost
  logs, prompt versions, output schemas, abuse controls, and approved providers.
- Mark production credentials, paid services, destructive migrations, and promotion
  from `dev` to `main` as owner-controlled decisions.

## Decision Log Requirements

- Record dated decision IDs, status, context, decision, consequences, and revisit
  triggers for the approved architecture defaults.
- Include Supabase Auth/PostgreSQL, modular monolith, N-layer backend, local-first
  adapters, CMS placement, pgvector-first retrieval, human-reviewed AI drafts,
  dev-only automation, and local ports FE `5173`/BE `3000`.
- Do not invent a production domain, provider credentials, or paid-service budget.

## Acceptance Criteria

- All seven architecture artifacts are non-empty, mutually consistent, and concise.
- Current implementation and planned target state are explicitly distinguishable.
- Every core domain has a documented owner, key relationships, and security boundary.
- API error, pagination, validation, versioning, and idempotency conventions are
  testable enough for later implementation stories.
- No application, Prisma schema, migration, CI, environment, or production setting is
  changed.
- Project checks, formatting, diff check, story verification, and read-only Codex
  review pass without P0/P1 findings.

## Verification

- node scripts/story-doctor.mjs stories/ready/EP0-ST014-architecture-data-security-baseline.md --ready-only
- pnpm prettier --check docs/04_SYSTEM_ARCHITECTURE.md docs/06_BACKEND_ARCHITECTURE.md docs/07_DATABASE_DESIGN.md docs/08_API_CONTRACT.md docs/11_SECURITY_PLAN.md docs/13_DECISION_LOG.md _bmad-output/planning-artifacts/architecture.md
- pnpm story:checks
- git diff --check
