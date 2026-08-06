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

## Vocabulary Taxonomy API

The `vocabulary` module exposes public read-only topic and mindmap projections through
controller -> service -> repository boundaries. Its current local adapter returns one
immutable, reviewed fixture snapshot per request and performs no Prisma, credential,
filesystem, storage, or network work. `EP1-ST029` may replace that adapter with CMS
persistence without changing the public service contract.

The service validates the complete `domain -> topic -> subtopic` graph before any
projection, then filters out content that is not an issued, approved, published,
license-compatible public learning version. Learner mastery, review schedules, imports,
and content mutation remain outside this module.

## Supabase Authentication Boundary

`AuthModule` verifies Supabase access tokens with `jose` and remote JWKS configuration,
then resolves the verified provider subject through application repositories. JWT claims
are identity evidence only: application roles, ownership, and entitlements always come
from backend persistence. Missing configuration and missing/inactive identities fail
closed without preventing public modules from starting locally.

## Phase 1 Admin And Audit Modules

`AdminModule` exposes only the read-only `GET /api/v1/admin/overview` contract and
imports the existing `AuthModule` plus the append-only `AuditModule`. Its controller
maps the authenticated principal and correlation ID; `AdminService` owns the
role-capability policy; `AdminRepository` owns the bounded operational count query.
The `CONTENT_EDITOR`, `ADMIN`, and `SUPER_ADMIN` decisions are derived exclusively
from the persisted application principal. The module deliberately does not expose CMS
mutation, publication, role assignment, learner progress, or audit-row reads.

`CmsModule` implements the Phase 1 persisted governance boundary at
`/api/v1/cms`. Its controller is transport-only; `CmsService` owns role/action
authorization, lifecycle policy reconstruction, idempotency, safe projections, and
audit decisions; `CmsRepository` owns Prisma reads and additive writes. Taxonomy and
content mutation require a privileged application role. Review is available to
content editors, publication only to admins, and every mutation/denial is appended to
the existing redacted audit service.

`AuditService` redacts and bounds attributes before `AuditRepository` persists a
`PrivilegedAuditEvent` through `PrismaService`. The additive migration is validated and
generated locally only; no shared database migration is part of routine automation.

## TOEIC question delivery boundary

The EP2-ST003 governance boundary adds a transport-only admin surface to the
TOEIC module. Its service owns role separation, immutable import, exact-version
review binding, license/validity publication gates, safe projections, and audit
decisions; its repository owns Prisma persistence. The learner projection remains
answer- and provenance-free. Governance transitions are `DRAFT -> REVIEWED` or
`DRAFT -> REVIEWED` (or `REJECTED` for a non-publishable decision), and only an
approved `REVIEWED` version can transition to `PUBLISHED`; published versions are
never overwritten.

`ToeicController` is authenticated HTTP transport only. `ToeicQuestionService`
owns eligibility orchestration and the safe learner projection; the Prisma
repository owns fail-closed governance predicates, current-version selection,
ordering, and pagination. The repository uses an explicit safe-field select, so
`correctAnswer` and provenance, rights, review, and publication evidence cannot
cross the learner HTTP boundary.

EP2-ST004 adds the authenticated listening-practice session boundary. The service
selects only Parts 1-4 content that has passed the governance predicates, snapshots
version IDs into an owner-scoped session, accepts each question once, and submits
with a compare-and-set transition. The controller exposes safe session/question
projections; the repository is the only layer that selects `correctAnswer` for
server-side grading. No answer key, correctness flag, XP, streak, or Error Notebook
entry is returned before this story's final session projection, and ownership is
always part of session lookups. The shared TOEIC eligibility policy supplies the
governance predicate to both question delivery and practice selection; practice
answer insertion locks the active session row before writing, so an answer cannot
be inserted after a concurrent submission wins.
EP2-ST005 adds a separate authenticated reading-practice boundary for Parts 5-7.
Reading sessions snapshot exact version IDs, use owner/client idempotency, and keep
safe question projections separate from private grading projections. The shared
eligibility policy supplies the reviewed/published/licensed/free-practice predicate
for both listening and reading. ACTIVE sessions accept answers only while an
active-session lock is held, and atomically transition to SUBMITTED only when every
selected version has an answer.
