# Security Plan V2

## Current Repository Evidence

- Project rules already require backend DTO validation, protected endpoints,
  server-side TOEIC timer validation, and non-disclosure of correct answers before
  submission.
- This document extends those rules into a Phase 0-6 baseline.

## Identity and Access

- Backend verifies Supabase JWT signature, expiry, issuer, audience, and subject
  before accepting any protected request.
- Application roles, ownership rights, moderator rights, and admin rights are
  resolved by backend policy, not trusted from JWT custom claims alone.
- All protected resource reads and writes enforce role plus ownership or
  entitlement checks.
- Identity is resolved in two stages: verified provider evidence first, then an
  application principal loaded from backend data. The provider stage exposes no role,
  ownership, entitlement, moderator, or admin authority.
- `EP1-ST008` must implement production Supabase signature, expiry, issuer, audience,
  and subject checks. The credential-free local fixture verifier exists only for tests
  and must never be registered in the runtime application graph.
- Missing, malformed, duplicated, expired, unknown, wrong-issuer, and wrong-audience
  credentials fail closed. Outward errors redact tokens, raw claims, provider details,
  and secrets.

## Data and Content Protection

The licensed library workflow keeps Drive manifests as private source evidence.
Import creates draft-only governed state; review and publish are separate
server-owned decisions bound to exact checksum/source-version evidence. A changed
or expired source fails closed and cannot inherit prior approval. Local fixtures
never read credentials or contact Drive/storage providers.

- Correct answers, scoring rubrics, moderation internals, provider secrets, and
  private storage locations never leave the backend unless policy explicitly allows
  a sanitized projection.
- Uploaded files require type, size, extension, and malware-scan policy before
  acceptance into controlled storage.
- Private media uses signed or otherwise scoped access; public media requires
  approved publication state.
- Google Drive content stays inventory-only until review, rights validation, and
  controlled publication complete.
- Drive source references, parent IDs, and path hints are private operational metadata.
  They are excluded from learner projections and sanitized failures. A changed checksum
  or version is default-denied for import/publication until later rights and human-review
  gates complete; inventory presence never conveys approval.
- Imported and AI-assisted content begins as draft and cannot self-review or
  self-publish. Review and publication require a policy-issued decision for an
  authenticated human actor with the exact action permission, bound to the actor,
  immutable checksum, and source version. Caller-provided booleans and automated or
  forged actor decisions are rejected.
- Unknown, blocked, expired, malformed, or incompatible license evidence fails closed.
  Approved rights must explicitly allow both the content usage scope and delivery
  access tier; an approved status alone is insufficient.
  Source changes create a linked draft and invalidate prior review evidence instead of
  mutating a published version.
- Taxonomy and content-policy failures are sanitized before HTTP mapping; private
  source locations and reviewer-only evidence are not returned to clients.

EP1-ST029 enforces this boundary in the persisted CMS API: content editors may create
and review, admins may publish, and learner roles cannot access authoring routes.
Review and publish reconstruct policy-issued decisions from persisted exact evidence;
publication is rejected for draft/rejected review, incompatible rights, expired rights,
self-publish, or a repeated published transition. Audit attributes contain only safe
capability/outcome scalars.

## Assessment Integrity

- TOEIC, placement, and other scored flows use server-authoritative timers.
- Backend records suspicious events such as duplicate submissions, timer drift,
  replayed requests, unusual navigation gaps, and integrity policy failures.
- Score computation, rubric selection, and answer correctness remain backend-owned.

## Abuse and Quota Controls

- Rate limiting applies by route class, user, and anonymous fingerprint where
  applicable.
- AI features enforce quota, abuse heuristics, moderation policy, and prompt
  version traceability.
- Idempotency protects retry-prone writes from duplicate submission or payment
  side effects.
- Community features require moderation queues, escalation paths, and abuse audit
  capture.

## Audit and Observability

- Security-significant actions write append-oriented audit events with actor,
  target, policy result, timestamp, and correlation ID.
- Logs and audits redact secrets, tokens, raw payment payloads, private answers,
  and unnecessary personal data.
