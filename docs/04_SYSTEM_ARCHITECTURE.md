# System Architecture V2

## Purpose

This document defines the Phase 0-6 technical baseline for EnglishPath before
schema, feature, or infrastructure implementation. It separates current
repository evidence from planned architecture.

## Current Repository Evidence

- Current stack: Next.js frontend, NestJS backend, Supabase PostgreSQL, Prisma 7,
  REST API, BMAD planning artifacts, and Codex delivery loop.
- Current documented backend evidence is limited to the health module and
  `/api/v1/health`.
- `/admin` remains part of `apps/web`; no separate admin application is planned.

## Planned Phase 0-6 Architecture

### System Context

- `apps/web` is the only browser-facing application for learners, moderators, and
  admins.
- NestJS backend is the system-of-record authority for roles, ownership, rights,
  roadmaps, scores, quotas, official timers, submissions, and correct answers.
- Supabase Auth issues identities; backend verifies JWTs and resolves
  authorization from application roles and resource ownership.
- PostgreSQL is the canonical operational data store.
- Controlled object storage holds private and published media after backend review
  and publication workflows.
- External providers remain replaceable through adapters for inventory, storage,
  queue, analytics, monitoring, email, AI, STT, TTS, and payment.

### Trust Boundaries

1. Browser boundary
   - Browser receives only authorized views, never raw answer keys, scoring rules,
     or owner-only operational secrets.
2. Frontend to backend boundary
   - All business actions go through `/api/v1`.
   - Frontend is untrusted for permissions, timers, quotas, and scoring claims.
3. Auth boundary
   - Supabase provides identity proof.
   - Backend decides application role, entitlement, ownership, and policy outcome.
4. Data boundary
   - PostgreSQL stores canonical records.
   - Storage objects and provider payloads are non-canonical until backend links
     them to controlled records.
5. Provider boundary
   - Google Drive is inventory-only.
   - AI, STT, TTS, email, analytics, monitoring, queue, and payment providers are
     implementation details behind backend adapters.

### Canonical Ownership

- Identity, profile, role, entitlement, roadmap, learning progress, licensed
  content metadata, TOEIC sessions, scoring outputs, quotas, and audit events are
  backend-owned records.
- Correct answers, official timers, suspicious events, and moderation decisions are
  server authoritative.
- Google Drive file state is reference metadata, not canonical publication state.

### External Content Boundary

- Source files may originate in Google Drive for inventory and ingest.
- Backend records source identity, checksum, version, classification, rights,
  review status, publish status, and storage linkage.
- Production delivery uses controlled storage and backend-issued access rules.

### Search and Retrieval Direction

- Default search baseline is PostgreSQL full-text capabilities.
- Similarity and semantic retrieval must remain pgvector-compatible inside
  PostgreSQL before any specialist vector or graph system is introduced.

### Environment Strategy

- Local and test environments may use mock or local adapters for storage, Drive
  inventory, queue, analytics, monitoring, email, AI, STT, TTS, and payment.

### Drive Inventory Boundary

The content path is `Drive source inventory -> governed canonical content ->
controlled storage -> authorized learner delivery`. Inventory contains operational
metadata only and grants no rights, classification, review, import, or publication
authority. Runtime learning features never query a live Drive listing or depend on a
public Drive URL.

`EP3-ST002` owns real Google credentials, API scanning, metadata extraction, checksum
calculation, and change detection. Later Phase 3 stories own download, segmentation,
controlled storage, CMS import, and publication.

- Production provider selection and paid-service activation remain owner-only
  decisions.

## Authority Matrix

| Concern                            | Authority                         |
| ---------------------------------- | --------------------------------- |
| Authentication identity            | Supabase Auth token issuer        |
| Role and permissions               | NestJS backend                    |
| Resource ownership                 | NestJS backend                    |
| Learning roadmap and sequencing    | NestJS backend                    |
| Score calculation and persistence  | NestJS backend                    |
| Usage quotas and entitlements      | NestJS backend                    |
| Official test timer                | NestJS backend                    |
| Correct answers and rubrics        | NestJS backend                    |
| Media publication state            | NestJS backend                    |
| Production credentials and domains | Human owner                       |
| Destructive migrations             | Human owner approval              |
| Provider and budget choices        | Human owner                       |
| `dev` to `main` promotion          | Human-controlled release decision |

## Out of Scope for This Story

- Prisma schema design
- Database migrations
- Application code
- CI changes
- Environment or production configuration

## EP4-ST007 provider-neutral gateway

Feedback requests enter through the authenticated API gateway, then pass the
server-owned contract, UTC-day quota, deterministic local adapter, and
owner-scoped usage repository. The gateway returns only bounded advisory
feedback. Adapter/provider metadata and zero-cost evidence remain internal;
the local adapter makes no network or paid-provider call.

`EP4-ST009` reuses that gateway for finalized Writing sessions only. The TOEIC
module loads the submission through the owner-scoped repository and passes the
server-owned task ID and private response text to the gateway; only the gateway
safe advisory projection returns to the learner. No feedback persistence model,
queue, provider credential, or official score is introduced by this boundary.
