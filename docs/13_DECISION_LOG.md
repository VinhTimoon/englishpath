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
