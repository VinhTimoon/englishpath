---
id: EP3-ST003
title: Licensed Content Review, Import, and Publish Workflow
status: ready
type: backend
priority: critical
phase: phase-3-licensed-content-library-and-listening
depends_on:
  - EP3-ST002
  - EP1-ST028
allowed_paths:
  - apps/api/src/modules/library/**
  - apps/api/src/modules/content-governance/**
  - apps/api/src/library-content-schema.spec.ts
  - apps/api/src/modules/library/**/*.spec.ts
  - docs/04_SYSTEM_ARCHITECTURE.md
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
  - apps/api/src/generated/**
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

# Story: Licensed Content Review, Import, and Publish Workflow

## Goal

Give content operators a server-owned, auditable policy for importing a validated
Drive source into a draft library version, reviewing exact checksum/version
evidence, and publishing only when rights, review, access, and usage constraints
all pass.

## Scope

Implement the provider-neutral library governance policy and deterministic local
workflow contract. Reuse existing authorization conventions; do not add routes,
Prisma changes, real Drive/storage credentials, copyrighted content, or remote
provider calls in this story.

## Acceptance Criteria

- Import creates an immutable draft projection from a validated source manifest and
  cannot grant rights, publication, learner access, or storage delivery authority.
- Review requires a distinct authorized human decision and exact content/version,
  checksum, source-version, rights, and evidence binding; self-review is rejected.
- Publish requires approved rights, current review evidence, supported access tier
  and usage scope, non-expired license, and an unchanged checksum/source version.
- Changed or stale source evidence resets to draft/unpublished and cannot reuse old
  review or publication decisions; invalid transitions fail closed.
- Operator outputs are redacted and do not expose private Drive refs, raw payloads,
  credentials, reviewer internals, or learner-only projections.
- Idempotent import/review/publish decisions are deterministic and local-only; safe
  typed errors cover malformed, unauthorized, expired, mismatched, and stale inputs.
- Add focused tests and document the ownership, rights, and authorization boundary.

## Verification

- `pnpm --filter api exec node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand src/modules/library/**/*.spec.ts src/modules/content-governance/**/*.spec.ts`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `git diff --check`
- `node scripts/story-doctor.mjs stories/in-progress/EP3-ST003-license-review-import-and-publish-workflow.md`
- `pnpm story:verify stories/in-progress/EP3-ST003-license-review-import-and-publish-workflow.md`

## Risk and Review

High risk because license, role, review, publication, and immutable source evidence
protect downstream learner content. Full review and project quality gates are
mandatory. This story must remain credential-free and route-free.

## Definition of Done

The local governance policy and tests pass with no known P0/P1 rights, ownership,
or disclosure issue. Production asset import and provider activation remain outside
the artifact and are not claimed as deployed.
