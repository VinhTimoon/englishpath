# API Contract V2

## EP3-ST001 library foundation

This story adds no HTTP endpoint or learner projection. Drive manifests, source
URLs, hierarchy hints, rights/review evidence, storage locations, and provider
metadata remain server-owned. A manifest is source evidence and cannot authorize
review, publication, learner access, or runtime delivery.

## TOEIC learner eligibility governance (EP2-ST012)

All learner-facing TOEIC question catalogues use the same server-owned
eligibility predicate. A row must be reviewed, published, license-approved,
within its validity window, free-tier, and carry the approved
`sourceIdentity` `englishpath-original`. Timed MINI/HALF/FULL selection additionally
requires the `MOCK_TEST` usage scope; practice selection requires `PRACTICE`.
The source allowlist is enforced in the repository predicate, not inferred from
client filters or the visible response.

## Current Repository Evidence

- Implemented route groups include health, authenticated profile, learner onboarding,
  placement, and public vocabulary taxonomy.
- Wider v2 resource contracts below remain planned conventions unless explicitly marked
  as implemented.

## Current Health Endpoint

`GET /api/v1/health` currently returns the existing flat `HealthResponseDto`. It is
an explicit compatibility exception until a later implementation story adopts the
planned v2 envelope.

### 200 OK

```json
{
  "status": "ok",
  "api": "running",
  "database": "connected",
  "timestamp": "2026-07-16T00:00:00.000Z"
}
```

### 503 Service Unavailable

```json
{
  "status": "error",
  "api": "running",
  "database": "disconnected",
  "timestamp": "2026-07-16T00:00:00.000Z"
}
```

## Planned V2 Contract Conventions

## Base Convention

- Base path: `/api/v1`
- Transport: JSON over HTTPS
- Resource naming: plural, kebab-case collections with stable resource IDs
- Time format: ISO 8601 UTC timestamps
- Authentication: Bearer JWT verified by backend
- Authorization: backend role, entitlement, and ownership policy checks

## Request Rules

- All non-trivial request bodies use validated DTOs.
- Unknown fields are rejected or ignored consistently by endpoint contract.
- List endpoints support explicit pagination parameters.
- Mutating endpoints may require `Idempotency-Key`.
- Correlation is carried in `X-Correlation-Id`; backend generates one when absent.
- Edge implementations validate an accepted correlation ID before use and generate one
  through the application correlation factory when absent. The same immutable context
  propagates through logs, metrics, analytics, jobs, adapters, audit events, and both
  success/error envelopes. Invalid values fail with a sanitized stable error; this
  foundation defines the contract but does not add middleware or routes.

## Response Rules

- Successful responses exclude secrets, answer keys, internal scoring formulas,
  private storage locations, and raw provider credentials.
- List responses use a stable envelope:

```json
{
  "data": [],
  "page": {
    "number": 1,
    "size": 20,
    "totalItems": 0,
    "totalPages": 0
  },
  "meta": {
    "correlationId": "01JABCDEFG1234567890",
    "idempotencyStatus": "not_applicable"
  }
}
```

- Non-list success responses use:

```json
{
  "data": {},
  "meta": {
    "correlationId": "01JABCDEFG1234567890",
    "idempotencyStatus": "not_applicable"
  }
}
```

## Error Envelope

```json
{
  "error": {
    "code": "RESOURCE_FORBIDDEN",
    "message": "You do not have access to this resource.",
    "details": []
  },
  "meta": {
    "correlationId": "01JABCDEFG1234567890",
    "idempotencyStatus": "not_applicable"
  }
}
```

### Stable Error Codes

- `AUTH_REQUIRED`
- `AUTH_INVALID_TOKEN`
- `RESOURCE_FORBIDDEN`
- `RESOURCE_NOT_FOUND`
- `VALIDATION_FAILED`
- `RATE_LIMITED`
- `IDEMPOTENCY_CONFLICT`
- `IDEMPOTENCY_REPLAYED`
- `QUOTA_EXCEEDED`
- `ENTITLEMENT_REQUIRED`
- `OFFICIAL_TIMER_EXPIRED`
- `SUSPICIOUS_ATTEMPT_BLOCKED`
- `INTERNAL_ERROR`

## Licensed Library Governance (EP3-ST003)

