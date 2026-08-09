---
id: EP3-ST001
title: Library Storage, Content Version, and Drive Manifest Foundation
status: ready
type: database
priority: critical
phase: phase-3-licensed-content-library-and-listening
depends_on:
  - EP2-ST012
allowed_paths:
  - apps/api/prisma/schema.prisma
  - apps/api/prisma/migrations/20260809160000_library_content_foundation/**
  - apps/api/src/generated/prisma/**
  - apps/api/src/modules/library/**
  - apps/api/src/modules/drive-inventory/**
  - apps/api/src/library-content-schema.spec.ts
  - apps/api/src/modules/library/**/*.spec.ts
  - apps/api/src/modules/drive-inventory/**/*.spec.ts
  - docs/07_DATABASE_DESIGN.md
  - docs/08_API_CONTRACT.md
  - docs/10_TEST_STRATEGY.md
  - docs/11_SECURITY_PLAN.md
  - stories/**
  - _bmad-output/implementation-artifacts/sprint-status.yaml
  - _bmad-output/planning-artifacts/story-map.md
forbidden_paths:
  - apps/api/.env
  - apps/api/src/modules/cms/**
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

# Story: Library Storage, Content Version, and Drive Manifest Foundation

## Goal

Establish the additive, server-owned persistence and adapter boundary required to
turn governed Drive inventory into controlled library content. The result is a
traceable foundation for later import, publication, learner access, media delivery,
transcript, and progress stories without making Drive a runtime content database.

## Scope

This story owns only the canonical library/content-version persistence shape,
source-manifest linkage, controlled-storage port contract, and credential-free
adapter/schema evidence. It does not scan a live Drive account, download media,
publish content, expose learner/admin HTTP endpoints, build UI, configure a storage
provider, or apply a migration to shared Supabase. Those belong to later Phase 3
stories and owner-controlled operations.

## Acceptance Criteria

- Add additive Prisma models for a stable library content identity, immutable
  version lineage, private Drive/source manifest evidence, controlled-storage
  linkage metadata, rights/review/publication state, and media/transcript metadata
  needed by later delivery stories.
- Preserve the boundary `Drive inventory -> governed canonical version -> controlled
  storage`: a manifest is source evidence only and cannot itself grant learner
  access, publication, rights approval, or runtime delivery authority.
- Enforce stable source identity/checksum/version uniqueness, immutable version
  lineage fields, deterministic indexes for governed lookup, and lifecycle fields
  sufficient for later review, publication, retirement, and rights expiry checks.
- Keep source URLs, Drive parent/path hints, rights evidence, review evidence,
  storage locations, and provider metadata server-owned; no learner projection or
  public contract is introduced by this foundation story.
- Add provider-neutral storage and manifest-link contracts under the library module;
  local implementations must be deterministic, credential-free, non-networked, and
  must not read `.env`, call Supabase, or access a live Drive account.
- Add only additive migration SQL with a documented owner-approved rollback. It
  must not drop, rewrite, delete, or alter existing learner, TOEIC, CMS, vocabulary,
  identity, progress, or audit data, and automation must not apply it remotely.
- Update database, API/security, and test-strategy documentation to record the
  physical ownership boundary, redaction rules, adapter expectations, indexes,
  migration name, and local-only verification policy.
- Add deterministic schema and adapter tests for version/source identity,
  governance defaults, lineage constraints, storage-reference redaction, malformed
  manifest rejection, immutable outputs, and absence of executable destructive SQL.

## Technical Requirements

- Follow controller/service/repository/adapter boundaries even though this story
  does not add HTTP routes; do not create a controller or learner-facing endpoint.
- Access Prisma only through the existing `PrismaService`; schema tests may inspect
  the schema and migration statically without a database connection.
- Use explicit enums or constrained fields for content type, storage state,
  review/publication state, access tier, and usage scope where the approved domain
  is closed; do not invent a second taxonomy tree.
- Store a canonical content version separately from source inventory evidence and
  keep a source checksum/version binding so changed inventory cannot silently reuse
  prior review or publication evidence.
- Use restrictive or nullable relations for governed lineage and source records;
  do not cascade-delete shared source evidence into learner history.
- Do not add real Google, storage, Supabase, analytics, queue, or paid-provider
  credentials. Do not seed copyrighted or unlicensed third-party learning assets.
- If implementation requires destructive SQL, a provider decision, or shared/remote
  database access, stop and create a dated AI request; do not widen this story.

## Verification

- `pnpm prisma:validate`
- `pnpm --dir apps/api exec prisma generate --schema prisma/schema.prisma`
- `pnpm --filter api exec jest --runInBand src/library-content-schema.spec.ts`
- `pnpm --filter api exec jest --runInBand src/modules/library/**/*.spec.ts src/modules/drive-inventory/**/*.spec.ts`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `git diff --check`
- `node scripts/story-doctor.mjs stories/in-progress/EP3-ST001-library-storage-content-version-and-drive-manifest.md`
- `pnpm story:verify stories/in-progress/EP3-ST001-library-storage-content-version-and-drive-manifest.md`

## Risk and Review

Risk is high because this story changes the Prisma persistence contract and the
rights/storage boundary used by every later Phase 3–5 content flow. Full review,
database validation, redaction checks, and migration safety gates are mandatory.
The automated loop may validate and generate locally only; it may not migrate
shared Supabase or configure a real provider.

## Dependency and Lifecycle Notes

`EP2-ST012` is complete and is the only dependency for this Phase 3 foundation.
This is the single Phase 3 implementation story in the ready queue; later Phase 3,
Phase 4, and Phase 5 stories remain backlog until their declared dependencies pass.
No recovery or competing story exists for this work. The story must not be split or
replaced by a new story unless a concrete scope blocker is recorded with evidence.

## Definition of Done

- All acceptance criteria are implemented and tested within allowed paths.
- Schema and generated client are valid; migration is additive and local-only.
- Unit/static tests, full quality gates, independent adversarial review, and story
  verification pass with no known P0/P1 data, ownership, or disclosure issue.
- Story file records the implementation file list, checks, review findings, and
  completion evidence before it is moved to `review` and merged fast-forward to
  `dev`.
