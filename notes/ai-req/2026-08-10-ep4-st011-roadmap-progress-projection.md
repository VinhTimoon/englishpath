# AI Request: EP4-ST011 learner-safe Four Skills progress projection

## Decision needed

Approve an additive, authenticated, owner-scoped API projection for the Four
Skills dashboard, exposed by the roadmap service or a dedicated roadmap
endpoint, with server-owned availability/completion semantics.

## Why this is required

`GET /api/v1/roadmaps/current` currently exposes roadmap items and aggregate
counts only. It does not expose the EP4-ST010 learner-safe per-skill fields
needed by a dashboard: canonical skill, activity kind, bounded target,
approved reference, allocation reason, completion state, and explicit
unavailable state for missing Speaking/Writing pools.

The frontend must not derive progress from task types or aggregate counts;
doing so would create a second source of truth and could represent unavailable
Speaking/Writing work as zero or completed.

## Impact and risks

Without this projection, EP4-ST011 cannot be implemented safely. Adding it
requires backend API and regression work outside the current frontend story
scope. Guessing values risks inaccurate learner progress, cross-owner leakage,
and accidental exposure of provider/rubric/submission data. No paid provider or
external credential is required.

## Options

1. Extend the authenticated roadmap response with the four fixed,
   allowlisted, owner-scoped projections and explicit unavailable state;
   preserve existing roadmap/today fields and add API/E2E regression coverage.
   **Recommended.**
2. Add a dedicated authenticated Four Skills progress endpoint with the same
   projection and ownership contract, leaving the existing response unchanged.
3. Defer the dashboard until a later backend story defines and implements the
   projection. Keep EP4-ST011 blocked and do not infer client-side progress.

## Recommendation

Choose Option 1 for the smallest vertical slice, unless API compatibility
requires Option 2. Choose Option 3 if owner/product approval is needed before
expanding the approved API contract.

## How work continues after approval

Resume EP4-ST011 in place only after the API contract is approved. Implement
the minimal backend projection in the roadmap service/repository boundary,
then resume the dashboard with safe mapping, responsive states, and browser
coverage. Do not create a recovery story.

## Technical evidence

- Blocked loop commit: `7b91a14`.
- EP4-ST010 policy/projection: `apps/api/src/modules/roadmap/four-skills.balance.ts`.
- Current roadmap response: `apps/api/src/modules/roadmap/roadmap.service.ts` and
  `apps/api/src/modules/roadmap/roadmap.models.ts`; it contains only items and
  aggregate today counts.
- No frontend files were changed; the loop stopped before implementation.

## Owner decision

Approved Option 1: extend the authenticated `GET /api/v1/roadmaps/current`
response with the minimal learner-safe Four Skills projection. Preserve all
existing fields and behavior, keep ownership server-side, and represent
unavailable Speaking/Writing pools explicitly without fabricated values.