The library import boundary accepts only validated, private Drive inventory
evidence and creates an unpublished draft projection. Review is a distinct
authorized human action bound to the exact content/version/checksum/source
version; self-review is rejected. Publication requires current approved rights,
review, supported usage/access policy, and a non-expired license. Changed or
stale source evidence cannot reuse prior review or publication state. This story
adds no HTTP route: the local policy is provider-neutral and does not grant
storage or learner delivery authority.

Operator projections omit private Drive references, raw manifests, credentials,
reviewer internals, and learner-only fields.

## TOEIC Question Bank (implemented EP2-ST002)

### TOEIC Admin Governance (EP2-ST003)

Protected routes under `/api/v1/toeic` are
`POST /admin/question-versions/import`,
`POST /admin/question-versions/:id/review`, and
`POST /admin/question-versions/:id/publish`.
Import/review require a backend-resolved `CONTENT_EDITOR`, `ADMIN`, or
`SUPER_ADMIN`; publish requires `ADMIN` or `SUPER_ADMIN`. Client role claims and
authorization booleans are ignored. Import creates an immutable `DRAFT` version
and requires an `Idempotency-Key` bound to the authenticated principal and route;
the same exact request replays while a changed request conflicts. Review binds the authenticated
reviewer to the exact checksum/source version; publish requires approved review,
approved license, complete evidence, and current validity. Responses are safe
operator projections and never include the answer, source URL, rights evidence,
or reviewer evidence. Every decision appends a redacted audit event and uses the
standard correlation/error envelope.

License, ownership, usage scope, and access tier are resolved by a server-owned
source allowlist. The current beta allowlist contains only `englishpath-original`
with EnglishPath CC0-1.0 provenance and `FREE` access. The source policy permits
the `PRACTICE` and `MOCK_TEST` scopes; each imported version stores only a
requested supported subset, and claims cannot create or broaden publication
rights. The accepted source URL is fixed by the policy and the submitted
checksum must equal the server-computed SHA-256 fingerprint of the canonical
governed payload. Import identity is derived only from the authenticated actor,
import route, and `Idempotency-Key`.

Authenticated learner endpoints are available at `/api/v1/toeic/questions` and
`/api/v1/toeic/questions/:id`. The collection accepts `page` (default 1), `size`
(default 20, maximum 100), `part`, `questionType`, `difficulty`, `topic`, and
`stimulusGroup`; unknown fields and invalid values are rejected. Results are
ordered by canonical question ID and current version, and use the standard list
or resource envelope above.

Only versions with `REVIEWED`, `PUBLISHED`, `APPROVED`, a reached `publishedAt`,
no expired `validUntil`, approved `englishpath-original` source identity, `FREE`
access, and `PRACTICE` usage scope are eligible for these learner question
endpoints. The server selects one current version per canonical question.
Responses contain only learner fields: identity, TOEIC
classification, topic/stimulus metadata, prompt, options, media reference, and
explanation. Answers, source/provenance, rights/license, review, reviewer, and
publication internals are never selected or serialized.

Access-layer failures are internal typed results and are sanitized before crossing the
HTTP boundary. Missing credentials map to `AUTH_REQUIRED`; malformed, unknown,
expired, wrong-issuer, or wrong-audience identity evidence maps to
`AUTH_INVALID_TOKEN`; unresolved application identity and failed role/ownership policy
map to `RESOURCE_FORBIDDEN` unless an endpoint contract intentionally uses a safer
not-found response. Tokens, raw claims, and provider errors never enter the envelope.

### TOEIC Listening Practice (implemented EP2-ST004)

Authenticated learners use the following owner-scoped routes:

- `POST /api/v1/toeic/practice/listening/sessions` accepts a client session ID,
  optional `listeningPart` limited to `PART_1` through `PART_4`, and a bounded
  `questionCount` (1-50). The server selects only reviewed, published, approved,
  unexpired, free `PRACTICE` versions and returns safe question options. Repeating
  the same client session ID with the same shape replays the session; a changed
  shape returns `IDEMPOTENCY_CONFLICT`.
- `POST /api/v1/toeic/practice/listening/sessions/:sessionId/answers` accepts one
  option for one selected version. The unique owner/session/question constraint makes
  retries safe; a different retry conflicts. The response contains acknowledgement
  and progress only, never `correctAnswer` or `isCorrect`.
- `POST /api/v1/toeic/practice/listening/sessions/:sessionId/submit` requires every
  selected question to have an answer and atomically transitions the owner session
  from `ACTIVE` to `SUBMITTED`. A repeat returns the persisted final score.
