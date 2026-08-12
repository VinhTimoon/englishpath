# Decision Log V2

## ADR-016-01: Separate Current Evidence From Planned Architecture

- Status: accepted
- Decision: Every architecture artifact must label repository evidence separately
  from planned Phase 0-6 design.
- Reason: Prevent unsupported implementation claims and reduce planning drift.

## ADR-016-02: Backend Is The Authority For Rights And Official Outcomes

- Status: accepted
- Decision: NestJS backend owns roles, ownership, rights, roadmaps, scores,
  quotas, official timers, submissions, and correct answers.
- Reason: Frontend and provider claims are untrusted for security-sensitive or
  user-visible official outcomes.

## ADR-016-03: `/admin` Stays Inside `apps/web`

- Status: accepted
- Decision: Administrative UI remains part of the main Next.js application.
- Reason: Avoid split auth surfaces and duplicate platform overhead during Phase
  0-6.

## ADR-016-04: Google Drive Is Inventory-Only

- Status: accepted
- Decision: Google Drive may supply source file inventory but is not the canonical
  content or publication system.
- Reason: Canonical review, rights, version, and publication control must remain
  backend-governed.

## ADR-016-05: Controlled Storage Owns Deliverable Media

- Status: accepted
- Decision: Published or private learner-facing media must be served from
  controlled storage linked to canonical content records.
- Reason: Access control, versioning, and revocation are unsafe when delegated to
  source inventory alone.

## ADR-016-06: PostgreSQL First For Search And Retrieval

- Status: accepted
- Decision: Start with PostgreSQL full-text search and pgvector-compatible design
  before introducing specialist search, vector, or graph infrastructure.
- Reason: Reduces operational complexity and keeps early architecture boring and
  replaceable.

## ADR-016-07: Adapters For External Providers

- Status: accepted
- Decision: Storage, Drive inventory, queue, analytics, monitoring, email, AI,
  STT, TTS, and payment integrations must be isolated behind backend adapters.
- Reason: Enables local/mock environments and preserves provider replaceability.

## ADR-016-08: Stable `/api/v1` Contract

- Status: accepted
- Decision: All future public endpoints use `/api/v1`, validated DTOs, OpenAPI
  metadata, stable error codes, pagination metadata, correlation IDs, and
  idempotency for retry-prone writes.
- Reason: Makes later contract tests and client integration behavior predictable.

## ADR-016-09: Owner-Controlled Production Decisions

- Status: accepted
- Decision: Production credentials, domains, paid-service activation, destructive
  migrations, provider selection, budget decisions, and `dev` to `main` promotion
  remain human-owner controlled.
- Reason: These decisions exceed normal story automation authority.

# ADR EP2-ST007

Use separate timed-test tables and policy v1. Expired active sessions are
finalized server-side and late answer writes are rejected. Database uniqueness
and active-state compare-and-set provide retry and concurrency protection.
The selected version IDs are immutable for the session; a unique-answer race
re-reads the winner so identical retries remain idempotent.
Answer writes still re-check current governance before grading.

### Decision: timed-test analysis projection (EP2-ST009)

Use a read-only `/analysis` projection over the existing timed-test session rather
than adding analysis tables or changing the Prisma schema. The server calculates
raw score, bounded percentages, Part/skill aggregates, deterministic weakest
areas, and clamped time use from the immutable question and answer snapshot.
Analysis is available only for finalized sessions; the browser supplies no
analysis inputs and receives no per-question correctness or governance fields.
Error Notebook and remediation links are implemented by EP2-ST010 under the
approved cross-source ownership decision below.

### Decision: cross-source Error Notebook ownership (EP2-ST010)

Owner approved Option 1 on 2026-08-07. `ErrorNotebookEntry` remains the shared
learner-private projection, with an explicit source discriminator and nullable
owner-scoped references to either the existing `PracticeSession` or the
separate `ToeicTimedTestSession`. Existing daily-practice rows and capture
semantics remain unchanged. TOEIC capture is additive, limited to finalized
incorrect answers, and protected by a separate `(toeicTimedTestSessionId,
questionId)` uniqueness constraint plus database-level source/reference
invariants. The migration is local/generated evidence only; it is not applied
automatically to shared Supabase or production.

### Decision: TOEIC remediation pack projection (EP2-ST011)

Keep remediation packs as a bounded read-time projection over finalized analysis
rather than adding tables or schema fields. Vocabulary uses the existing
published TOEIC taxonomy service, practice uses the existing catalogue, and
grammar uses a small reviewed internal guide allowlist until a governed grammar
content model exists. Pack lookup is failure-isolated and never overrides a
valid finalized result or creates client-authored weakness data.

### Decision: TOEIC learner source boundary (EP2-ST012)

