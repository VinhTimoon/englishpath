---
id: EP3-ST011
title: Reviewed Licensed Content Batch and Import Validation
status: review
type: fullstack
priority: high
phase: phase-3-licensed-content-library-and-listening
depends_on:
  - EP3-ST004
allowed_paths:
  - apps/api/src/modules/content-governance/**
  - apps/api/src/modules/drive-inventory/**
  - apps/api/src/modules/library/**
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
  - apps/api/src/modules/toeic/**
  - apps/web/src/app/admin/**
  - package.json
  - pnpm-lock.yaml
  - .github/**
  - main
requires_human_approval: false
max_fix_rounds: 2
risk: high
delivery_mode: full
---

# Story: Reviewed Licensed Content Batch and Import Validation

## Goal

Make a small approved licensed-content batch usable in the learner library
while proving every imported version has valid rights, review evidence,
checksum identity, and safe publication state.

## Scope

Harden the existing local fixture/import boundary for a reviewed batch. Validate
each source manifest before creating or accepting a governed content version,
reject unsafe or conflicting identities, preserve import idempotency, and
expose only learner-safe published projections. Use credential-free local
fixtures and existing governance/inventory policies; do not connect a real
Drive/provider, change production data, add licenses, or invent content.

## Acceptance Criteria

- A reviewed batch fixture contains a bounded set of approved listening/library
  assets whose manifest identity, checksum, source version, rights scope,
  validity, review decision, and publication state are all validated before
  learner availability.
- Import rejects missing/invalid rights, expired or blocked licenses, unknown
  usage scopes, unreviewed content, malformed checksum/version identity,
  duplicate identity, and checksum/source-version conflicts. Failures are
  deterministic and do not partially publish a batch.
- Replaying the exact reviewed batch is idempotent and does not create a
  second governed version; a changed checksum or source version requires a
  new governed version or a safe conflict result according to the existing
  policy. No private source locator or reviewer evidence leaks to learner
  catalogue/item, player, drill, shadowing, or link projections.
- The learner catalogue returns only published, approved, in-scope content
  from the batch; draft, quarantined, withdrawn, expired, or conflicted items
  remain unavailable with explicit empty/unavailable behavior.
- Add unit and API E2E coverage for valid batch import, replay, invalid rights,
  conflict, duplicate identity, partial-batch atomicity, publication gating,
  safe learner redaction, and deterministic inventory results. Preserve all
  existing library browser journeys and fixtures.
- Update approved database/API/security/test documentation. Keep changes
  additive and credential-free; any real provider activation, production
  migration, or rights/legal decision is outside scope and must block with an
  AI request.

## Verification

- `node scripts/story-doctor.mjs stories/ready/EP3-ST011-reviewed-licensed-content-batch.md`
- `pnpm story:verify stories/in-progress/EP3-ST011-reviewed-licensed-content-batch.md`
- `pnpm --filter api exec node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand src/modules/content-governance/**/*.spec.ts src/modules/drive-inventory/**/*.spec.ts src/modules/library/**/*.spec.ts`
- `pnpm --filter api test:e2e -- library-reviewed-batch.e2e-spec.ts`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm e2e`
- `git diff --check`

## Implementation Guardrails

- Reuse `importValidatedSourceManifest`, publish/review policy, inventory
  snapshot identity, and learner-safe library projections. Do not duplicate
  governance rules or bypass the existing service/repository boundaries.
- Keep batch validation deterministic and all-or-nothing in the local adapter;
  no external network, credential, provider SDK, or real Drive write is
  allowed. Do not run destructive migrations.
- Treat source IDs, private object keys, reviewer evidence, checksums, and
  license documents as operator-side data. Learner responses may expose only
  approved content metadata and controlled availability state.
- If a legal/rightsholder decision or real licensed asset is needed, create the
  required AI request and mark the dependent story blocked; do not assume it.

## Definition of Done

The approved local batch imports and replays safely, invalid content cannot
reach learner projections, governance and ownership boundaries remain intact,
all quality gates pass, and no known P0/P1 license, data-integrity, or
disclosure issue remains.

## Recovery Verification

- Added `importReviewedSourceManifestBatch` as the all-or-nothing local
  review/publish boundary. Exact replay retains version identity; blocked
  rights fail closed before any learner projection is returned.
- Added two bounded approved local listening fixtures and wired the default
  catalogue adapter to load only their published governed versions.
- Added unit coverage for reviewed batch publication/replay and blocked-rights
  atomicity, plus `apps/api/test/library-reviewed-batch.e2e-spec.ts` for
  authenticated catalogue/item redaction and controlled media state.
- Scoped verification passed: story doctor, story verify, 13 API unit suites
  / 165 tests, and the reviewed-batch API E2E 2/2.
- Full quality gate passed: formatting, planning traceability, tooling 59/59,
  Prisma validation, lint, typecheck, unit 63 suites / 457 tests, API E2E 19
  suites / 109 tests, build, browser E2E 87/87, and `git diff --check`.

## Manual High-Risk Review

- PASS: import validates manifest identity and delegates rights, taxonomy,
  review evidence, authorization, and publication eligibility to the existing
  governance policy.
- PASS: replay is keyed by content/version identity and conflicting checksum or
  source version fails closed; learner catalogue/item responses use the existing
  safe projections and never return source or review evidence.
- PASS: the local fixture uses no provider SDK, network, credentials, Prisma
  schema change, or production migration. Real provider activation remains out
  of scope.
- Automated review subAgent could not be used because the Windows harness
  environment returns `CreateProcessWithLogonW failed: 2`; this is recorded as
  an environment limitation, not as an automated review pass.



## Recovery Record

- Resumed in place after blocked commit `b57fa37`.
- The blocked review result is preserved in git history; this story is the
  successor execution and the blocked lifecycle state is not being resumed.
- Root cause: the first implementation added policy-only validation without a
  reviewed local batch adapter, learner catalogue integration, or API E2E
  evidence.

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