- `GET /api/v1/toeic/practice/listening/sessions/:sessionId/result` returns the
  caller's active progress or submitted score. Unknown or non-owned sessions use the
  sanitized not-found envelope.

The story intentionally does not award XP/streak or write Error Notebook entries;
those behaviors belong to later Phase 2 stories. All routes use the standard
correlation and sanitized error envelope.

### TOEIC Reading Practice (implemented EP2-ST005)

Authenticated Parts 5-7 learners use the following owner-scoped routes:

- `POST /api/v1/toeic/practice/reading/sessions` accepts an actor-bound client
  session ID, optional `readingPart` limited to `PART_5` through `PART_7`, and a
  bounded question count. The server selects only reviewed, published, approved,
  unexpired, free `PRACTICE` versions and keeps the newest eligible version per
  canonical question.
- `POST /api/v1/toeic/practice/reading/sessions/:sessionId/answers` validates the
  selected version and option on the backend. Exact retries replay; changed
  retries conflict. Pre-submit responses contain progress only and never expose
  `correctAnswer` or `isCorrect`.
- `POST /api/v1/toeic/practice/reading/sessions/:sessionId/submit` requires one
  answer for every selected version and atomically transitions `ACTIVE` to
  `SUBMITTED` with the server-computed aggregate score.
- `GET /api/v1/toeic/practice/reading/sessions/:sessionId/result` returns active
  progress or a submitted safe result for the authenticated owner only.

Reading sessions have separate persistence from listening sessions, use the shared
TOEIC eligibility policy, and do not award XP/streak or write Error Notebook or
remediation records in this story. All routes use the standard correlation and
sanitized error envelope.

## Idempotency Rules

- Client sends `Idempotency-Key` for retry-prone writes.
- Backend stores request fingerprint, principal, route, first result, and expiry.
- Replayed identical requests return the original result with
  `idempotencyStatus: replayed`.
- Same key with a different fingerprint returns `IDEMPOTENCY_CONFLICT`.

## OpenAPI Rules

- Every public endpoint must declare summary, auth requirement, parameters, DTOs,
  success responses, and stable error responses.
- Protected admin endpoints must document admin role requirement even though the UI
  remains inside `apps/web`.

## Domain-Specific Contract Constraints

- TOEIC and placement submission endpoints never return correct answers before
  final submission and policy-allowed reveal.
- Timer-bearing endpoints accept client event telemetry but compute official timing
  from backend state.
- AI endpoints return moderated, policy-filtered results and capture prompt
  version, model, quota, and estimated cost server-side.
- Content delivery endpoints expose only published and licensed assets authorized
  for the caller.

Future CMS/content endpoints map invalid classification or metadata to
`VALIDATION_FAILED`; unauthorized human-review/publish attempts to
`RESOURCE_FORBIDDEN`; and non-publishable rights or stale review evidence to a
sanitized validation or conflict response defined by the endpoint story. Responses
never expose private source URLs, raw rights documents, reviewer-only notes, or
storage locations. The current content-governance foundation defines policy only and
does not expose an API. Future controllers may request authorization from the access
layer, but must not accept a client boolean or client-created authorization decision
as proof that an actor is human or has review/publish permission.

EP1-ST029 provides the first guarded CMS contract:

- `GET/POST /api/v1/cms/taxonomy/nodes` lists or creates bounded taxonomy nodes.
- `GET /api/v1/cms/content-versions/:id` returns a safe authoring projection.
- `POST /api/v1/cms/content-versions` creates an immutable draft and replays the
  original response for the same `(contentId, clientRequestId)`.
- `POST /api/v1/cms/content-versions/:id/review` binds evidence to the authenticated
  reviewer and exact content/version/checksum/source version.
- `POST /api/v1/cms/content-versions/:id/publish` requires a separate admin action,
  approved review, and currently compatible rights.

These routes never return source URLs, rights owners, raw rights documents, or private
review evidence. Unknown DTO fields are rejected and all responses carry a validated
correlation ID and idempotency status.

## Vocabulary Taxonomy Endpoints

- `GET /api/v1/vocabulary/topics` accepts optional `level`, `track`, `skill`, and
  `toeicPart` filters plus `page` (default 1) and `size` (default 20, maximum 50).
- `GET /api/v1/vocabulary/mindmap` accepts the same filters plus optional `rootId` and
  `depth` (default 3, range 1-3).
- Both endpoints are public and read-only. They return only approved, published,
  currently licensed public-learning projections and omit source, checksum, rights,
  reviewer, and lifecycle evidence.
