---
id: EP4-ST010
title: TOEIC Four Skills Roadmap Balance Rules
status: done
type: backend
priority: high
phase: phase-4-toeic-speaking-writing-and-four-skills
depends_on:
  - EP1-ST015
  - EP4-ST001
allowed_paths:
  - apps/api/src/modules/roadmap/**
  - apps/api/src/modules/toeic/**
  - apps/api/test/**
  - docs/01_PRODUCT_SCOPE.md
  - docs/06_BACKEND_ARCHITECTURE.md
  - docs/08_API_CONTRACT.md
  - docs/10_TEST_STRATEGY.md
  - docs/11_SECURITY_PLAN.md
  - stories/**
  - _bmad-output/implementation-artifacts/sprint-status.yaml
  - _bmad-output/planning-artifacts/story-map.md
forbidden_paths:
  - apps/api/.env
  - apps/api/prisma/**
  - apps/api/src/modules/auth/**
  - apps/api/src/modules/ai-gateway/**
  - apps/api/src/modules/library/**
  - apps/api/src/modules/practice/**
  - apps/web/**
  - package.json
  - pnpm-lock.yaml
  - .github/**
  - main
requires_human_approval: false
max_fix_rounds: 2
risk: medium
delivery_mode: full
---

# Story: TOEIC Four Skills Roadmap Balance Rules

## Goal

Give the server a deterministic, explainable way to balance Reading, Listening,
Speaking, and Writing activities in a learner roadmap while preserving the
existing roadmap ownership, versioning, and today-progress contracts.

## Scope

Add pure balance rules and roadmap projection support using the existing
versioned roadmap engine and the EP4-ST001 skill/task vocabulary. The rules must
select approved activity references and explain the skill balance without
creating Speaking/Writing submissions, AI feedback, recording storage, a new
taxonomy, or a second progress store. Keep this story schema-free and
credential-free.

## Acceptance Criteria

- The server recognizes exactly the four approved skill buckets and rejects
  unknown, duplicate, or contradictory skill metadata. A deterministic balance
  policy produces bounded daily/roadmap allocations from the existing roadmap
  version and learner evidence without depending on wall-clock randomness or AI.
- Balance preserves existing required core activities, does not silently remove
  due vocabulary/daily practice work, and gives Speaking/Writing only approved
  task references from the server contract. It must not fabricate a task,
  prompt, official score, or submission state when no approved activity exists.
- Recalculation is versioned and idempotent for the same input evidence/policy
  version. A changed policy or evidence produces an explicit new roadmap
  version/reason rather than mutating historical today/progress state.
- API/service projections expose only learner-safe skill, activity kind, bounded
  target/reference, allocation reason, and completion state. No provider fields,
  answer keys, rubric internals, raw claims, or another learner's progress is
  returned.
- Add unit and API coverage for balanced/underrepresented skills, empty and
  unavailable skill pools, deterministic ordering, version/recalculation,
  ownership boundaries, invalid metadata, and regression of existing roadmap
  and today journeys. No migration or external provider is required.
- Update approved product/backend/API/test/security documentation with the
  Four Skills balance invariants and explicit separation from official scoring,
  submissions, recording, and AI feedback.
- If the work needs a product decision on weights, licensed task content,
  production data, AI/paid provider, or a forbidden schema/auth change, create
  an AI request and block this story instead of assuming approval.

## Verification

- `node scripts/story-doctor.mjs stories/in-progress/EP4-ST010-four-skills-roadmap-balance-rules.md`
- `pnpm story:verify stories/in-progress/EP4-ST010-four-skills-roadmap-balance-rules.md`
- `pnpm --filter api test -- --runInBand "roadmap|toeic|access"`
- `pnpm --filter api test:e2e -- roadmap.e2e-spec.ts toeic-practice.e2e-spec.ts`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm e2e`
- `git diff --check`

## Implementation Guardrails

- Keep roadmap controller -> service -> engine/repository boundaries and reuse
  existing roadmap version/recalculation ownership checks. Do not put balance
  business logic in controllers or invent frontend-only allocation.
- Use stable policy/version identifiers and explicit tie-breaking. Do not use
  Math.random, current time as a hidden input, client-submitted weights, or AI
  output to determine allocations.
- Preserve existing learner progress and daily practice semantics. No Prisma,
  auth, library, practice, AI gateway, frontend, package, `.env`, CI, or
  production deployment changes.

## Definition of Done

Four Skills balance is deterministic, bounded, explainable, owner-safe,
regression-tested, documented, and ready for later submission/feedback/UI
stories without claiming official scores or requiring blocked Speaking
persistence.

## Story Creation Notes

- Created after EP4-ST002 was blocked by the approved persistence/source
  boundary request; this story depends only on EP1-ST015 and EP4-ST001.
- EP4-ST010 is the single next dependency-ready story; EP4-ST002 remains
  blocked with its AI request and is not resumed by this story.



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

## Recovery Record

- Recovery action: resume this same story in place; do not create or resume a
  successor story.
- Blocked history preserved: commit `9ba992f` recorded an automated-review
  false negative because the review context omitted the newly created,
  untracked implementation files even though the build and tests had already
  validated them.
- Recovery verification: inspect and review the complete committed story diff,
  including `four-skills.balance.ts` and `four-skills.balance.spec.ts`, then
  rerun story verification and the scoped/full quality gates.
- The previous blocked outcome is historical evidence only and must not be
  treated as a request to discard the implementation.

## Recovery Verification

- Added the server-owned source/publication boundary for Speaking/Writing
  references and a pure deterministic recalculation fingerprint with explicit
  initial, unchanged, evidence-changed, and policy-changed outcomes.
- Focused verification passed: roadmap balance unit suite, 6 tests; API
  TypeScript compilation passed; `git diff --check` passed.

## Manual Review

- PASS: the complete recovered diff is now committed and includes the balance
  policy, tests, and documentation; the prior automated review false negative
  is not used as implementation evidence.
- PASS: the policy accepts exactly the four canonical skills, orders inputs
  deterministically, bounds allocations, preserves required/due work first,
  fails closed for unavailable or unpublished Speaking/Writing references, and
  exposes only the learner-safe projection fields.
- PASS: recalculation uses a stable policy version and canonical fingerprint;
  unchanged input is idempotent, while evidence/policy changes are explicit.
- PASS: no Prisma, auth, AI gateway, provider, frontend, credential, package,
  CI, or production-branch paths were changed.
- Automated reviewer limitation: the loop reviewer returned blocked because its
  Windows read-only context omitted new files before they were committed. The
  review was repeated manually against the complete committed diff.

## Recovery Quality Gates

- `node scripts/story-doctor.mjs stories/in-progress/EP4-ST010-four-skills-roadmap-balance-rules.md` passed.
- `pnpm story:verify stories/in-progress/EP4-ST010-four-skills-roadmap-balance-rules.md` passed.
- Focused API unit: 22 suites / 160 tests passed for roadmap, TOEIC, and access.
- Focused API E2E: roadmap/today and TOEIC practice, 1 suite / 3 tests passed.
- Full workspace lint, typecheck, test, build, browser E2E, and `git diff --check` passed; browser E2E reported 87 passed.
