---
id: EP5-ST001
title: Full mock test assembly and versioned blueprint boundary
status: review
type: backend
priority: highest
phase: phase-5-full-test-adaptive-ai-and-community
depends_on:
  - EP4-ST012
allowed_paths:
  - apps/api/src/modules/toeic/full-mock-test/**
  - apps/api/src/modules/toeic/toeic-eligibility.policy.ts
  - apps/api/src/modules/toeic/toeic-question.models.ts
  - apps/api/src/modules/toeic/toeic.module.ts
  - apps/api/src/modules/toeic/**/*.spec.ts
  - apps/api/test/**
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
  - apps/api/.env
  - apps/api/src/generated/**
  - apps/api/prisma/migrations/**
  - apps/web/**
  - packages/**
  - package.json
  - pnpm-lock.yaml
  - main
requires_human_approval: false
max_fix_rounds: 2
risk: high
delivery_mode: full
---

## Recovery Review Evidence

- The first loop attempt was blocked by the Windows read-only review runner failing to start (`CreateProcessWithLogonW failed: 2`), not by an implementation or quality-gate failure.
- Recovery review was run against the complete delta from baseline `2b54147`, including new files, with Codex CLI in read-only mode.
- Recovery review result: `Status: pass`; no P0/P1 findings.
- Full story checks passed on 2026-08-11, including lint, typecheck, unit/integration tests, build, Prisma validation, API E2E, browser E2E (99 passed), planning traceability, story doctor, story verification, format check, and `git diff --check`.

# Story: Full mock test assembly and versioned blueprint boundary

## Goal

Create the server-owned, versioned full-mock blueprint and deterministic assembly
boundary required by the later authenticated exam session story. The boundary must
select only governed TOEIC question versions, preserve an immutable ordered snapshot
of version IDs for a future session, and fail closed when the approved catalogue
cannot satisfy the complete blueprint. This story does not start a learner session,
persist an attempt, score an attempt, expose a route, or add a browser UI.

## Product and policy boundary

This is Phase 5 `UF-012` / `FR-023` foundation work. A full mock is a practice
simulation, not an official TOEIC score or an official exam delivery service. The
backend owns the blueprint version, duration, Part quotas, selection ordering, and
eligibility predicate. The client must not be able to provide or override any of
those values.

The blueprint uses the standard full TOEIC Listening & Reading shape already implied
by the product's Parts 1-7 model: 200 questions, 120 minutes, with fixed Part quotas
of Part 1 = 6, Part 2 = 25, Part 3 = 39, Part 4 = 30, Part 5 = 30, Part 6 = 16, and
Part 7 = 54. These values are a server-owned product policy for this beta boundary;
they do not authorize official score conversion or claim official test provenance.
Changing any value requires a new blueprint version and regression evidence.

## Scope

Implement an isolated pure policy/assembly boundary under the NestJS TOEIC module.
Reuse the existing reviewed/published/license/source/access eligibility predicate
and the existing newest-version-per-canonical-question rule. The assembler receives
an injected eligible private catalogue and returns either a versioned private
assembly or a typed insufficient-catalogue result. It must not read Drive, call a
provider, invent fallback questions, duplicate a canonical question, or silently
substitute MINI/HALF content policy.

The returned internal assembly must contain only the data needed by the later
session service: blueprint version, total, duration, ordered selected version IDs,
and bounded Part counts. A separate learner-safe projection is not exposed by this
story because no HTTP endpoint is introduced. Private question records may retain
answer keys only inside the backend assembly input/grading boundary and must never be
serialized into a future learner response.

## Acceptance Criteria

- A frozen full-mock policy is exported with one explicit version identifier, total
  200, duration 7,200 seconds, Listening/Reading totals of 100/100, and the exact
  Part 1-7 quotas documented above; policy objects and quota maps are immutable.
- The policy validator proves the seven quotas sum to the total, Parts 1-4 sum to
  Listening 100, Parts 5-7 sum to Reading 100, all quotas are positive integers, and
  the duration is positive. Invalid policy input fails closed with a typed domain
  error rather than being normalized or guessed.
- The assembler accepts only backend-provided private eligible question records and
  the server-owned full policy. It selects exactly one newest eligible version per
  canonical question before quota allocation, never selects the same canonical
  question twice, and preserves deterministic ordering within every Part by
  canonical question ID, version descending, then version ID.
- Assembly allocates exactly the configured quota for every Part. If any Part lacks
  enough eligible canonical questions, the whole assembly returns an explicit
  `INSUFFICIENT_CATALOGUE` result with missing Part/count evidence safe for backend
  diagnostics; it returns no partial assembly and invents no content.
- The successful assembly is immutable and contains the blueprint version, total,
  duration, ordered selected version IDs, and deterministic per-Part counts. It does
  not contain source URLs, checksums, rights/reviewer evidence, provider locators,
  credentials, learner IDs, selected answers, correctness, or an official score.
- Assembly output is stable for the same policy version and eligible snapshot. A
  changed policy version cannot be silently replayed as the previous version, and a
  duplicate canonical question or malformed private record is rejected rather than
  being silently repaired.
- The boundary is not registered as a learner HTTP route in this story. Existing
  MINI/HALF routes and policies remain backward compatible and continue to reject
  `FULL` as an input until EP5-ST002 owns authenticated full-session behavior.
- Unit and repository-boundary tests cover policy invariants, deterministic ordering,
  newest-version deduplication, every Part quota, exact 200-question assembly,
  insufficient and malformed catalogues, duplicate canonical IDs, immutability,
  forbidden-field absence, and compatibility of the existing MINI/HALF policy.
  Tests use explicit fixtures only and do not use real credentials, Drive, storage,
  providers, network, or a shared database.
- The backend, database, API, security, decision, and test-strategy documents record
  this additive policy/assembly boundary and explicitly state that persistence,
  server timing, finalization, scoring, integrity events, routes, and learner UI
  belong to EP5-ST002 through EP5-ST004. No Prisma schema or migration is changed by
  this story.

## Technical guardrails

- Keep controllers thin; this story should not add a controller or route. Put pure
  policy in `full-mock-test` and inject any catalogue dependency through an existing
  boundary or a narrow local port.
- Reuse `toeicEligibleWhere` semantics and `selectNewestByCanonical` behavior. Do not
  create a second source/license/publication predicate or accept client taxonomy.
- Do not change `ToeicTimedTestMode`, the existing timed-test persistence models, or
  generated Prisma output. EP5-ST002 will own the additive full-session persistence
  design after this boundary is reviewed.
- Do not create or copy TOEIC questions, answer keys, audio, transcripts, Drive files,
  or licensed assets. Existing reviewed fixtures/catalogue rows are the only input.
- Do not implement adaptive roadmap logic, Error Notebook changes, AI explanation,
  speaking/writing rooms, community, moderation, quota dashboards, or Phase 6 work.

## Verification

- `pnpm story:doctor -- stories/ready/EP5-ST001-full-mock-test-assembly-and-versioning.md --ready-only`
- `pnpm --filter api exec jest --runInBand src/modules/toeic/full-mock-test`
- `pnpm --filter api exec jest --runInBand src/modules/toeic/toeic-timed-test.policy.spec.ts src/modules/toeic/toeic-timed-test.selection.spec.ts`
- `pnpm --filter api exec prisma validate --schema prisma/schema.prisma`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm --filter api test:e2e -- --runInBand`
- `pnpm build`
- `pnpm format:check`
- `pnpm planning:traceability`
- `git diff --check`
- `pnpm story:verify stories/in-progress/EP5-ST001-full-mock-test-assembly-and-versioning.md`
- `pnpm e2e`

## Risk and review

Risk is high because this boundary determines assessment content selection and later
exam integrity. Delivery mode is full. Planning, implementation, independent review,
full quality gates, and negative disclosure tests are mandatory. No fast-path merge
is allowed.

## Dependency and lifecycle notes

EP4-ST012 is the completed dependency root. Only this story may be in `ready` for
Phase 5 at the start of execution. EP5-ST002 must consume this approved assembly
contract and must not reimplement the blueprint or make `FULL` available through the
existing MINI/HALF endpoints. EP5-ST003 and later stories remain backlog until their
dependencies pass.



## Blocked Report

- Failed step: "node" "scripts/codex-runner.mjs" "review" ".codex-review-task.md"
- Exit code: 42
- Attempts: 1
- Summary: The automated loop produced a valid blocked outcome and stopped without further retries.

### Evidence

```text
Child process returned blocked exit code 42.
Command failed with exit code 42: "node" "scripts/codex-runner.mjs" "review" ".codex-review-task.md"
```
