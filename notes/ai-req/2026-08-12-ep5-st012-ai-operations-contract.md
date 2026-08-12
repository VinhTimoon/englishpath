---
story: EP5-ST012
status: approved
decision_date: 2026-08-12
decision: "Option 1 approved: REPLAYED and abuse metrics are unavailable; DENIED is quota denial; no migration or sensitive-field inference."
---

# EP5-ST012 — AI operations dashboard contract decision

## Decision needed

Approve the server-owned semantics required before EP5-ST012 can be implemented:

1. How historical `REPLAYED` requests are counted in the operations projection.
2. Whether any persisted abuse scalar/aggregate is approved for display, and its exact meaning.
3. Whether unsupported values must be returned as an explicit unavailable state until such evidence exists.

## Why this is blocked

The current approved AI gateway contract persists `AiFeedbackUsage` outcomes only as:

- `ALLOWED`
- `DENIED`
- `PROVIDER_UNAVAILABLE`

Replay is currently returned as request metadata for an exact idempotent retry; it does not create a persisted `REPLAYED` outcome or replay event. The current schema also has no approved abuse marker or abuse aggregate. `DENIED` cannot safely be assumed to mean quota denial without confirming that semantic.

Therefore EP5-ST012 cannot truthfully expose historical replay counts or abuse signals. Deriving them from idempotency keys, request fingerprints, correlation IDs, audit rows, feedback JSON, or learner identity would violate the story's privacy and contract boundaries. Adding a heuristic would also make the dashboard an unapproved business decision surface.

## Impact and risk

The Phase 5 operations dashboard remains unimplemented. Implementing it without a decision could expose sensitive operational evidence, misclassify retries as abuse, report incorrect quota/cost metrics, or create a contract that downstream operators interpret as authoritative. No production system, provider, credential, shared database, or paid service has been changed.

## Options

### Option 1 — Safe unavailable semantics (recommended for the current local/no-op beta)

Keep the existing schema and gateway behavior. Define the dashboard contract so unsupported replay and abuse metrics are explicit `unavailable` values, while implementing only aggregates directly supported by persisted allowlisted fields. Confirm whether `DENIED` is the approved quota-denial mapping; otherwise expose quota-denial count as unavailable too.

Risk/cost: lowest; no migration or external service. Replay and abuse observability remains limited until a later approved contract change.

### Option 2 — Additive server-owned evidence

Approve exact persisted fields/events for replay and abuse, including event meaning, retention, ownership/privacy boundary, aggregation rules, and whether the event is counted per request or per persisted usage row. Then implement an additive schema change and local/test migration only; production/shared Supabase application still requires the normal owner-controlled deployment approval.

Risk/cost: migration and data-retention work; existing rows cannot be backfilled without an approved rule, so historical values may remain unavailable.

### Option 3 — Defer EP5-ST012

Leave the story blocked until the product/security owner defines the operations contract. Do not implement a partial dashboard that can be mistaken for a complete abuse or replay view.

Risk/cost: no new code risk, but the dependent EP5-ST013 story cannot begin.

## Recommendation

Approve Option 1 for the beta, with an explicit unavailable state for replay and abuse (and for quota-denial count unless `DENIED` is expressly confirmed as quota denial). This preserves the existing approved AI boundary and avoids schema churn. If operators require those metrics, choose Option 2 and provide the exact event semantics before implementation resumes.

## Continuation after approval

1. Record the chosen option and exact semantics in `docs/13_DECISION_LOG.md` and the ST012 story.
2. If Option 1 is chosen, implement only directly supported server-side aggregates with strict unavailable fields and no schema changes.
3. If Option 2 is chosen, update the approved API/database/security contracts first, then make only additive changes and run the full high-risk quality gates.
4. Resume EP5-ST012 from this blocked story; do not resume it until the decision is recorded. No recovery story is required.

## Technical evidence inspected

- `apps/api/prisma/schema.prisma`: `AiFeedbackUsage` stores `ALLOWED`, `DENIED`, and `PROVIDER_UNAVAILABLE`, cost micros, quota remainder, feature/skill, policy/prompt, adapter/model, correlation ID, and bounded advisory JSON; no replay outcome or abuse marker.
- `apps/api/src/modules/ai-gateway/ai-feedback.models.ts`: replay is a response idempotency status, not a persisted usage outcome.
- `apps/api/src/modules/ai-gateway/ai-feedback.repository.ts`: persisted repository has no replay-event or abuse aggregation contract.
- `apps/api/src/modules/ai-gateway/ai-feedback.service.ts`: exact replay returns existing evidence and does not create a second usage row.
- `docs/07_DATABASE_DESIGN.md`, `docs/08_API_CONTRACT.md`, `docs/11_SECURITY_PLAN.md`, and `docs/13_DECISION_LOG.md`: existing boundaries require backend ownership, redaction, quota evidence, and abuse controls but do not approve the missing dashboard semantics.
- Planning artifact: `C:\Users\ACER\AppData\Local\Temp\englishpath-ep5-st012-plan.md`.

## Owner decision

Approved by the owner on 2026-08-12:

- Use Option 1.
- `REPLAYED` and abuse metrics are explicit `unavailable`.
- Persisted `DENIED` rows count as quota denials.
- Do not add a migration.
- Do not infer from idempotency keys, request fingerprints, audit rows, or learner data.

EP5-ST012 may resume in place and must implement only the approved server-side
projection and its strict allowlist.

## Story state

EP5-ST012 is unblocked and resumed in place pending implementation and required
verification evidence.
