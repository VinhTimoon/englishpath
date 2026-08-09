---
id: EP3-ST003
title: Licensed Content Review, Import, and Publish Workflow
status: review
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

## Implementation Record

- Added a validated Drive-manifest-to-draft boundary that omits private source URLs
  from governed content source metadata.
- Reused server-owned content governance for exact review evidence, separation of
  duties, publish rights/expiry checks, and fail-closed transitions.
- Added focused library workflow tests for draft import, self-review rejection,
  expired publish rejection, malformed manifests, and private metadata redaction.
- Documented the route-free provider boundary and rights/review ownership in API
  and security plans.

## Verification Evidence

- Focused governance tests: 3 suites / 74 tests passed after recovery fix.
- `pnpm lint`, `pnpm typecheck`, and `git diff --check` passed after recovery.
- The initial loop also passed full unit/build gates before review; the remaining
  full `pnpm story:checks` gate is rerun before merge.
- No credentials, routes, Prisma changes, copyrighted assets, network calls, or
  storage/publication activation were introduced.

## Review Evidence

The automated read-only review was blocked by the Windows sandbox startup failure
and correctly identified missing focused tests and boundary documentation in the
initial implementation. Supervised recovery added `library-governance.spec.ts`,
API/security documentation, and the manifest validation/redaction boundary. The
focused suite now passes with no known P0/P1 rights, ownership, or disclosure issue.

## Historical Blocked Report

- Initial loop result: review blocked because the implementation diff lacked test
  and documentation evidence; this was not a timeout or capacity failure.
- Commit `ac08afb` preserves the original blocked lifecycle evidence. The same
  story ID is being recovered; no competing recovery story was created.



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