- Phase 1 `GET /api/v1/admin/overview` resolves `CONTENT_EDITOR`, `ADMIN`, and
  `SUPER_ADMIN` only from the active persisted application principal. Each allowed or
  denied decision is appended as one redacted `PrivilegedAuditEvent`; the browser sees
  only a role-scoped operational projection and never audit rows or provider data.
- Monitoring and analytics adapters receive only the minimum event data required.
- Observability attributes are flat, scalar, and bounded. Sensitive keys are matched
  case-insensitively after separator normalization and removed before adapter delivery,
  including authorization, credentials, cookies, passwords, tokens, personal identity,
  private answers/locations, provider/payment payloads, and raw free text.
- Analytics is product telemetry, not an audit substitute. Security-significant actions
  still require the separate append-oriented audit domain with actor/target/policy
  evidence and retention controls.

## Owner-Controlled Operations

- Production credentials, domains, paid services, provider contracts, and budgets
  remain under human owner control.
- Destructive migrations require explicit human approval outside routine story
  execution.
- Promotion from `dev` to `main` is a human-controlled release decision.

## Minimum Security Gates for Later Implementation

- JWT verification tests
- Role and ownership authorization tests
- DTO validation tests
- Rate-limit and idempotency behavior tests
- Private media access tests
- Answer-protection and official-timer tests
- Audit emission and redaction tests

## Persisted Identity And Ownership

- Provider subject, not email, is the external identity key; application user ID is the
  ownership key used by repositories.
- Profiles enforce owner and target equality before any database operation and recheck
  active user status inside write transactions.
- JWT claims never populate application roles. Canonical roles are database records;
  `GUEST` remains anonymous request state.
- Suspended and retained identities fail closed for profile and role operations.
- Duplicate and unexpected persistence failures return stable typed messages without
  email, provider subject, profile data, SQL, or provider details.

## Supabase Token Verification

The API allowlists `ES256` and `RS256`, verifies signature, issuer, audience, temporal
claims, and subject through Supabase JWKS, and never maps JWT role-like claims to
application authorization. The backend database remains authoritative for active status,
roles, ownership, and entitlements. Authentication errors are normalized and never echo
tokens, provider diagnostics, stack traces, or secrets.

Dependency decision `EP1-ST008`: the owner approved exact `jose@6.2.3` on 2026-07-17.
The package is MIT licensed, has zero transitive runtime dependencies, and is pinned by
exact version and registry integrity in `pnpm-lock.yaml`. The resolved request was
removed from `notes/ai-req` as required by project workflow; upgrades require a new
supply-chain review and owner approval.

Supabase-required `exp`, `iat`, and `sub` claims are enforced. The optional `nbf` claim
is validated whenever present, matching Supabase's published JWT claims contract without
rejecting valid access tokens that omit it.

# TOEIC timed-test security

Timed-test ownership comes only from the authenticated principal. The server
owns the clock and policy; learner projections exclude correct answers,
correctness, governance, rights, source, and provenance fields.
The server persists the governed version IDs at start and grades only that
snapshot for display; every answer also passes the current governance predicate
before the private grading projection is used.

The learner eligibility predicate is fail-closed on the server-owned TOEIC
source allowlist. The current approved source is `englishpath-original`; its
governance policy may grant `PRACTICE` and `MOCK_TEST` scopes, while each
imported version stores only the requested subset. MINI/HALF selection requires
`MOCK_TEST`, and ordinary practice requires `PRACTICE`. A reviewed/published
row from another source, even if it carries an approved license and usage scope,
cannot enter a learner catalogue.

The EP2-ST009 analysis endpoint is aggregate-only and available only after server
finalization. Private correctness is consumed inside the timed-test service and
is not serialized into the learner projection. Explicit owner-bound lookup,
snapshot completeness checks, recursive forbidden-field assertions, and
side-effect-free repeated reads protect score integrity and prevent answer-key,
user, or governance metadata disclosure.