- Invalid filters, unknown fields, pagination, or depth return `VALIDATION_FAILED`;
  an unknown mindmap root returns `RESOURCE_NOT_FOUND`; malformed internal graph data
  returns a sanitized `INTERNAL_ERROR` without partial taxonomy data.
- Every vocabulary success and error envelope includes exactly one validated or
  generated `meta.correlationId` and `meta.idempotencyStatus` set to
  `not_applicable`; these read-only endpoints do not accept an idempotency key.
- Repository exceptions and malformed snapshots map to HTTP 500 with
  `INTERNAL_ERROR`, the public message `An unexpected error occurred.`, empty details,
  and no raw adapter error, stack trace, source metadata, or partial `data`/`page`.

## Vocabulary Item Endpoint

- `GET /api/v1/vocabulary/items` is public and read-only. It requires a public
  `taxonomyNodeId`, and accepts `page` (default 1) and `size` (default 20, maximum
  50).
- It returns a deterministic `word`, then ID ordering and exposes only `id`,
  `taxonomyNodeId`, `word`, `meaning`, optional `example`, and optional
  `pronunciation`. Source, license, review, and publication evidence never leave the
  backend.
- Only reviewed, published rows with `publishedAt` no later than the request are
  eligible. A missing, private, or unknown taxonomy node returns `RESOURCE_NOT_FOUND`.
- The standard vocabulary correlation/idempotency metadata and sanitized error envelope
  apply to this endpoint.

## Vocabulary SRS Endpoints

- `GET /api/v1/vocabulary/reviews/due?limit=` requires authenticated application
  identity. `limit` is allowlisted from 1 through 50, defaults to 20, and returns
  the caller's due published items ordered by `(nextReviewAt, vocabularyId)`.
- `POST /api/v1/vocabulary/reviews/:vocabularyId` accepts only `{quality,
clientSubmissionId}`, where quality is 0 through 3. Mastery, repetitions,
  interval, and next-review time are calculated and persisted by the server.
- A repeated owner/item/submission identifier with the same quality returns the
  original result with `idempotencyStatus: replayed`; a different quality returns
  `IDEMPOTENCY_CONFLICT`. Learner state is never included in public taxonomy or
  item responses, and absent example/pronunciation values are returned as null.

## Authenticated Profile

- `GET /api/v1/profile` returns the authenticated application's minimal profile.
- `PATCH /api/v1/profile` accepts only `displayName`, `avatarUrl`, `locale`, and
  `timezone`; role and user identifiers are rejected as mass assignment.
- Both routes require a Supabase bearer token plus an active backend identity and return
  the standard sanitized error envelope with a correlation ID.

## Protected Admin Overview

- `GET /api/v1/admin/overview` requires a backend-resolved active identity. The
  `CONTENT_EDITOR` role receives only the editor-shell capability; `ADMIN` and
  `SUPER_ADMIN` additionally receive bounded operational counts. A client-provided
  role or JWT role claim is never sufficient.
- The response contains only `role`, capability names, and (for admin roles) active
  user/role-assignment counts. It never returns learner progress, secrets, raw claims,
  provider payloads, private source locations, or audit rows.
- Every allowed or denied privileged decision appends one redacted audit event with the
  actor, fixed action/target, policy result, server correlation ID, and bounded scalar
  attributes. Audit persistence is backend-only and append-oriented.
- Missing/invalid authentication returns the standard `401` sanitized envelope;
  authenticated principals without an allowed application role return sanitized `403`.
  Both success and error responses include `meta.correlationId` and
  `idempotencyStatus: not_applicable`.

## Learner Entry Endpoints

- `POST /api/v1/auth/bootstrap` verifies the bearer token and idempotently provisions or
  resolves the backend user before returning the minimal application principal.
- `GET /api/v1/onboarding` returns only the authenticated learner's onboarding record.
- `PATCH /api/v1/onboarding` upserts allowlisted goal, level, study-time, duration, and
  priority-skill fields. It never accepts a user ID, role, or ownership override.
- `GET /api/v1/placement/questions` returns ten deterministic questions and options but
  never includes correct answers or grading metadata.
- `POST /api/v1/placement/submissions` accepts exactly one answer per known question plus
  a client submission ID. Replaying the same ID for the same owner returns the original
  graded result; incomplete, duplicate, or unknown answers are rejected.
- `GET /api/v1/placement/result` returns the authenticated learner's latest result.

