# Architecture Governance Spine V2

## Scope

This artifact is the concise v2 planning spine for system boundaries, backend
layering, conceptual data ownership, API conventions, and security controls.

## Current Evidence

- Repository stack: Next.js, NestJS, Supabase PostgreSQL, Prisma 7, REST.
- Documented backend implementation evidence: health module and `/api/v1/health`.

## Planned Invariants

- One browser application at `apps/web`, including `/admin`.
- One backend authority for permissions, ownership, scoring, timers, answers,
  quotas, entitlements, and publication state.
- One canonical operational store in PostgreSQL.
- Google Drive is inventory-only.
- Controlled storage serves learner-facing assets after review and publication.
- External providers remain behind replaceable adapters.
- `/api/v1` is the only public API base.
- DTO validation, stable errors, pagination, correlation IDs, OpenAPI, and
  idempotency are baseline requirements.
- PostgreSQL full-text and pgvector-compatible design precede specialist search or
  graph systems.
- Security events are auditable, redacted, and append-oriented.

## Domain Ownership Spine

- Access: identity, profile, roles, entitlements
- Learning: tracks, onboarding, placement, roadmap, daily learning, Error Notebook
- Knowledge: taxonomy, mindmap, spaced repetition
- Assessment: TOEIC sessions, tasks, rubrics, submissions, scores, suspicious
  events
- Content: inventory, rights, review, publish state, media delivery
- AI: gateway, prompt versions, provider usage, cost, quota
- Community: posts, reports, moderation outcomes
- Audit: actor, target, policy result, correlation trail

## Owner-Controlled Boundaries

- Production credentials and domains
- Paid providers and budgets
- Destructive migrations
- `dev` to `main` promotion
