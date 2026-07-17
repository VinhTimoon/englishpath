---
id: EP0-ST016
title: Architecture Data And Security V2
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
  - notes/**
  - apps/**
  - packages/**
  - scripts/**
  - .github/**
  - .env
requires_human_approval: false
max_fix_rounds: 2
---

# Story: Architecture Data And Security V2

## Goal

Create the v2 technical baseline for system boundaries, modular backend layering,
conceptual data ownership, REST conventions, security controls, and durable decisions
before schema or feature implementation.

## Dependency

- Requires `EP0-ST015R` product v2 roadmap-map recovery to be completed on `dev`;
  blocked `EP0-ST015` is historical evidence only.
- Must complete before `EP0-ST017` CI/migration/planning safety implementation.

## Requirements

- Separate current repository evidence from planned Phase 0-6 architecture.
- Define Next.js/NestJS/PostgreSQL/Supabase trust boundaries and backend ownership of
  roles, ownership, rights, roadmaps, scoring, quotas, official timers, and answers.
- Standardize controller-service-repository modules, validated DTOs, `/api/v1`,
  OpenAPI, stable errors, pagination, correlation, and idempotency.
- Define conceptual data ownership for identity/profile/role, learning tracks,
  onboarding/placement, roadmap, taxonomy/mindmap/SRS, daily learning, Error Notebook,
  TOEIC sessions/tasks/rubrics, licensed content/version/rights, library progress,
  AI usage, community/moderation, entitlement, and audit.
- Treat Google Drive as an inventory source and define checksum/version,
  license/review/publish, controlled-storage, and canonical-content boundaries.
- Define local/mock adapters for storage, Drive inventory, queue, analytics,
  monitoring, email, AI/STT/TTS, and payment boundaries.
- Prefer PostgreSQL full-text and pgvector-compatible design before specialist search,
  vector, or graph systems.
- Record security requirements for Supabase JWT verification, RBAC/ownership, uploads,
  signed/private media, redaction, rate limits, answer/timer protection, AI abuse, and
  audit.
- Keep `/admin` inside `apps/web`; do not add an admin application.
- Record owner control over production credentials/domain, paid services, destructive
  migrations, provider/budget choices, and `dev` to `main` promotion.
- Do not change Prisma, migrations, app code, CI, environment files, or production
  settings.

## Acceptance Criteria

- All seven artefacts are non-empty, concise, v2-aligned, and mutually consistent.
- Every v2 domain has an owner, relationships, lifecycle, and security boundary.
- API conventions are testable enough for later contract tests.
- Current/planned labels prevent unsupported implementation claims.
- Formatting, project checks, diff check, story verification, and read-only review
  pass without P0/P1 findings.

## Verification

- node scripts/story-doctor.mjs stories/ready/EP0-ST016-architecture-data-security-v2.md --ready-only
- pnpm prettier --check docs/04_SYSTEM_ARCHITECTURE.md docs/06_BACKEND_ARCHITECTURE.md docs/07_DATABASE_DESIGN.md docs/08_API_CONTRACT.md docs/11_SECURITY_PLAN.md docs/13_DECISION_LOG.md _bmad-output/planning-artifacts/architecture.md
- pnpm story:checks
- git diff --check
