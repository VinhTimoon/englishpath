# Backend Architecture V2

## Current Repository Evidence

- Documented module evidence currently covers the health module at
  `GET /api/v1/health`.
- Existing backend guidance already requires controller -> service -> repository
  layering, DTO validation, guards for protected endpoints, and pagination for
  list endpoints.

## Planned Phase 0-6 Backend Shape

### Module Pattern

Each domain module follows the same boundary:

- Controller
  - Exposes `/api/v1` routes.
  - Binds DTO validation.
  - Maps authenticated principal, correlation ID, and idempotency key into the
    application layer.
  - Never contains business rules.
- Service
  - Enforces business rules, ownership checks, role checks, quota checks, official
    timer rules, scoring rules, and publication rules.
  - Coordinates transactions and cross-repository workflows.
- Repository
  - Encapsulates persistence via `PrismaService`.
  - Returns domain-oriented records or projections only.
  - Does not enforce HTTP concerns.
- Adapter
  - Wraps external systems including storage, Drive inventory, queue, analytics,
    monitoring, email, AI, STT, TTS, and payment.
  - Must be replaceable with local or mock implementations.

### Core Cross-Cutting Rules

- All write endpoints require validated DTOs.
- Protected endpoints require JWT verification plus policy checks.
- Admin actions stay inside `apps/web` UI but call dedicated admin-capable backend
  endpoints guarded by admin role and audit capture.
- Controllers emit OpenAPI metadata for request, response, auth, pagination, and
  error contracts.
- Sensitive fields are excluded from outward DTOs.
- Correlation ID is accepted or generated at the edge and propagated through logs,
  jobs, adapter calls, and audit events.
- Idempotency is required for retry-prone write flows such as submissions,
  payments, publication actions, and provider callbacks.

### Identity Boundary

Protected request processing has two independent stages. First, an external identity
verifier validates provider evidence and returns only provider, subject, issuer,
audience, and optional verified email. Second, an application resolver loads the
EnglishPath principal, roles, ownerships, and entitlements from backend application
data. External JWT claims never satisfy role or ownership policy directly.

The contracts under `modules/access` remain independent from NestJS and Prisma.
`EP1-ST008` owns the production Supabase signature, expiry, issuer, audience, and
subject verifier plus guard wiring. The local fixture verifier is test-only and must
not be registered by an application runtime module.

### Planned Domain Modules

- Identity and access
- Learning tracks and onboarding
- Roadmap and progress
- Taxonomy, mindmap, and spaced repetition
- Daily learning and Error Notebook
- TOEIC sessions, tasks, scoring, rubrics, and suspicious-event capture
- Licensed content inventory, review, publication, and controlled delivery
- Library and media progress
- AI gateway, usage, and quota enforcement
- Community and moderation
- Entitlement and payment integration
- Audit and operational controls

### Transaction and Consistency Rules

- Service layer owns transaction boundaries.
- Repository calls participating in one business action must execute inside the
  same application-level transaction where required.
- External side effects are invoked after durable local state is recorded or via
  queued orchestration with replay-safe identifiers.
- Score, timer, answer-protection, quota, and entitlement decisions are always
  based on backend state, never frontend claims.

### Adapter Boundary

| Capability      | Adapter Role                         | Local/Mock Expectation           |
| --------------- | ------------------------------------ | -------------------------------- |
| Storage         | Manage private and published objects | Filesystem or local object store |
| Drive inventory | Read source file metadata only       | Fixture-driven inventory adapter |
| Queue           | Async job dispatch                   | In-process or test queue         |
| Analytics       | Event forwarding                     | No-op or local log adapter       |
| Monitoring      | Metrics and alert export             | Local collector or no-op         |
| Email           | Transactional notices                | Mail sandbox or log sink         |
| AI/STT/TTS      | Model invocation through AI gateway  | Stubbed provider responses       |
| Payment         | Entitlement-triggering transactions  | Sandbox gateway or fake adapter  |

## Health Module

- Route: `GET /api/v1/health`
- Purpose: API and database reachability probe
- Role in v2 baseline: minimal evidence of the `/api/v1` convention only, not
  proof that the wider module set is implemented

## Content Governance Contract Foundation

The framework-independent `content-governance` contract owns shared taxonomy and
publication policy for later vocabulary, daily learning, roadmap, Error Notebook,
TOEIC, library, and CMS modules. Feature modules reference this taxonomy rather than
creating incompatible level/topic/skill/track trees.

The current foundation validates and freezes metadata in memory only. `EP1-ST029`
owns Prisma persistence, repositories, services, guarded CMS endpoints, and audit
integration. No current route or runtime module is implied by these contracts.

Review and publish transitions consume a policy-issued authorization decision rather
than caller-provided booleans. The access boundary must resolve an authenticated human
actor and the exact `content:review` or `content:publish` permission before issuing a
decision bound to that actor and action; automated actors and forged decisions fail
closed.

## Drive Inventory Contract Foundation

The framework-independent `drive-inventory` port returns immutable metadata manifests
only. Its local adapter receives explicit in-memory fixtures and performs no credential,
environment, filesystem, database, storage, or network access. It exposes no byte,
download, delivery, rights, review, or publish operation and is not registered in the
Nest runtime graph by this foundation story.

## Observability Contract Foundation

The framework-independent `observability` module owns validated correlation contexts,
structured log events, metric measurements, analytics events, and provider-neutral
ports. Domain code emits bounded scalar attributes only. Central redaction removes
sensitive keys before local, no-op, or future provider adapters receive an event.

Phase 0 supplies deterministic in-memory collectors and no-op adapters only. It adds no
middleware or Nest registration. `EP1-ST038` owns PostHog/Sentry delivery, buffering,
retry behavior, dashboards, alert thresholds, credentials, and production wiring.

## Persisted Application Identity

The `identity` module owns persisted users, minimal profiles, application roles, and
ownership-aware repository adapters. A `(provider, externalSubject)` pair resolves one
application user; email remains contact data and is never an ownership key. Existing
baseline users may temporarily have a null external subject until a later verified
linking flow migrates them. Repository reads fail closed for inactive users and sanitize
unexpected persistence errors.

`GUEST` is request state and is not persisted. Role assignments come only from the
application role catalog and are written transactionally with optional assigning-actor
metadata. `EP1-ST008` owns Supabase verification, default learner-role assignment,
guards, APIs, and runtime registration.