Keep TOEIC content eligibility fail-closed on the server-owned source allowlist.
The approved `englishpath-original` policy supports both `PRACTICE` and
`MOCK_TEST`; an individual import may request either supported subset. Timed
MINI/HALF repositories require `MOCK_TEST`, practice repositories require
`PRACTICE`, and every learner predicate must also require the approved source
identity. This is an application-policy hardening change with no schema or
external-provider change.

### Decision: full-mock blueprint and assembly boundary (EP5-ST001)

Use one server-owned FULL-MOCK-BETA-V1 blueprint with 200 questions, 120 minutes,
and fixed Parts 1-7 quotas of 6/25/39/30/30/16/54. Assemble only from reviewed,
published, licensed, mock-test-eligible question versions; choose one newest version
per canonical question and fail closed when any quota is unavailable. Keep the
boundary pure and immutable with no route or persistence change. The policy is a
practice-simulation contract, not official score conversion or official exam
provenance; session, timing, finalization, scoring, and suspicious-event handling
are deferred to EP5-ST002 through EP5-ST004.

### Decision: FULL scoring and server-observable integrity evidence (EP5-ST004)

Extend the existing finalized timed-test analysis contract to the approved FULL
snapshot using the same deterministic aggregate/weakness policy, with a fixed
200-question total and 7,200-second server limit. Preserve MINI/HALF behavior and
do not add official TOEIC score conversion. Use the existing redacted audit
boundary for replay, conflict, closed/late-answer, and duplicate/late-
finalization signals already observable at the server API boundary. Do not add a
new integrity model, client navigation telemetry, provider integration, or raw
answer data to audit attributes; audit persistence is append-only evidence and
never changes the authoritative score.

### Decision: additive cross-skill Error Notebook coverage (EP5-ST005)

Keep the existing authenticated `/api/v1/quiz/session/summary/errors` page
backward compatible and add only `coverage.domains` in the fixed order
`GENERAL`, `LISTENING`, `READING`, `SPEAKING`, `WRITING`. Daily-practice rows map
to `GENERAL`; immutable TOEIC Part 1-4 and Part 5-7 metadata maps to Listening
and Reading. If any owner TOEIC row lacks valid Part metadata, both TOEIC domains
are unavailable with zero count rather than exposing partial classification.
Speaking and Writing remain unavailable until an approved notebook evidence
source exists. No recurrence, scheduling, score, provider, feedback, rubric,
submission, schema, or migration change is part of this decision.

### EP5-ST006: bounded adaptive policy

Adopted policy version `adaptive-roadmap-v1`. Because no schema change is allowed, idempotence is determined by canonical comparison with the current roadmap; changed existing-item ordering creates a successor with repository-managed lineage, while an evidence change that produces an equivalent candidate is a safe no-op. Existing completion timestamps are carried into successor items. `entryCount` is validation-only: it is not converted into a score, threshold, or priority weight. The only adaptive ordering rule is `available` before `empty`, with a fixed `LISTENING` then `READING` tie-break; unavailable domains produce no signal. No persistence field is used to encode policy state, and no required/due metadata is invented beyond the current roadmap contract.

### Decision: community moderation API boundary (EP5-ST010)

Use a local pending-review workflow with explicit `CommunityPost`,
`CommunityReport`, and `CommunityDecision` records. Learners can submit and
report bounded content; only approved content roles can decide publication.
The implementation is provider-neutral, uses deterministic pagination and
idempotency, and keeps moderation audit persistence in the same transaction as
the state transition. AI moderation, media, comments, and sharing UI remain
outside this story.

### Decision: grounded Error Notebook explanation fallback (EP5-ST007)

Reuse the existing AI usage/quota/idempotency evidence boundary and add an
owner-scoped explanation lookup port to the practice repository. The route is
grounded exclusively in the persisted Error Notebook explanation and returns a
bounded advisory projection. A credential-free local fallback is allowed to
repeat that explanation and one fixed next step; it must never infer an answer,
score, rubric result, or provider claim. Missing or malformed grounding is an
explicit unavailable result with `feedback: null`. No provider, schema field,
migration, or frontend surface is introduced.

### Decision: AI operations projection contract (EP5-ST012)

Approve Option 1: expose a bounded, authenticated aggregate projection from
existing `AiFeedbackUsage` evidence without a migration. `DENIED` is the quota
denial count. `REPLAYED` and abuse metrics remain explicitly unavailable.
Neither metric may be inferred from idempotency keys, fingerprints, audit rows,
or learner data. The projection is read-only, redacted, and cannot mutate
quota, entitlement, moderation, or provider state.

### Decision: Phase 5 local/beta exit (EP5-ST013)

Close Phase 5 for the approved local/beta boundary after the consolidated
security, redaction, API, unit, browser, accessibility, build, and governance
gates pass. Keep Phase 6 suspended/backlog until the product has many
production users. Production promotion, paid AI/provider activation, external
billing/quota, real observability, credentials, and shared Supabase operations
remain owner-controlled and are not claimed by this exit review.