All learner-entry endpoints require backend-verified bearer authentication. Local
development may use the exact fixture token only when `AUTH_MODE=local`; startup/runtime
verification rejects that mode when `NODE_ENV=production`.

## Roadmap Endpoints

- `POST /api/v1/roadmaps/generate` derives the plan only from the authenticated learner's
  onboarding and latest placement result. It replays an existing active roadmap.
- `GET /api/v1/roadmaps/current` returns the active version, ordered items, computed
  `todayNumber`, `todayItems`, and completion totals, or `null` before generation.
- `POST /api/v1/roadmaps/recalculate` supersedes the active version and creates the next
  version with lineage in one repository transaction.
- `PATCH /api/v1/roadmaps/items/:itemId/status` accepts only `PENDING`, `COMPLETED`, or
  `SKIPPED` and updates an item only when it belongs to the caller's active roadmap.

Generation never accepts user identity, goal, level, duration, or answer evidence from
the request body. Missing onboarding/placement prerequisites return a sanitized 409;
unknown or non-owned items return 404 without revealing ownership.

## Daily Practice Endpoints

## Daily Sentence Endpoints

- `GET /api/v1/daily-sentences/today` and `POST /api/v1/daily-sentences/:sentenceId/submit`
  require the authenticated application principal. The server resolves the stored
  profile timezone with `Asia/Ho_Chi_Minh` fallback, selects a stable reviewed and
  published sentence for the local date, and never returns `expectedAnswer`.
- Submit accepts `{ "answer": string }` (1–500 characters). It returns the same
  owner-scoped persisted feedback on replay; the unique `(userId, localDate)` constraint
  makes concurrent submissions idempotent. A mismatched sentence ID is rejected.
- Incomplete data is `{localDate, sentence:{id,prompt}, completed:false}`; completed
  data adds `{feedback:{isCorrect,message,completedAt}, completed:true}`. Empty eligible
  content returns `sentence:null` without leaking governed content metadata.

- `POST /api/v1/quiz/session` starts or replays one owner session from a client session
  ID and returns five cards without keys or explanations.
- `POST /api/v1/quiz/session/:id/answer` persists one answer and returns immediate
  server-graded feedback; incorrect answers create a private review entry.
- `POST /api/v1/quiz/session/:id/submit` requires all five answers, awards XP and streak
  once, and returns the final score plus errors.
- `GET /api/v1/quiz/session/:id/result` returns only the caller's persisted result.
- `GET /api/v1/quiz/session/summary/progress` returns owner-derived XP, streak, completed
  sessions, and review-error totals with zero defaults.
- `GET /api/v1/quiz/session/summary/errors` returns a bounded private review page
  for the authenticated learner. `page` defaults to 1 and `size` defaults to 20
  (maximum 50); optional `source` is `PRACTICE` or `TOEIC_TIMED_TEST`. The response
  is `{ entries, pagination: { page, size, total, hasNext }, coverage }`, while legacy
  consumers remain readable during migration. `coverage.domains` is ordered
  `GENERAL`, `LISTENING`, `READING`, `SPEAKING`, `WRITING`; each item contains only
  `domain`, `state` (`available`, `empty`, or `unavailable`), and `entryCount`.
  Coverage is owner-scoped and independent of `source`. Daily practice maps to
  `GENERAL`; TOEIC Parts 1-4 and 5-7 map to `LISTENING` and `READING`. Missing or
  malformed TOEIC Part metadata makes both TOEIC domains unavailable. Speaking and
  Writing are unavailable because this endpoint has no approved notebook evidence.

## TOEIC Practice Catalogue

`GET /api/v1/toeic/practice/catalogue` returns the authenticated learner's
available listening and reading parts, difficulties, and reading topics. Values
come from the same reviewed, published, licensed, free-practice eligibility
predicate as session selection; the web client never invents taxonomy values.
Listening accepts the server-catalogued difficulty. Reading accepts the
server-catalogued difficulty and topic. The selected filter shape is persisted in
the corresponding session table and is part of replay/conflict comparison.

# TOEIC timed tests (EP2-ST007)

Authenticated routes are `POST /api/v1/toeic/tests/sessions`, session GET,
answer POST, submit POST, and result GET. The only start inputs are
`clientSessionId` and `mode` (`MINI`, `HALF`, or `FULL`). Policy values are
server-owned: MINI is 20 questions/1200 seconds, HALF is 50/2700 seconds, and
FULL is 200 questions/7200 seconds with the approved Part quotas. Active
projections never include answer keys or correctness. Late access finalizes as
expired; repeated start and submit are replay-safe. The selected version IDs are
an immutable server snapshot for session display. Answer writes re-check current
governance and option membership, and insertion re-reads the session after a
concurrent write so progress is authoritative.

