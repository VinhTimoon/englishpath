---
id: EP4-ST011-BLOCKER
title: Learner-safe Four Skills progress projection
status: blocked
type: api-request
priority: high
depends_on:
  - EP4-ST010
allowed_paths:
  - apps/api/src/modules/roadmap/**
  - apps/api/tests/**
  - docs/06_BACKEND_ARCHITECTURE.md
  - docs/08_API_CONTRACT.md
  - stories/**
forbidden_paths:
  - apps/web/.env*
  - apps/api/.env
requires_human_approval: false
---

# Blocker: Learner-safe Four Skills progress projection

## Reason

EP4-ST011 cannot be implemented safely from the currently available learner
response. `GET /api/v1/roadmaps/current` returns roadmap items and aggregate
roadmap counts, but it does not expose the EP4-ST010 learner-safe projection for
each of Reading, Listening, Speaking, and Writing.

The dashboard requires server-owned values for each fixed skill: `completed`,
`target`, availability, and the approved balance explanation. The frontend must
not derive those values from task types, aggregate counts, or missing activity
pools because that would create a second progress truth and could present
Speaking/Writing as completed or fabricated zero work.

## Required API contract

Expose an authenticated, owner-scoped learner response, either as part of the
roadmap response or a dedicated endpoint, containing only the approved fields:

- `skill`: `READING | LISTENING | SPEAKING | WRITING`
- `activityKind`
- bounded server-owned `target`
- approved learner-safe `reference` when available
- `allocationReason`
- `completionState`, including an explicit unavailable state when no approved
  Speaking/Writing pool exists
- server-owned completed value if completion is represented separately from
  `completionState`

The response must be deterministic, preserve owner isolation, and exclude
provider fields, rubric internals, answer keys, raw claims, submissions, and
official scores. The existing roadmap/today response and navigation semantics
must remain compatible.

## Acceptance tests for the API request

- Authenticated learners receive exactly the four canonical skills in a safe
  learner projection.
- Missing Speaking/Writing references are explicitly unavailable, not zero.
- Unknown/private fields are not serialized.
- A learner cannot read another learner's projection.
- Empty, unauthorized, and unavailable states are distinguishable and retry-safe.

Until this contract exists, EP4-ST011 remains blocked and no frontend
dashboard implementation should be added.
