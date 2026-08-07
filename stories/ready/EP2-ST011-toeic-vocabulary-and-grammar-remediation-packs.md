---
id: EP2-ST011
title: TOEIC vocabulary and grammar remediation packs
status: ready
type: vertical-slice
priority: high
phase: phase-2-toeic-listening-reading
depends_on:
  - EP2-ST010
allowed_paths:
  - apps/api/src/modules/toeic/**
  - apps/api/src/modules/vocabulary/**
  - apps/api/test/**
  - apps/web/src/app/toeic/test/**
  - apps/web/src/widgets/toeic-timed-test/**
  - apps/web/src/widgets/practice/**
  - apps/web/src/features/toeic-timed-test/**
  - apps/web/src/entities/toeic-timed-test/**
  - apps/web/src/shared/api/**
  - tests/e2e/**
  - tests/unit/**
  - docs/03_USER_FLOWS.md
  - docs/05_FRONTEND_ARCHITECTURE.md
  - docs/06_BACKEND_ARCHITECTURE.md
  - docs/08_API_CONTRACT.md
  - docs/09_UI_DESIGN_SYSTEM.md
  - docs/10_TEST_STRATEGY.md
  - docs/11_SECURITY_PLAN.md
  - docs/13_DECISION_LOG.md
  - stories/**
  - _bmad-output/implementation-artifacts/sprint-status.yaml
  - _bmad-output/planning-artifacts/story-map.md
forbidden_paths:
  - apps/api/.env
  - apps/web/.env
  - apps/api/prisma/schema.prisma
  - apps/api/prisma/migrations/**
  - apps/api/src/generated/**
  - packages/**
  - package.json
  - pnpm-lock.yaml
  - apps/web/src/app/admin/**
  - main
requires_human_approval: false
max_fix_rounds: 2
risk: medium
delivery_mode: full
---

# Story: TOEIC vocabulary and grammar remediation packs

## Goal

After EP2-ST010 has captured finalized TOEIC mistakes in the owner-scoped Error
Notebook, give the learner a small, deterministic set of actionable packs for
the weak Part/skill. Packs must reuse approved vocabulary taxonomy and existing
reviewed grammar material; they must never claim a score conversion or invent
content that is unavailable.

This story completes the remediation portion of Phase 2 `FR-013`, `FR-015`,
`UF-006`, and `UF-008`. It does not add full tests, adaptive AI, licensed
library behavior, or Phase 3 listening features.

## Product and API contract

Extend the finalized TOEIC analysis remediation projection so it can include a
bounded `packs` list while preserving the existing `status`, `count`, and safe
Error Notebook link. A pack is an allowlisted object with only:

- `kind`: `VOCABULARY`, `GRAMMAR`, or `PRACTICE`;
- a stable display `title`, short learner-safe `description`, and internal
  `href`;
- the related Part or skill label when available.

The server may compute packs from the immutable finalized question snapshot,
the server-produced weakness aggregates, and published Error Notebook state.
It must not accept client-authored weakness, taxonomy, score, or session data.
If no matching published content exists, return an explicit empty pack list and
keep the valid finalized analysis available.

Vocabulary packs must use the existing published taxonomy service and its
server-owned `toeicPart`, `track`, `skill`, and `level` filters. Do not copy a
taxonomy list into the web client. Grammar packs may link only to existing
reviewed EnglishPath grammar guides through a fixed internal allowlist; do not
generate explanations or call an AI/provider. Practice packs must link to the
existing TOEIC practice surface using catalogue-supported filters, not guessed
Parts or difficulties.

The projection remains available only for an owner-visible `SUBMITTED` or
`EXPIRED` timed session. Active sessions, missing/invalid snapshots, and
cross-owner IDs retain existing sanitized TOEIC errors. The response must not
contain answer keys, selected options, correctness flags, question IDs, raw
answers, user IDs, governance metadata, provider fields, or client timing.

## Acceptance Criteria

1. Extend the existing TOEIC controller/service/repository boundaries (or a
   dedicated pure remediation policy used by them) to produce deterministic,
   bounded packs for finalized MINI and HALF analysis. Controllers remain
   transport-only and all content selection is owner-safe and server-owned.

2. Select vocabulary packs from currently published, public-learning taxonomy
   nodes matching a real weak Part/skill. Select grammar packs only from the
   approved internal guide allowlist and only when the weakness maps to a
   grammar-relevant reading Part. Select practice packs only when the
   server-side catalogue has a matching available Part/filter. Stable ordering,
   maximum pack count, duplicate removal, and no-content behavior are explicit
   and tested.

3. Preserve EP2-ST010 behavior: Error Notebook capture remains idempotent and
   owner-scoped, the existing remediation status/link remains compatible, and
   a pack-generation failure cannot erase a valid finalized score or analysis.

4. Extend the `/toeic/test` final-result UI and any existing Error Notebook
   entry point to display pack title, purpose, and keyboard-accessible internal
   links. Provide loading, empty, unavailable, retryable error, and success
   states in Vietnamese. Keep the UI useful at 360px, with approved design
   tokens, visible focus, and reduced-motion behavior.

5. Add backend unit/repository/API E2E, frontend contract/unit, and browser
   coverage for MINI/HALF, listening and reading weaknesses, vocabulary matches,
   grammar allowlist matches, missing content, repeated reads, active/owner
   isolation, malformed/private-field rejection, provider-free operation,
   loading/error/empty/success states, keyboard access, mobile layout, and axe
   checks. No test may require credentials, network, or a shared database.

6. Update the approved user-flow, API, architecture, UI, security, decision-log,
   and test-strategy documents with the actual pack contract, content eligibility
   rules, disclosure boundary, and verification evidence. Do not add a schema,
   migration, generated Prisma output, external provider, credential, or
   production deployment.

## Technical guardrails

- Reuse `ToeicTimedTestService`, `buildTimedTestAnalysis`, the existing
  `AuthenticationGuard`, `ApplicationPrincipal`, safe question projection, and
  EP2-ST010 capture path.
- Reuse `VocabularyService`/published taxonomy eligibility rather than reading
  raw governance fields into a learner response. If the TOEIC module needs the
  service, expose the existing provider through `VocabularyModule` without
  creating a second vocabulary repository.
- Keep the grammar allowlist as reviewed application content; do not infer
  grammar correctness from an answer key in the browser.
- Do not add client-side Part, topic, difficulty, or taxonomy constants beyond
  labels needed to render server-provided values.
- Preserve thin Next.js routes and the existing contract-parser disclosure
  checks. Never render server-private fields even if an unexpected response
  contains them.

## Verification commands

- `pnpm --filter api exec prisma validate --schema prisma/schema.prisma`
- `pnpm --filter api exec jest --runInBand src/modules/toeic src/modules/vocabulary`
- `pnpm --filter api test:e2e -- --runInBand --testPathPatterns=toeic-timed-test`
- `node tests/unit/toeic-timed-test.unit.mjs`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm format:check`
- `pnpm planning:traceability`
- `node scripts/story-doctor.mjs stories/in-progress/EP2-ST011-toeic-vocabulary-and-grammar-remediation-packs.md`
- `pnpm story:verify stories/in-progress/EP2-ST011-toeic-vocabulary-and-grammar-remediation-packs.md`
- `pnpm e2e`
- `git diff --check`

## Risk and review

Risk is medium because this changes learner-facing API/UI behavior and links
weaknesses to study content. Full planning, targeted backend/API/browser tests,
contract disclosure checks, and review are required. Do not use the fast path.

## Dependency and lifecycle notes

EP2-ST010 owns the generalized Error Notebook source discriminator, finalized
capture, and safe remediation status. This story must not resume any historical
blocked or superseded story and must not create EP2-ST012 until it is done.

## Completion evidence requirements

Record the actual planning/build/review outcomes, exact test counts, pack
eligibility and disclosure evidence, browser/mobile/accessibility evidence, and
any unverified external deployment or provider work. A timeout or missing check
is evidence of not verified, never a pass.