The web client consumes the envelope as `unknown` and accepts an active session
only when the server projection contains the governed mode total and the
complete ordered question snapshot. Final projections contain no questions and
may contain only the approved aggregate score. The client sends no answer,
grading, source, license, review, publication, or provider fields to the learner
state or browser storage.

### Timed-test analysis (EP2-ST009)

`GET /api/v1/toeic/tests/sessions/:sessionId/analysis` is authenticated and
owner-scoped. It succeeds only for a finalized `SUBMITTED` or `EXPIRED` session
and returns `data.analysis` with `score { correct, total, answered }`, bounded
`accuracy`, aggregate `parts`, aggregate `skills`, deterministic `weaknesses`,
and server-clock `time { limitSeconds, usedSeconds, remainingSeconds,
averageSecondsPerAnswered }`. Percentages are rounded to the nearest integer;
average seconds are rounded to one decimal; used time is floored and clamped to
the persisted policy limit. No question IDs, answer rows, selected options,
correctness flags, answer keys, user IDs, or governance metadata are returned.
Repeated reads are side-effect free and retain the standard correlation/error
envelope.

The same endpoint supports the approved FULL-MOCK-BETA-V1 session additively:
`total` is 200, the persisted policy limit is 7,200 seconds, and the response
contains all Part 1-7 and LISTENING/READING aggregates after snapshot validation.
The result remains a practice-simulation analysis and is not an official TOEIC
score conversion. Server-observable answer replay/conflict, closed/late-answer,
and duplicate/late-finalization signals are recorded through the redacted audit
boundary using the request correlation ID; they are never returned as raw audit
payloads or used as client-authored scoring input.

### Timed-test Error Notebook remediation (EP2-ST010)

Finalized result/analysis reads reconcile incorrect answers into the existing
private notebook. `data.analysis.remediation` is one of:
`{ status: "ready", count, href }`, `{ status: "empty", count: 0, href: null }`,
or `{ status: "unavailable", count: 0, href: null }`. The link is a safe
`/error-notebook?source=TOEIC_TIMED_TEST` route and contains no question ID,
selected option, correctness flag, answer key, or provider metadata. Capture is
server-derived, owner-scoped, and retry-safe.

EP2-ST011 may add `packs` to `data.remediation`. Each pack contains only
`kind` (`VOCABULARY`, `GRAMMAR`, or `PRACTICE`), a learner-safe `title`,
`description`, an internal `href`, and an optional `relatedLabel`. The server
emits at most six unique packs in deterministic order. Vocabulary eligibility
uses the published TOEIC taxonomy predicate, practice links require a current
catalogue Part, and grammar links are limited to the reviewed internal guide
allowlist. Missing content returns `packs: []`; pack objects contain no answer,
question, session, user, correctness, timing, governance, or provider fields.

## Licensed learner catalogue (EP3-ST005)

`GET /api/v1/library/catalogue` requires an authenticated learner and returns a
safe `{ data, meta }` envelope. The server filters before deriving facets or
search results. A version is eligible only when it is reviewed, published,
license-approved, unexpired (or explicitly non-expiring), uses the `library`
scope, and permits the `authenticated` tier. Missing or malformed governance
evidence fails closed.

The bounded query accepts `page`, `size` (maximum 50), `search`, `level`,
`topic`, and `contentType`. Unknown fields, invalid pagination, and filters not
present in the eligible server-derived facets are rejected. Results use stable
ordering and distinguish `empty`, `filtered-empty`, and `success` statuses.
Learner items allowlist identity, title, summary, taxonomy, content type,
duration/level, and availability only; Drive URLs, object keys, checksums,
rights/reviewer data, raw manifests, and provider details never cross the
boundary. Catalogue visibility does not authorize media delivery; that boundary
belongs to EP3-ST006.

## Controlled media and transcript (EP3-ST006)

`GET /api/v1/library/items/:versionId` rechecks the learner catalogue
eligibility predicate at request time. Unknown, private, draft, expired,
withdrawn, or wrong-tier versions all return the same safe not-found response.
The success projection contains only item metadata, bounded deterministically
ordered transcript segments, duration, and `{ media: { state } }`.

