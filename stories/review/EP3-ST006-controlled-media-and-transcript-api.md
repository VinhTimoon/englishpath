---
id: EP3-ST006
title: Controlled Media and Transcript API
status: review
type: backend
priority: high
phase: phase-3-licensed-content-library-and-listening
depends_on:
  - EP3-ST005
allowed_paths:
  - apps/api/src/modules/library/**
  - apps/api/src/modules/access/**
  - apps/api/test/**
  - docs/04_SYSTEM_ARCHITECTURE.md
  - docs/06_BACKEND_ARCHITECTURE.md
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
  - apps/api/src/modules/auth/**
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

# Story: Controlled Media and Transcript API

## Goal

Let an authenticated learner open an eligible library item and receive a safe
transcript/media projection without exposing Drive references, storage object
keys, unsigned provider URLs, or content that has lost publication rights.

## Scope

Add a server-owned item detail endpoint over the approved library catalogue
boundary. Resolve media through a provider-neutral controlled-storage port and
return an explicit unavailable/quarantined state when local storage is not
activated. Transcript segments are learner-safe application data with bounded
ordering and no provider metadata. Do not add real storage credentials, signed
URL generation, schema/migrations, or the player UI; EP3-ST007 owns playback,
resume, bookmarks, and notes.

## Acceptance Criteria

- `GET /api/v1/library/items/:versionId` requires authentication and first
  rechecks the server-owned EP3-ST005 eligibility predicate; missing, draft,
  expired, withdrawn, wrong-tier, and unknown versions fail closed without
  revealing whether private content exists.
- The response uses the standard envelope and returns only safe item identity,
  title/summary, taxonomy, transcript segments, duration, and a controlled
  media state. Transcript order is deterministic, segments are bounded, and
  malformed provider/content records are rejected safely.
- No response includes Drive URLs, object keys, source IDs/checksums, rights or
  reviewer evidence, credentials, raw manifests, or unsigned external media
  URLs. `AVAILABLE`, `PENDING`, `QUARANTINED`, and `RETIRED` storage states map
  to an explicit learner-safe media state; unavailable media never fabricates a
  playable URL.
- The controlled-media port is injectable and local/fixture-compatible. The
  default adapter is credential-free and does not call Drive, Supabase, or a
  real storage service. Provider activation remains outside this story.
- Add API unit and E2E coverage for authentication, eligibility re-check,
  owner/tier isolation, safe transcript/media projection, each storage state,
  malformed data, not-found indistinguishability, and sanitized provider
  failure. No browser/player coverage is required until EP3-ST007.
- Document the media authorization boundary, transcript redaction, storage
  state mapping, and the separation between catalogue visibility and controlled
  media delivery.

## Verification

- `pnpm --filter api exec node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand src/modules/library/**/*.spec.ts src/modules/access/**/*.spec.ts`
- `pnpm --filter api test:e2e -- library-media.e2e-spec.ts`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `git diff --check`
- `node scripts/story-doctor.mjs stories/in-progress/EP3-ST006-controlled-media-and-transcript-api.md`
- `pnpm story:verify stories/in-progress/EP3-ST006-controlled-media-and-transcript-api.md`

## Risk and Review

High risk because this endpoint is a learner data and media authorization
boundary. Full review and full quality gates are mandatory. Review must verify
eligibility is rechecked at item access time, storage states fail closed, and
no private/provider field can cross the HTTP boundary.

## Definition of Done

The local API contract safely serves governed item/transcript projections and
explicit media availability states with comprehensive evidence. No production
storage/provider activation or playable external URL is claimed.



## Blocked Report

- Failed step: "node" "scripts/codex-runner.mjs" "build" ".codex-build-task.md"
- Exit code: 42
- Attempts: 1
- Summary: The automated loop produced a valid blocked outcome and stopped without further retries.

### Evidence

```text
Child process returned blocked exit code 42.
Command failed with exit code 42: "node" "scripts/codex-runner.mjs" "build" ".codex-build-task.md"
```

## Recovery Record

The initial build result at commit `700b4ac` is historical evidence only. This
story is being recovered in place; no competing recovery story is created and
the blocked build is not blindly retried. The initial endpoint/policy skeleton
left the dedicated media E2E suite and boundary documentation incomplete.

Recovery also removes provider locators from learner responses. A controlled
adapter may retain an internal locator for a future authorized delivery flow,
but this endpoint returns only a safe media state.

## Recovery Verification and Manual Review

Recovery added the item endpoint, request-time reuse of the catalogue
eligibility predicate, bounded deterministic transcript projection, controlled
storage-state mapping, sanitized not-found/provider failures, and credential-
free adapter tests. No Prisma/schema, generated client, web, credential, or
production provider configuration was changed.

Manual high-risk review checked authentication, indistinguishable ineligible
and unknown responses, field-by-field redaction, locator exclusion, transcript
bounds/order, exhaustive state handling, provider-failure fallback, and the
catalogue-versus-media authorization boundary. Automated review subAgent is
unavailable on this Windows runner because its managed process startup fails
with `CreateProcessWithLogonW failed: 2`; this story is not marked pass based on
that unavailable result.

Verification evidence:

- focused media unit tests — 18 passed
- media API E2E — 4 passed
- full `pnpm story:checks` — passed: formatting, planning/tooling, Prisma
  validation, 61 API unit suites / 443 tests, 14 API E2E suites / 96 tests,
  build, and 79 browser tests
