# API Contract V2

## Current Repository Evidence

- Current documented route evidence is `GET /api/v1/health`.
- Wider v2 resource contracts below are planned conventions, not implemented proof.

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

Access-layer failures are internal typed results and are sanitized before crossing the
HTTP boundary. Missing credentials map to `AUTH_REQUIRED`; malformed, unknown,
expired, wrong-issuer, or wrong-audience identity evidence maps to
`AUTH_INVALID_TOKEN`; unresolved application identity and failed role/ownership policy
map to `RESOURCE_FORBIDDEN` unless an endpoint contract intentionally uses a safer
not-found response. Tokens, raw claims, and provider errors never enter the envelope.

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
## Authenticated Profile

- `GET /api/v1/profile` returns the authenticated application's minimal profile.
- `PATCH /api/v1/profile` accepts only `displayName`, `avatarUrl`, `locale`, and
  `timezone`; role and user identifiers are rejected as mass assignment.
- Both routes require a Supabase bearer token plus an active backend identity and return
  the standard sanitized error envelope with a correlation ID.
