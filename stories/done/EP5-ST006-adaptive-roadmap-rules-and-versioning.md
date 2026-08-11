---
id: EP5-ST006
title: Adaptive roadmap evidence, rules, and versioning
status: done
type: backend
priority: high
phase: phase-5-full-test-adaptive-ai-and-community
depends_on:
  - EP5-ST005
  - EP1-ST015
allowed_paths:
  - apps/api/src/modules/roadmap/**
  - apps/api/src/modules/practice/**
  - apps/api/test/**
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
  - apps/api/src/modules/auth/**
  - apps/api/src/modules/ai-gateway/**
  - apps/api/src/modules/toeic/**
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

# Story: Adaptive roadmap evidence, rules, and versioning

## Goal

Make roadmap recalculation respond to validated learner evidence while keeping
the backend as the only source of truth. A learner should receive a useful,
deterministic focus adjustment without fabricated scores, guessed tasks, AI
output, or loss of the existing roadmap/today contract.

## Scope

Extend the existing roadmap engine/service/repository boundary with a small,
versioned adaptive policy. The policy may consume only owner-scoped evidence
already persisted by the existing learning modules, including existing roadmap
completion state and the approved Error Notebook projection. It must preserve
the current onboarding/placement seed, required and due work, the EP4-ST010
Four Skills policy, and existing roadmap version/lineage semantics.

No new persistence model, schema field, migration, provider, AI call, official
score, submission, rubric, or frontend implementation is part of this story.
If a required adaptive semantic cannot be determined from existing contracts,
fail closed and document the unavailable evidence; do not invent a weight,
threshold, score, task, or taxonomy.

## Acceptance Criteria

1. Authenticated `POST /api/v1/roadmaps/recalculate` remains owner-scoped and
   derives its seed and adaptive evidence from the authenticated application
   user. Request input cannot provide identity, weights, priorities, scores,
   evidence, or policy versions.
2. The adaptive policy is pure/deterministic, has an explicit stable policy
   version, uses bounded canonical ordering, and is replay-stable for identical
   seed/evidence. It never calls AI, uses wall-clock randomness, or treats
   unavailable evidence as zero performance or completion.
3. Recalculation preserves every existing roadmap item record, including
   status/completion timestamps, item count, day/slot bounds, and the existing
   EP4-ST010 learner-safe Four Skills projection. The current persisted roadmap
   contract has no required/due flags, so this story does not invent or
   reallocate such metadata. It may reorder only existing pending activities
   and must never fabricate a prompt, content reference, Speaking/Writing
   task, answer, score, or submission.
4. A successful recalculation creates the next server-owned roadmap version with
   existing `previousRoadmapId` lineage and leaves the historical roadmap
   unchanged. Identical evidence is idempotent/no-op or returns the existing
   equivalent version according to the current repository contract. When
   validated evidence changes the canonical existing-item ordering, the
   service creates an explicit new version; if evidence changes but the
   schema-free candidate is equivalent, it returns the current version
   because no persistence fingerprint is approved for this story.
5. Existing `GET /api/v1/roadmaps/current`, generate, item-status, today counts,
   and Four Skills projection remain backward compatible. No learner can read
   or influence another learner's roadmap/evidence.
6. The implementation fails closed for missing, malformed, unsupported, or
   unavailable adaptive evidence and keeps the existing sanitized API error
   behavior. It does not convert unavailable Speaking/Writing evidence into a
   fake task or a zero/completed state.
7. Unit and API/E2E regression coverage proves deterministic policy behavior,
   owner isolation, version/lineage behavior, repeated recalculation, changed
   evidence that changes the candidate, completion preservation,
   unavailable/malformed evidence, sensitive-field redaction, Four Skills
   projection, and unchanged roadmap/today behavior.
8. Backend/API/security/test documentation records the policy version,
   evidence allowlist, fail-closed behavior, and the separation from official
   scoring, AI feedback, submissions, and provider data.

## Verification commands

```text
node scripts/story-doctor.mjs stories/in-progress/EP5-ST006-adaptive-roadmap-rules-and-versioning.md
pnpm planning:traceability
pnpm --filter api exec jest --runInBand src/modules/roadmap/**/*.spec.ts src/modules/practice/**/*.spec.ts
pnpm --filter api exec jest --runInBand test/roadmap-today.e2e-spec.ts test/practice.e2e-spec.ts
pnpm --filter api lint
pnpm --filter api typecheck
pnpm format:check
pnpm story:verify stories/in-progress/EP5-ST006-adaptive-roadmap-rules-and-versioning.md
pnpm story:checks
git diff --check
```

## Implementation guardrails

- Keep controller -> service -> engine/repository layering.
- Reuse existing authentication, owner predicates, Error Notebook allowlists,
  roadmap versioning, and EP4-ST010 policy; do not create a parallel contract.
- Do not modify Prisma schema/migrations or use shared production data.
- Do not change frontend, AI gateway, TOEIC source contracts, credentials,
  ports, package dependencies, CI, or production deployment.
- Never mark this story done from a mocked-only check if the repository's
  targeted API/browser verification is unavailable; record the actual result.

## Definition of Done

Adaptive recalculation is a bounded, deterministic, owner-safe server policy
with explicit evidence/version semantics, preserved historical roadmaps,
regression coverage, documentation, and all required quality gates passing.


