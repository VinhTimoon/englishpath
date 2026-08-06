---
id: EP1-ST036
title: Review Quiz and Daily Sentence Seed Baseline
status: review
type: content
priority: high
phase: phase-1-learning-core
risk: high
delivery_mode: full-review
depends_on:
  - EP1-ST029
allowed_paths:
  - apps/api/src/modules/practice/practice.fixture.ts
  - apps/api/src/modules/practice/practice-content.spec.ts
  - apps/api/src/modules/practice/practice.service.spec.ts
  - apps/api/src/modules/daily-sentence/daily-sentence.service.spec.ts
  - apps/api/src/modules/daily-sentence/daily-sentence-seed.spec.ts
  - apps/api/prisma/migrations/20260720120000_daily_sentence/migration.sql
  - docs/07_DATABASE_DESIGN.md
  - docs/08_API_CONTRACT.md
  - docs/10_TEST_STRATEGY.md
  - _bmad-output/planning-artifacts/story-map.md
  - _bmad-output/implementation-artifacts/sprint-status.yaml
  - stories/ready/EP1-ST036-reviewed-quiz-and-daily-sentence-seed-baseline.md
  - stories/in-progress/EP1-ST036-reviewed-quiz-and-daily-sentence-seed-baseline.md
  - stories/review/EP1-ST036-reviewed-quiz-and-daily-sentence-seed-baseline.md
  - stories/done/EP1-ST036-reviewed-quiz-and-daily-sentence-seed-baseline.md
  - stories/blocked/EP1-ST036-reviewed-quiz-and-daily-sentence-seed-baseline.md
forbidden_paths:
  - apps/api/prisma/schema.prisma
  - apps/api/src/generated/**
  - apps/api/.env
  - apps/web/**
  - "**/package.json"
  - "**/pnpm-lock.yaml"
  - packages/**
  - provider configuration
  - production credentials
  - destructive migrations
  - main
max_fix_rounds: 2
requires_human_approval: false
---

# Story: Review Quiz and Daily Sentence Seed Baseline

## Goal

As a Vietnamese learner, I want the daily quiz and sentence prompts to be reviewed,
traceable, and useful, so that the Phase 1 beta has dependable practice content.

## Scope

- Govern the existing five-card daily-practice fixture with EnglishPath-original
  provenance, `CC0-1.0`, deterministic reviewed/published metadata, and stable IDs.
- Preserve the five-card daily session contract and keep correct options and
  explanations server-only until answer submission.
- Prove the existing twenty daily-sentence seeds are stable, unique, original,
  reviewed, published, and available without external credentials.
- Keep the existing daily-sentence assignment, answer protection, idempotency, and
  learner progress behavior unchanged.

## Acceptance Criteria

1. Exactly five quiz cards remain in the Phase 1 daily session with stable unique IDs,
   three valid options each, an unambiguous server-owned correct option, useful
   Vietnamese/English explanation, and deterministic reviewed/published provenance.
2. Quiz start and pre-answer projections contain no correct option, explanation,
   review metadata, or other answer-key material; existing server grading and private
   error capture remain unchanged.
3. Exactly twenty daily-sentence seeds are asserted from the existing migration with
   stable unique IDs, non-empty prompts/answers, EnglishPath-original `CC0-1.0`
   provenance, `REVIEWED` review state, and `PUBLISHED` publication state.
4. Tests cover content invariants, quiz redaction, server grading, daily-sentence
   redaction, owner/idempotency regressions, API E2E, and learner browser regressions.
5. Documentation records the credential-free reviewed seed baseline. No schema,
   frontend, dependency, provider, credential, destructive SQL, or SRS contract
   change is introduced.

## Developer Context

- `practice.fixture.ts` is the authoritative Phase 1 quiz source; the repository
  persists only question IDs and learner answers, so answer keys must not be moved to
  a browser-facing projection.
- The daily-sentence migration already owns twenty governed rows. Tests must parse or
  otherwise inspect the migration without applying it to shared infrastructure.
- Keep controller -> service -> repository boundaries and existing DTO contracts.
- Use the existing Jest and Playwright harness; do not add dependencies or weaken a
  gate to make the content pass.

## Verification

- `node scripts/story-doctor.mjs stories/ready/EP1-ST036-reviewed-quiz-and-daily-sentence-seed-baseline.md --ready-only`
- `pnpm story:verify stories/ready/EP1-ST036-reviewed-quiz-and-daily-sentence-seed-baseline.md`
- `pnpm format:check`
- `pnpm planning:traceability`
- `pnpm tool:test`
- `pnpm prisma:validate`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm --filter api test:e2e -- --runInBand`
- `pnpm build`
- `pnpm e2e`
- `git diff --check`

## Review Requirements

- Full adversarial review is required because this story touches answer-key handling
  and reviewed learning content.
- Review must explicitly check no pre-answer answer leak, no altered score/progress
  rule, no changed sentence assignment/idempotency rule, and no unapproved content
  source or license claim.

## Completion Evidence

- Story doctor and story verification passed.
- Targeted content/security tests passed: 4 suites, 11 tests; lint, typecheck, and
  diff check passed.
- Full gates passed: formatting, planning traceability, tool tests (59/59), Prisma
  validation, lint, typecheck, unit tests (38 suites/298 tests), API and web builds,
  and browser E2E (46/46).
- Manual adversarial review found no P0/P1: the fixture metadata remains backend-only,
  the start projection is explicitly allowlisted, server grading/error capture and
  daily-sentence assignment/idempotency are unchanged, and no external content or
  credentials were introduced.
- The Codex CLI review command was invoked twice with the generated ST036 prompt, but
  both terminal results incorrectly evaluated stale historical ST063 context and are
  not counted as a pass. The scope was instead verified read-only against this exact
  story and the full gates above; no code finding was reported for ST036.

## Lifecycle Note

This is the existing Phase 1 backlog story, not a recovery story. Any historical
blocked story remains closed as evidence and must not be resumed through this story.
