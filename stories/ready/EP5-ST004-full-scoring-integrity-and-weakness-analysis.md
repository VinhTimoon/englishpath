---
id: EP5-ST004
title: Full scoring, integrity events, and weakness analysis
status: ready
type: backend
priority: highest
phase: phase-5-full-test-adaptive-ai-and-community
depends_on:
  - EP5-ST002
allowed_paths:
  - apps/api/src/modules/toeic/toeic-timed-test.analysis.ts
  - apps/api/src/modules/toeic/toeic-timed-test.models.ts
  - apps/api/src/modules/toeic/toeic-timed-test.service.ts
  - apps/api/src/modules/toeic/toeic-timed-test.repository.ts
  - apps/api/src/modules/toeic/toeic.controller.ts
  - apps/api/src/modules/toeic/toeic.module.ts
  - apps/api/src/modules/toeic/**/*.spec.ts
  - apps/api/test/toeic-timed-test.e2e-spec.ts
  - apps/api/src/modules/audit/**
  - docs/06_BACKEND_ARCHITECTURE.md
  - docs/08_API_CONTRACT.md
  - docs/10_TEST_STRATEGY.md
  - docs/11_SECURITY_PLAN.md
  - docs/13_DECISION_LOG.md
  - stories/**
  - _bmad-output/implementation-artifacts/sprint-status.yaml
  - _bmad-output/planning-artifacts/story-map.md
forbidden_paths:
  - apps/api/.env
  - apps/api/prisma/schema.prisma
  - apps/api/prisma/migrations/**
  - apps/web/**
  - packages/**
  - package.json
  - pnpm-lock.yaml
  - shared Supabase or production data
  - main
requires_human_approval: false
max_fix_rounds: 2
risk: high
delivery_mode: full
---

# Story: Full scoring, integrity events, and weakness analysis

## Goal

Make the existing authenticated timed-test analysis authoritative for the
server-owned FULL session. A learner receives a deterministic practice score,
Part/skill weakness analysis, and time analysis from the persisted session
snapshot, while server-observable replay/conflict/timing integrity signals are
recorded through the existing redacted audit boundary.

## User value

As a learner, I want my completed FULL mock test to show an accurate, useful
breakdown and next weaknesses, so that I can review the right Parts without
trusting client-calculated scores or losing the integrity of my attempt.

## Scope

This story extends the existing timed-test analysis and integrity boundary to
FULL. It preserves MINI/HALF behavior, uses the existing `ToeicTimedTestSession`,
`ToeicTimedTestAnswer`, server policy, and `AuditService`, and adds no database
model or migration. Integrity events are limited to facts already observable at
the server API boundary (for example answer replay/conflict, closed/late answer,
and duplicate/late finalization). No client-authored score, hidden prompt,
navigation telemetry, provider data, or official TOEIC score conversion is added.

## Existing contract and constraints

- EP5-ST002 owns the authenticated FULL session, immutable ordered question
  snapshot, server deadline, answer persistence, and exactly-once finalization.
- EP2-ST009 owns the aggregate analysis contract for MINI/HALF; its response
  shape, rounding, weakness ordering, and redaction remain regression contracts.
- EP2-ST010 owns the owner-scoped Error Notebook capture already invoked after
  finalization. This story does not replace that capture or create a second
  notebook model.
- FULL uses the approved `FULL_MOCK_POLICY` and persisted `policyVersion`; it
  must never use learner-supplied totals, question IDs, answers, or timing.
- The existing `AuditService` is the only approved audit persistence boundary.
  Use its redaction and correlation conventions. Do not write raw answers,
  answer keys, prompts, submitted options, email, tokens, provider details, or
  credentials to audit attributes.
- Analysis remains a practice-simulation projection. It must not claim an
  official TOEIC score or alter learner progress from client input.
- Never run a migration against shared Supabase or production infrastructure.

## Acceptance Criteria

1. A finalized FULL session (`SUBMITTED` or `EXPIRED`) produces a deterministic
   server-owned analysis from its persisted ordered snapshot and answers:
   `score { correct, total: 200, answered }`, bounded accuracy, all populated
   Parts 1-7, LISTENING/READING aggregates, deterministic bounded weaknesses,
   and server-clock time using the approved 7,200-second policy.
2. FULL scoring counts only persisted server-grades and is independent of client
   totals, client time, client claims, or current catalogue ordering. It never
   exposes answer keys, selected options, correctness rows, prompts, source or
   license metadata, user identifiers, provider fields, or internal persistence
   details. No official TOEIC conversion is introduced.
3. Existing MINI/HALF analysis remains behaviorally backward compatible,
   including policy/quota validation, rounding, weakness tie ordering, zero
   answered handling, time clamping, finalized-only access, and remediation
   behavior.
4. The authenticated analysis route remains owner-scoped. A learner cannot read
   another learner's FULL analysis or cause another learner's integrity event or
   Error Notebook data to be returned or mutated.
5. Server-observable integrity conditions at the timed-test boundary are recorded
   through the existing redacted audit service with the authenticated owner,
   session target, correlation linkage, and a bounded allowlisted event action.
   At minimum cover answer replay, answer conflict, closed/late answer, and
   duplicate/late finalization when those paths occur. Repeated requests remain
   idempotent and do not duplicate scoring or mutate the final result.
6. Integrity audit records contain only safe bounded metadata and never contain
   answer content, answer keys, prompts, raw request bodies, credentials,
   provider data, or sensitive learner identity. Audit persistence failure does
   not turn a valid finalized score into a client-authored or partially exposed
   result; failure behavior follows the existing approved audit/error policy.
7. Malformed or incomplete FULL snapshots fail closed with the existing sanitized
   content error contract. They never yield fabricated zero scores, partial Part
   totals, guessed weaknesses, or a successful result that contradicts the
   persisted session.
8. Unit/API regression tests cover FULL score and all-Part/skill analysis,
   server-time clamping, deterministic weakness ordering, finalized-only access,
   owner isolation, malformed snapshot rejection, redaction, integrity event
   actions and safe attributes, replay/conflict/late paths, and unchanged
   MINI/HALF behavior. Existing browser coverage remains green; no frontend
   implementation is added in this story.
9. API documentation, security notes, and decision evidence describe the
   additive FULL analysis and server-observable integrity boundary consistently.
   No Prisma schema, migration, external provider, AI, or Phase 6 change is
   introduced.

## Verification commands

```text
pnpm story:doctor -- stories/in-progress/EP5-ST004-full-scoring-integrity-and-weakness-analysis.md
pnpm planning:traceability
pnpm --filter api exec jest --runInBand src/modules/toeic/toeic-timed-test.analysis.spec.ts src/modules/toeic/toeic-timed-test.service.spec.ts src/modules/toeic/toeic-timed-test.repository.spec.ts src/modules/audit/audit.service.spec.ts
pnpm --filter api exec jest --runInBand test/toeic-timed-test.e2e-spec.ts
pnpm --filter api lint
pnpm --filter api typecheck
pnpm format:check
pnpm story:verify stories/in-progress/EP5-ST004-full-scoring-integrity-and-weakness-analysis.md
pnpm story:checks
git diff --check
```

## Review and risk controls

- `risk: high`; full review is mandatory because this changes scoring,
  authenticated ownership, integrity evidence, and learner remediation state.
- Keep `max_fix_rounds: 2`. If the approved contract is insufficient to define a
  required event or scoring semantic, stop and record the exact owner decision
  instead of guessing.
- Do not create a recovery story or resume historical blocked/superseded stories.
- Do not delete lifecycle evidence when this story moves to `done`.

## Developer notes

- Read the complete timed-test analysis, service, repository, controller/module,
  audit service, EP2-ST009/EP2-ST010 contracts, FULL policy, and tests before
  changing code.
- Keep business rules in the analysis/service layers and persistence in the
  repository/audit boundary. Controllers should only pass authenticated context
  and correlation IDs.
- Use the existing error envelope and strict route behavior. Do not weaken
  authentication, ownership, answer protection, or finalization idempotency.

## Completion note

This is the sole dependency-ready Phase 5 story after EP5-ST003. Phase 6 remains
suspended indefinitely until production has many users.