Controlled storage states are `AVAILABLE`, `PENDING`, `QUARANTINED`, or
`RETIRED`. The endpoint never returns a provider locator, Drive reference,
object key, source/checksum, rights/reviewer evidence, manifest, credential, or
unsigned URL. Provider activation and playable delivery remain separate from
catalogue/item visibility and are owned by later stories.

## EP3-ST007 learner state

## EP3-ST010 related learning

`GET /api/v1/library/items/:versionId/links` requires authentication and
rechecks library eligibility through the item projection. Eligible content
returns a bounded deterministic list of learner-safe `roadmap`, `vocabulary`,
and `quiz` links. Each link has only `kind`, `label`, and a server-built
internal `href`; the href carries the bounded `returnVersionId` context. No
provider locators, source evidence, private IDs, completion records, or client
URLs are accepted or returned. Ineligible, withdrawn, expired, and unknown
versions fail closed using the library not-found behavior.

`GET /api/v1/library/items/:versionId/state` returns the safe item projection
plus only the authenticated owner's progress, bookmarks, and personal note.
Progress writes, bookmark writes, and note writes are authenticated,
owner-scoped, bounded, and idempotent upserts; delete operations are
owner-scoped idempotent deletes. Every response uses the standard envelope.
The server rechecks item eligibility before reading or mutating learner state.

## EP3-ST008 listening drills

`GET /api/v1/library/items/:versionId/drill` exposes only the stable drill,
question, prompt, and option projection. `POST /drill/submit` validates the
question and option server-side, computes correctness after submission, and
replays the immutable owner-scoped outcome on retries. Answer keys, provider
references, and reviewer/source data never cross the API boundary.

### Reviewed licensed batch import

Credential-free local imports validate every manifest before accepting any
version. Duplicate identities, malformed source evidence, and checksum/source
version conflicts return deterministic governance errors. Learner catalogue,
item, media, drill, shadowing, and link responses expose only currently
published, approved, rights-compatible content and never operator evidence.

### EP3-ST012 phase-exit evidence

The final credential-free review passed the focused library unit boundary
(16 suites, 195 tests), focused library API E2E (4 suites, 10 tests), and the
full project gates. Catalogue, item, media, drill, shadowing, progress, and
related-learning responses remain explicit safe allowlists. Unknown, expired,
withdrawn, rejected, conflicted, wrong-tier, and non-`AVAILABLE` media states
fail closed.

# EP4-ST001 model boundary

No endpoint is introduced. Later task APIs may use the server-owned task/version
and learner-safe projection contracts. Rubrics are advisory only and are not an
official TOEIC score or scoring formula. Submissions, recordings, AI feedback,
and official scoring belong to later stories.

## Four Skills roadmap projection

Learner-safe balance projections expose only `skill`, `activityKind`, bounded `target`, approved `reference`, `allocationReason`, and `completionState`. Missing Speaking/Writing references are represented as unavailable; the API never fabricates prompts, scores, submissions, answer keys, or rubric internals.

The authenticated `GET /api/v1/roadmaps/current` response adds a `fourSkills`
array with exactly `READING`, `LISTENING`, `SPEAKING`, and `WRITING` in that
order. Each entry also exposes `availability` (`AVAILABLE` or `UNAVAILABLE`).
For unavailable entries, `target` and `reference` are `null` and
`completionState` is `UNAVAILABLE`; clients must not reinterpret this as zero,
completed, or a fabricated task. Existing roadmap, today, and aggregate fields
remain unchanged.

## TOEIC Speaking submission boundary (EP4-ST002)

Protected routes are:

- `POST /api/v1/toeic/speaking/tasks/:taskId/sessions`
- `GET /api/v1/toeic/speaking/sessions/:sessionId`
- `POST /api/v1/toeic/speaking/sessions/:sessionId/submissions`

Start and submit requests require an `Idempotency-Key`. The start response
contains the published learner task projection and an owner-scoped session ID.
Submission accepts only `RECORDED_AUDIO`, bounded duration/size metadata, and a
controlled application reference; it never accepts audio bytes, provider URLs,
scores, rubric internals, or client ownership. Exact retries replay the safe
acknowledgement, while changed payloads, cross-owner access, missing/withdrawn
tasks, and finalized sessions return sanitized conflicts/not-found responses.

## TOEIC Speaking recording boundary (EP4-ST003)

Authenticated routes are:

