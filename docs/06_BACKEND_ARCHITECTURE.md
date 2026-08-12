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

EP2-ST007 adds an isolated server-timed mock-test boundary at
`/api/v1/toeic/tests`. The service owns the immutable v1 MINI/HALF policy,
server deadline, answer secrecy, expiry, and compare-and-set finalization;
the repository owns timed-test persistence and private grading projections.
At start, governance selects the versions; thereafter the persisted version IDs
are the authoritative session snapshot, so a later catalogue refresh cannot
invalidate an active test. A missing snapshot row fails closed.
Answer writes separately re-check the live governance boundary before grading;
a missing or no-longer-eligible row fails closed.

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
EP2-ST006 adds the authenticated practice catalogue and filter snapshots. The
catalogue is generated from the shared governance predicate, returned through an
explicit safe projection, and limited to values present in currently eligible
content. Listening and reading persist filters in separate session tables; replay
compares the complete selected shape before returning an immutable snapshot.

EP2-ST009 adds analysis as a read-only projection inside the timed-test TOEIC
service. The repository reads the owner-bound finalized session and immutable
question snapshot with explicit private selects; the service maps Parts 1-4 to
LISTENING and Parts 5-7 to READING, then returns only aggregates. Controllers
remain transport-only and never receive client score, elapsed-time, Part, or
weakness inputs.

EP2-ST010 keeps Error Notebook persistence in the practice module while exposing
an internal capture port to the TOEIC service. Finalization/result/analysis reads
pass only server-derived incorrect answers and private question explanations to
the owner-scoped practice repository. The repository verifies a finalized session
belongs to that owner, upserts the TOEIC source/reference pair idempotently, and
returns a bounded page for notebook reads. Capture failure does not hide a valid
timed result; a later finalized read retries reconciliation.

EP2-ST011 keeps pack selection as a read-time service policy over the finalized
analysis. Vocabulary eligibility is delegated to the exported `VocabularyService`
and its published taxonomy predicate; grammar links come from a reviewed
internal allowlist; practice links require a current TOEIC catalogue Part.
Pack lookup is bounded and failure-isolated, so no content lookup can invalidate
an owner-scoped finalized score or analysis.

## EP3-ST005 learner catalogue boundary

The learner library catalogue is a provider-neutral read service over an
injectable catalogue port. The service applies the server-owned library access
predicate before facets, search, filtering, ordering, pagination, or response
projection. The current local adapter is intentionally credential-free and
fixture-compatible; it does not read Drive/Supabase, persist data, or grant
controlled media access. Controllers validate transport input and return the
standard envelope; policy and redaction remain in the service layer.

## EP3-ST006 controlled media boundary

Item access reuses the EP3-ST005 eligibility predicate and resolves storage
through a narrow injectable controlled-media port. The local adapter is
credential-free and reports state only. The service validates transcript
timestamps/count/text bounds, orders segments deterministically, and constructs
the learner projection field-by-field. Provider locators are internal adapter
data and never become HTTP response fields.

## Four Skills balance boundary

The roadmap balance policy is a pure deterministic engine input/output. Version orchestration remains in the roadmap service/repository; controllers do not allocate activities. No schema, provider, submission, recording, or AI gateway state is created by balancing.

## EP4-ST007 gateway layering

The ai-gateway module keeps controller, service/policy, adapter, and Prisma
repository boundaries separate. The controller never invokes an adapter
directly. Idempotency fingerprints, quota decisions, redaction, and output
validation are server-owned in the service; usage evidence is additive and
owner-scoped.

## EP4-ST003 recording storage layering

The TOEIC recording service owns MIME/size/duration/lifecycle validation and
playback-capability policy. The recording repository owns Prisma access and
always requires the authenticated application user ID. The injectable storage
port owns controlled object references; the local implementation reports
availability without credentials or raw bytes. Controllers expose only safe
recording projections and never construct provider URLs.

## EP5-ST001 full-mock assembly boundary

