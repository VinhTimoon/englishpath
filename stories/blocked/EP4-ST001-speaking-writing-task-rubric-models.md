---
id: EP4-ST001
title: TOEIC Speaking and Writing Task and Rubric Models
status: blocked
type: backend
priority: high
phase: phase-4-toeic-speaking-writing-and-four-skills
depends_on:
  - EP3-ST012
allowed_paths:
  - apps/api/src/modules/toeic/**
  - apps/api/src/modules/access/**
  - apps/api/test/**
  - docs/07_DATABASE_DESIGN.md
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
  - apps/api/src/modules/admin/**
  - apps/web/**
  - package.json
  - pnpm-lock.yaml
  - .github/**
  - main
requires_human_approval: false
max_fix_rounds: 2
risk: high
delivery_mode: full
---

# Story: TOEIC Speaking and Writing Task and Rubric Models

## Goal

Create the server-owned, versioned domain contract that later Speaking and
Writing stories can use without inventing task types, rubric dimensions, or
official-score behavior in controllers, UI, or AI workers.

## Scope

Add provider-neutral TypeScript models and pure validation/policy functions for
TOEIC Speaking and Writing task definitions, task versions, submission-ready
prompt metadata, and rubric criteria. Keep this story at the model boundary:
there is no submission endpoint, recording storage, AI call, official score,
learner UI, Prisma schema, or migration. Reuse existing TOEIC naming,
validation, response-redaction, and immutable-version patterns.

## Acceptance Criteria

- Speaking and Writing task models use explicit allowlists for skill, task type,
  task version, prompt kind, response mode, duration/length constraints, and
  publication state. Malformed, unknown, duplicate, or contradictory metadata
  fails deterministically with sanitized domain errors.
- A task version has immutable identity and lineage, bounded prompt/instruction
  metadata, optional controlled media reference metadata without provider
  secrets, and a server-owned publication state. The model cannot be mutated
  through returned references or reused with a different task type.
- Rubric models define versioned, bounded, skill-specific advisory dimensions
  and level descriptors with stable IDs, weights/limits that validate
  deterministically, and explicit separation between advisory feedback and any
  future official TOEIC score. No AI output or official score is created here.
- Speaking and Writing models preserve security boundaries: no answer key,
  private source locator, provider credential, raw token/claim, reviewer
  evidence, or hidden scoring formula appears in learner-safe projections.
  Pre-submission task metadata contains only what a future learner task API is
  approved to expose.
- Add focused unit coverage for valid models, immutability, version lineage,
  task/rubric allowlists, bounds, duplicate IDs, invalid weights, publication
  gating, safe projections, and absence of forbidden fields. Preserve all
  existing TOEIC question, practice, timed-test, and auth tests.
- Update the approved database/API/test/security documentation to describe the
  additive model boundary and the fact that persistence, submissions, official
  scoring, recording, and AI feedback belong to later stories.
- Keep this story credential-free and additive. If approved task definitions,
  licensed prompts, official scoring/legal interpretation, production schema,
  provider activation, paid AI, or owner product decisions are required, create
  an AI request and block this story rather than assuming them.

## Verification

- `node scripts/story-doctor.mjs stories/ready/EP4-ST001-speaking-writing-task-rubric-models.md`
- `pnpm story:verify stories/in-progress/EP4-ST001-speaking-writing-task-rubric-models.md`
- `pnpm --filter api test -- --runInBand "toeic|access"`
- `pnpm --filter api test:e2e -- toeic-practice.e2e-spec.ts toeic-timed-test.e2e-spec.ts`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm e2e`
- `git diff --check`

## Implementation Guardrails

- Keep models/policies pure and testable under `apps/api/src/modules/toeic/**`;
  controllers, repositories, AI gateways, recording adapters, and UI are not
  part of this story. Do not widen the scope to create a premature API.
- Reuse established strict allowlist, immutable object, safe projection, and
  sanitized error conventions from the existing TOEIC question/timed-test
  modules. Do not duplicate a second scoring or task taxonomy.
- Official TOEIC scores remain server-authoritative and are not inferred from
  advisory rubric descriptors. Never call an AI/provider directly from this
  model layer.
- Do not modify Prisma schema/migrations, auth, library, practice, package
  dependencies, `.env`, CI, or production deployment files.

## Definition of Done

The Speaking/Writing task and rubric contracts are versioned, immutable,
strictly validated, safely projected, fully unit-tested, documented, and ready
for the later submission/API stories without creating official scoring or AI
behavior prematurely.

## Story Creation Notes

- Created after Phase 3 close commit `75e946f`.
- EP4-ST001 is the only dependency-ready story; later EP4/EP5 stories remain
  backlog until their declared dependencies pass.



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