EP2-ST010 extends the ownership boundary without weakening it. An
`ErrorNotebookEntry` has exactly one source/reference pair: daily practice uses
`PracticeSession`, while TOEIC uses `ToeicTimedTestSession`; the repository checks
the TOEIC session owner and finalized status before writing. Capture accepts only
server-computed incorrect answers and is idempotent by timed-session/question.
Notebook pages are authenticated, owner-scoped, bounded, and source-filtered;
remediation projections contain no answer keys, correctness flags, provider, or
governance fields. Capture failure leaves the final result available and exposes
only an unavailable/retryable state.

EP2-ST011 remediation packs are derived only after finalized owner-scoped
analysis. Vocabulary and practice destinations are selected from server-side
published/catalogue predicates; grammar destinations are fixed reviewed
internal paths. The frontend rejects external or malformed pack URLs and
private recursive fields. Pack lookup failure returns an empty or unavailable
pack state without changing the authoritative score or exposing answer data.

# EP3-ST001 storage boundary

Source references, Drive paths, rights evidence, review evidence, storage object
keys, and provider metadata are server-owned and must be redacted from learner
projections. Controlled-storage adapters return only safe state and manifests
never imply publication or access authority.

## EP3-ST005 learner catalogue redaction

Catalogue eligibility is evaluated server-side before any facet or search
projection, so private, draft, or expired content cannot leak through filters
or counts. The learner response is an explicit allowlist and excludes source
URLs, object keys, checksums, rights evidence, reviewer/actor identifiers, raw
manifests, credentials, and provider internals. A catalogue item is descriptive
only; controlled media authorization remains a separate EP3-ST006 boundary.

## EP3-ST006 media and transcript controls

Library item access performs a fresh server-side eligibility check and makes
ineligible and unknown versions indistinguishable. Storage state is mapped to a
safe learner state; failures fall back to unavailable/pending behavior. The
response allowlist excludes every provider locator and source/private field,
and transcript validation prevents malformed or oversized timing/text data
from crossing the API.

## EP3-ST007 learner-state ownership

Library learning progress, bookmarks, and personal notes are keyed by the
authenticated application user and content version. The service reuses the
EP3-ST005 eligibility predicate before every read or write and the repository
includes the user key in every query. Projections omit database IDs and
provider metadata. Notes are bounded plain text, reject control data, are not
logged, and are rendered without HTML interpretation. Media unavailable states
never fabricate a URL or reveal storage/provider details.

## EP3-ST008 answer secrecy and outcomes

The local drill adapter keeps correct options in backend-only internal types.
Public projections are allowlisted, and submission validates identity/options
before scoring. Outcomes include the authenticated user in every repository
predicate and are uniquely keyed so retries replay the finalized selection;
answer keys and private provider/source fields are never logged or returned.
Related-learning links are server-owned allow-listed routes. The library links
endpoint accepts no target IDs or URLs, delegates eligibility to the existing
library policy, and exposes no provider/source/admin fields or learner-owned
progress from another module.
### Reviewed content operator-data boundary

Source IDs, private locators, checksums, license records, and reviewer evidence
remain operator-side data. Publication is gated by approved review, valid
rights, usage scope, access tier, and published state; learner projections are
explicitly allow-listed.
### EP3-ST012 phase-exit review

The phase-exit review confirms fail-closed handling for `AVAILABLE`, `PENDING`,
`QUARANTINED`, and `RETIRED` storage states. Learner responses and sanitized
errors contain no provider locator, object key, checksum, private source URL,
rights owner, review evidence, or operator identity. The local reviewed batch
remains bounded, replay-safe, atomic, and provider-neutral.
# EP4-ST001 security boundary

Pre-submission projections are explicit allowlists. They exclude answer keys,
private source locators, provider credentials, raw claims/tokens, reviewer
evidence, hidden scoring formulas, AI output, and official scores. Media values
are controlled asset identifiers only; provider activation remains later work.

## Four Skills separation

Roadmap balancing is not official TOEIC scoring and does not accept or persist submissions, recordings, provider claims, or AI feedback. Speaking/Writing entries require approved server references; unavailable pools fail closed without fabricated learner state.