The Phase 5 full-mock foundation is an internal, pure TOEIC policy/assembly
boundary. It freezes a versioned 200-question blueprint (Parts 1-7 quotas
6/25/39/30/30/16/54, 120 minutes) and consumes only an already-governed private
question catalogue. It deduplicates to one newest version per canonical question,
allocates every Part quota deterministically, and returns an immutable version-ID
snapshot or an explicit insufficient-catalogue result. It introduces no route,
session persistence, timer, scoring, provider, or Prisma schema change; EP5-ST002
owns the authenticated session boundary.

## EP5-ST004 scoring and integrity boundary

Finalized FULL analysis reuses the timed-test service and immutable session
snapshot; it does not create a second score or session model. The pure analysis
policy validates the persisted FULL policy/version and Part quotas before
producing bounded score, Part/skill, weakness, and server-clock time projections.
The controller only forwards the authenticated principal and correlation ID.
Server-observable replay, conflict, closed/late-answer, and duplicate/late-
finalization signals use the existing redacted audit service. Audit evidence is
append-oriented and never carries answer content, answer keys, prompts, or raw
request data.

## EP5-ST005 Error Notebook coverage boundary

The authenticated Error Notebook page keeps its existing owner-scoped entries,
pagination, source filter, and remediation projection, and adds only the
server-derived `coverage.domains` summary. Coverage is an overall owner query,
independent of the page source filter. Daily-practice rows map to `GENERAL`;
immutable TOEIC Part 1-4 and Part 5-7 metadata maps to `LISTENING` and `READING`.
Missing or malformed TOEIC metadata fails closed for both TOEIC domains, while
Speaking and Writing remain explicitly unavailable because this boundary has no
approved notebook evidence for them. No score, recurrence, schedule, provider,
feedback, rubric, submission, or schema model is introduced.

## EP5-ST007 explanation layering

The explanation controller accepts only the validated `source`, bounded
`questionId`, authenticated principal, correlation ID, and required
`Idempotency-Key`. `AiExplanationGatewayService` owns prompt/policy constants,
UTC-day quota, request fingerprints, idempotency replay/conflict behavior,
grounded safe projection, and explicit unavailable semantics. The practice
repository exposes a narrow owner-scoped explanation port selecting only
`source`, `questionId`, and `explanation`; answer, prompt, and submission fields
remain outside that port. The local fallback is deterministic and credential-free.

### Adaptive roadmap boundary (EP5-ST006)

`adaptive-roadmap-v1` is a pure, deterministic server policy. Its allowlist is the owner-scoped roadmap item status and the sanitized Error Notebook coverage projection (`GENERAL`, `LISTENING`, `READING`, `SPEAKING`, `WRITING`). Unavailable, malformed, duplicate, or unsupported evidence fails closed; it is never treated as zero performance. `entryCount` is validated for consistency but is not a score or priority weight. The policy uses only the approved coverage state (`available` before `empty`) plus the fixed `LISTENING`/`READING` tie-break; unavailable domains have no adaptive signal and remain in place. It reorders only existing pending items within their existing day/slot set.

### Community moderation boundary (EP5-ST010)

The community module follows controller -> service -> repository layering.
Authentication and role guards establish the actor; the service shapes safe
learner and moderation projections; the repository owns bounded Prisma queries
and transactions. A moderation state change, idempotency decision, and
redacted audit event share one transaction. No client status, actor identity,
AI provider, or publication decision is trusted from request data.

### AI operations projection boundary (EP5-ST012)

`GET /api/v1/admin/ai-operations` is a read-only, role-gated projection over
server-owned `AiFeedbackUsage` aggregates. The repository performs bounded
count/group/sum queries; it never sends usage rows, learner identity,
idempotency keys, fingerprints, feedback JSON, prompts, or provider payloads
to the admin service. The service validates aggregate arithmetic and maps only
approved outcome, feature, skill, quota-denial, and cost fields into the
response. Replay and abuse are explicit unavailable states under approved
Option 1; no database migration or inference source is introduced.
