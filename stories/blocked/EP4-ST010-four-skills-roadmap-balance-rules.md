---
id: EP4-ST010
title: TOEIC Four Skills Roadmap Balance Rules
status: blocked
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

- `node scripts/story-doctor.mjs stories/ready/EP4-ST010-four-skills-roadmap-balance-rules.md`
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
