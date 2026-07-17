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
