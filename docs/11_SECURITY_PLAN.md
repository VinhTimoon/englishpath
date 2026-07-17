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