- `GET /api/v1/toeic/speaking/recordings/:recordingId`
- `POST /api/v1/toeic/speaking/recordings/:recordingId/playback-capability`
- `GET /api/v1/toeic/speaking/recordings/:recordingId/playback`
- `POST /api/v1/toeic/speaking/recordings/:recordingId/revoke`

Recording metadata is restricted to the approved audio MIME allowlist, 10 MB,
and 3,600 seconds. A finalized owner submission creates an `AVAILABLE` local
controlled asset with a 30-day expiry. Playback requires an owner-scoped,
opaque capability valid for at most five minutes and is denied after expiry,
revocation, deletion, or ownership failure. Responses never include provider,
object-key, credential, raw audio, or long-lived URL fields. The local/test
adapter is credential-free; production storage activation is not performed by
the application loop.

## EP4-ST005 Writing task/submission API

Authenticated routes:

- `POST /api/v1/toeic/writing/tasks/:taskId/sessions` starts a published
  catalogue task with a required `Idempotency-Key`.
- `GET /api/v1/toeic/writing/sessions/:sessionId` returns the owner-scoped
  learner projection.
- `POST /api/v1/toeic/writing/sessions/:sessionId/submissions` accepts only a
  bounded `text` body and a required idempotency key.

The response contains task prompt metadata, lifecycle state, word/character
counts, and timestamps. It does not contain submitted text, official scores,
rubric/provider data, answer keys, or credentials. Word count is server-owned
and uses Unicode letter/number tokens with apostrophe/hyphen joins.

## EP4-ST007 advisory feedback gateway

Authenticated route:

- POST /api/v1/ai-gateway/feedback accepts feature, matching skill,
  local-fixture-v1 prompt version, bounded task id, bounded input text, and a
  required Idempotency-Key.

The response is an allowlisted projection containing outcome,
feedback-gateway-v1 policy version, prompt version, feature, skill, quota
remainder, and advisory-only feedback. It never contains provider credentials,
raw response/input, hidden prompt, rubric weights, or official scores.

## EP4-ST008 Speaking feedback fallback

Authenticated route:

- POST /api/v1/toeic/speaking/sessions/:sessionId/feedback

The backend first resolves the session by the authenticated application user,
requires `FINALIZED` plus a submission, and rechecks the owner-scoped recording
asset through the EP4-ST003 boundary. Only an `AVAILABLE` recording may enter
the gateway. The current approved local/no-op gateway has no speech-to-text or
audio-capable adapter, so this route records the bounded attempt through the
same quota, idempotency, policy, and cost boundary and returns the explicit
`PROVIDER_UNAVAILABLE` outcome with `feedback: null`. It never derives feedback
from duration, size, metadata, or an opaque recording reference. Missing,
expired, revoked, deleted, cross-owner, active, and submission-less sessions
fail closed and do not call the gateway.

## EP5-ST001 full-mock assembly boundary

EP5-ST001 introduces no HTTP endpoint. The backend owns the immutable full-mock
blueprint version, 200-question Part quota shape, and deterministic selection of
governed question versions for the later EP5 session service. An incomplete eligible
catalogue produces an internal insufficient-content result and never a partial or
fabricated test. EP5-ST002 extends the existing authenticated session route
additively for `FULL`. The server invokes the EP5-ST001 assembler before persisting
the owner-scoped session, stores the policy version, server-clock deadline, and
ordered immutable version-ID snapshot in the existing timed-session columns, and
exposes the same safe question projection used by MINI/HALF. FULL catalogue
identity, persisted version numbers, options, timer, answer membership, and
finalization are validated on the backend; malformed or insufficient content fails
before a session write. The additive Prisma enum migration is local/generated
evidence only and must not be applied to shared Supabase or production by
automation.

### Roadmap recalculation

`POST /api/v1/roadmaps/recalculate` derives identity and evidence from the authenticated principal. Request fields cannot supply identity, scores, evidence, weights, priorities, or policy versions. Recalculation preserves item count, statuses, completion timestamps, and protected slots, creates a successor only when the canonical existing-item ordering changes, and never creates prompts, submissions, official scores, AI output, or Speaking/Writing tasks. The policy validates `entryCount` but never uses it as a score or priority weight; it only orders supported `available` coverage before `empty` coverage with a fixed `LISTENING`/`READING` tie-break. Unavailable domains produce no signal. The current schema has no evidence fingerprint; an evidence change that yields an equivalent candidate is therefore a safe no-op.
