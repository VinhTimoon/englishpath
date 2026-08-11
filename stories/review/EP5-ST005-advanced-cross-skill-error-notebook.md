---
id: EP5-ST005
title: Advanced cross-skill Error Notebook projection
status: review
type: backend
priority: highest
phase: phase-5-full-test-adaptive-ai-and-community
depends_on:
  - EP5-ST004
  - EP3-ST008
  - EP4-ST009
allowed_paths:
  - apps/api/src/modules/practice/practice.models.ts
  - apps/api/src/modules/practice/practice.ports.ts
  - apps/api/src/modules/practice/practice.service.ts
  - apps/api/src/modules/practice/prisma-practice.repository.ts
  - apps/api/src/modules/practice/practice.controller.ts
  - apps/api/src/modules/practice/dto/practice.dto.ts
  - apps/api/src/modules/practice/**/*.spec.ts
  - apps/api/src/modules/toeic/toeic-timed-test.repository.ts
  - apps/api/src/modules/toeic/**/*.spec.ts
  - apps/api/test/**/*.e2e-spec.ts
  - docs/06_BACKEND_ARCHITECTURE.md
  - docs/07_DATABASE_DESIGN.md
  - docs/08_API_CONTRACT.md
  - docs/10_TEST_STRATEGY.md
  - docs/11_SECURITY_PLAN.md
  - docs/13_DECISION_LOG.md
  - stories/**
  - _bmad-output/implementation-artifacts/sprint-status.yaml
  - _bmad-output/planning-artifacts/story-map.md
forbidden_paths:
  - apps/api/prisma/schema.prisma
  - apps/api/prisma/migrations/**
  - apps/web/**
  - packages/**
  - package.json
  - pnpm-lock.yaml
  - apps/api/.env
  - shared Supabase or production data
  - main
requires_human_approval: false
max_fix_rounds: 2
risk: high
delivery_mode: full
---

# Story: Advanced cross-skill Error Notebook projection

## Goal

Make the existing private Error Notebook useful as a server-owned cross-source
review surface for the learner's validated mistakes. Preserve the existing
entry list and pagination contract while adding a bounded aggregate projection
that distinguishes available evidence from unavailable skills. The projection
must be derived from persisted owner-scoped notebook data and approved metadata;
it must never invent speaking/writing errors, recurrence, due dates, or scores.

## User value

As a learner, I want my TOEIC, daily-practice, and other validated mistakes
organized into a safe review summary, so that I can focus on real weaknesses
without seeing fabricated progress or losing the existing notebook entries.

## Scope

This story extends the authenticated practice Error Notebook API only. The
existing `GET /api/v1/quiz/session/summary/errors` response remains backward
compatible and gains one additive server-owned `coverage` projection.
TOEIC Part metadata may be read from the immutable governed question version
already referenced by a TOEIC notebook entry. Daily-practice entries retain
their existing safe source classification unless an existing approved fixture
metadata contract supplies a stronger classification. Speaking and Writing
must be represented explicitly as unavailable when no approved Error Notebook
source exists; no synthetic entry or zero-valued performance is returned.

No frontend, AI, provider, feedback, submission persistence, roadmap mutation,
new persistence model, schema change, migration, or production data operation
belongs to this story.

## Existing contracts and constraints

- EP2-ST010 owns `ErrorNotebookEntry` source/reference ownership, finalized-only
  TOEIC capture, idempotency, private pagination, and owner isolation. Preserve
  practice rows and the source/reference check.
- EP2-ST011 owns the existing bounded remediation-pack projection. Do not
  replace, reorder, or widen its allowlist.
- EP3-ST008 and EP4-ST009 are dependency evidence only. Do not read raw media,
  recordings, provider results, rubric internals, or submission contents for
  this story.
- EP5-ST004 owns FULL scoring and weakness analysis. This story consumes only
  persisted Error Notebook entries; it does not recalculate exam scores or
  duplicate timed-test analysis.
- All queries must derive the authenticated `applicationUserId` and enforce it
  in every repository lookup. Unknown and non-owned records use the existing
  sanitized behavior.
- Sensitive fields remain server-only: answer keys, selected options, raw
  prompts where the existing API does not already expose them, question-version
  governance, license/provenance, user identifiers, provider data, credentials,
  rubric internals, and submission contents.
- If an approved contract does not define a classification or recurrence
  semantic, return an explicit unavailable state for that field. Do not guess
  from question IDs, task types, aggregate counts, or client assumptions.

## Acceptance Criteria

1. The authenticated Error Notebook endpoint preserves the existing entries,
   pagination, source filter, remediation links, ordering, loading/error
   semantics, and owner scope. Existing clients can ignore the additive
   projection without changing behavior.
2. The response adds a bounded server-owned coverage projection for the known
   learning domains. Its exact additive shape is:
   `coverage.domains` in deterministic order
   `GENERAL`, `LISTENING`, `READING`, `SPEAKING`, `WRITING`, where every domain
   contains only `{ domain, state, entryCount }`. `state` is `available` when
   validated entries exist, `empty` when the domain is supported but has no
   entries, and `unavailable` when no approved evidence/classification exists;
   unavailable never becomes zero progress, completed, or a fabricated error
   count. Coverage is an overall owner summary and is not narrowed by the
   optional entry `source` filter.
3. TOEIC Listening/Reading coverage is derived only from owner-scoped persisted
   notebook entries and approved immutable question metadata. Part mapping and
   source grouping are deterministic, bounded, and do not expose question
   governance, answer keys, selected options, provider fields, or raw private
   persistence details. If any TOEIC entry in the owner's notebook cannot be
   joined to valid immutable Part metadata, both TOEIC domains are returned as
   `unavailable` with `entryCount: 0`; valid partial counts are not exposed.
4. Daily-practice entries map only to `GENERAL`; the API never claims a more
   specific skill than the existing approved practice metadata supports. It
   does not infer skill from an ID, prompt, or answer.
5. Speaking and Writing are explicit `unavailable` when no approved notebook
   source/evidence exists. The API does not manufacture entries from feedback,
   submissions, rubric values, provider outcomes, or task presence.
6. `entryCount` is the only aggregate in this story and is computed from
   persisted owner-scoped entries only. Recurrence, scheduling, scores, and
   due dates are intentionally not added because no approved policy exists.
7. Repository and service tests prove owner isolation, source filtering,
   deterministic ordering, pagination compatibility, empty versus unavailable
   states, safe TOEIC metadata mapping, malformed/missing metadata fail-closed
   behavior, and sensitive-field absence. Existing practice and TOEIC notebook
   capture/remediation tests remain green.
8. API/E2E coverage proves an authenticated learner can read the additive
   projection, a second learner cannot observe the first learner's entries or
   summary, and missing Speaking/Writing evidence is explicit rather than
   fabricated. No browser implementation is added.
9. API models/OpenAPI and backend/security/test documentation describe the
   additive projection consistently. No Prisma schema/migration or unrelated
   module is changed.

## Required implementation investigation

Before editing, inspect the complete current implementation and tests for:

- `practice.models.ts`, `practice.ports.ts`, `practice.service.ts`,
  `prisma-practice.repository.ts`, controller, DTO, and their tests;
- EP2-ST010 and EP2-ST011 done-story contracts and the current Prisma ownership
  model;
- TOEIC question-version fields and the existing safe/finalized repository
  access pattern;
- EP3-ST008/EP4-ST009 output contracts only to confirm that no approved
  speaking/writing Error Notebook source exists for this story.

The additive field name, canonical domain order, states, and count semantics
above are the minimal learner-safe contract for this story. Do not add further
business semantics. If implementation discovers that even this projection
cannot be derived from existing persisted data without a schema/provider change,
stop with the exact technical blocker and do not guess.

## Verification commands

```text
node scripts/story-doctor.mjs stories/in-progress/EP5-ST005-advanced-cross-skill-error-notebook.md
pnpm planning:traceability
pnpm --filter api exec jest --runInBand src/modules/practice/practice.service.spec.ts src/modules/practice/prisma-practice.repository.spec.ts src/modules/toeic/toeic-timed-test.service.spec.ts
pnpm --filter api test:e2e -- --runInBand practice.e2e-spec.ts toeic-timed-test.e2e-spec.ts
pnpm --filter api lint
pnpm --filter api typecheck
pnpm format:check
pnpm story:verify stories/in-progress/EP5-ST005-advanced-cross-skill-error-notebook.md
pnpm story:checks
git diff --check
```

## Review and risk controls

- `risk: high`; full review is mandatory because this changes private learner
  data projections, ownership, and remediation evidence.
- `max_fix_rounds: 2`; do not loop indefinitely. Split only if a concrete
  independent scope boundary is discovered, and preserve this story as history.
- Do not delete blocked, superseded, recovery, or done story evidence.
- Phase 6 remains suspended indefinitely until production has many users.

## Completion note

Created as the single dependency-ready Phase 5 story after EP5-ST004. No other
Phase 5 story is made ready concurrently.

## Review Evidence

- Story doctor, planning traceability, story verification, and `git diff --check`
  passed.
- Targeted unit coverage passed: 3 suites, 57 tests. Targeted API E2E coverage
  passed: 4 suites, 42 tests, including authenticated coverage, owner scope,
  OpenAPI shape, source-filter independence, and fail-closed metadata behavior.
- API lint and typecheck, workspace format check, Prisma validation, full
  workspace lint/typecheck, and full build passed.
- Full quality gate passed: 73 API unit suites / 529 tests, 23 API E2E suites /
  129 tests, and 104 browser tests; tooling, planning traceability, and all
  available checks passed.
- Required direct Codex review passed with no P0/P1 findings and no scope
  findings. The remaining P2 note is that the aggregate SQL join is mocked in
  tests; no shared database integration was run, by design.
- The implementation uses one bounded owner-scoped aggregate query and selects
  only safe aggregate fields. No schema, migration, frontend, provider, AI,
  feedback, rubric, submission, credential, or Phase 6 change was introduced.
