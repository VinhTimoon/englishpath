---
id: EP1-ST017
title: Vocabulary Taxonomy And Mindmap API
status: review
type: backend
priority: high
phase: phase-1-learning-core
allowed_paths:
  - apps/api/src/modules/vocabulary/**
  - apps/api/src/modules/content-governance/**
  - apps/api/src/app.module.ts
  - apps/api/test/**
  - docs/06_BACKEND_ARCHITECTURE.md
  - docs/08_API_CONTRACT.md
  - docs/10_TEST_STRATEGY.md
  - stories/**
forbidden_paths:
  - notes/**
  - apps/web/**
  - apps/api/prisma/**
  - apps/api/src/generated/**
  - apps/api/package.json
  - pnpm-lock.yaml
  - .env
requires_human_approval: false
max_fix_rounds: 3
---

# Story: Vocabulary Taxonomy And Mindmap API

## Goal

Expose a credential-free, read-only vocabulary taxonomy and mindmap API that represents
the v2 knowledge tree through bounded, deterministic contracts while preserving shared
content-governance and future CMS persistence boundaries.

## Dependency

- Requires completed `EP0-ST020` shared taxonomy/content-rights foundation.
- Can proceed while `EP1-ST008` auth API is blocked because only published public
  taxonomy projections are exposed and no learner state is read or written.
- `EP1-ST018` owns vocabulary SRS/mastery; learner counts, due reviews, unlock state,
  and user mistakes are excluded here.
- `EP1-ST029` owns persisted CMS taxonomy/vocabulary schema and lifecycle APIs; its
  repository adapter will replace the local reviewed fixture without changing this API.

## Business Rules

- The shared hierarchy is `domain -> topic -> subtopic`; vocabulary, collocations,
  sentence patterns, lessons, TOEIC Parts, and learner mistakes link to that taxonomy
  but do not become arbitrary nested folders in this story.
- Vocabulary levels use the six v2 bands: Daily Basic, Common Communication, TOEIC Core,
  Workplace English, Advanced TOEIC, and Academic/Professional.
- Public responses contain only active taxonomy nodes backed by published, approved,
  license-compatible fixture evidence. Draft, rejected, blocked, expired, or unknown
  records fail closed and are never serialized.
- Node identity, parent relationships, ordering, counts, levels, related skills, tracks,
  and TOEIC Part links are backend-owned; query parameters cannot alter governance state.
- Empty, duplicate, cyclic, orphaned, or over-depth graph data is rejected before use.

## BE Requirements

- Add framework-independent vocabulary taxonomy node, tree, filter, pagination, and
  repository-port contracts with immutable outputs and stable typed failures.
- Implement a deterministic local fixture adapter containing the v2 six-level catalogue
  and representative public domain/topic/subtopic branches, clearly separated from
  future persistent CMS content.
- Add a service that validates graph integrity, filters by level/track/skill/TOEIC Part,
  paginates topic summaries, and builds a bounded mindmap without N+1 repository calls.
- Add `GET /api/v1/vocabulary/topics` with validated page/size/filter query DTOs and
  `GET /api/v1/vocabulary/mindmap` with root/depth/filter query DTOs.
- Use controller -> service -> repository boundaries, Swagger declarations, stable list
  and object envelopes, generated/validated correlation IDs, and sanitized errors.
- Add unit and API e2e tests for filtering, deterministic ordering, pagination bounds,
  invalid enum/TOEIC/depth input, cycles, orphans, duplicate IDs, governance filtering,
  immutability, no sensitive evidence, and credential/network/database independence.

## Acceptance Criteria

- Topic and mindmap routes return deterministic v2 taxonomy data under `/api/v1` with
  no database, Supabase, credential, storage, or network dependency.
- Only governed public projections appear; responses omit source URLs, checksums,
  reviewer evidence, license internals, and unpublished nodes.
- Pagination and depth are bounded, all query DTOs are validated, and malformed graph
  fixtures fail closed rather than returning partial trees.
- No Prisma schema/migration/generated source, frontend, dependency, learner progress,
  CMS mutation, vocabulary item import, or SRS behavior is introduced.
- Full checks, story verification, diff check, and Codex review pass with no P0/P1.

## Verification

- `pnpm story:checks`
- `pnpm story:verify stories/review/EP1-ST017-vocabulary-taxonomy-mindmap-api.md`
- `git diff --check`

## Implementation Report

- Added an immutable vocabulary taxonomy domain with six v2 levels, graph validation,
  deterministic filters/pagination, bounded mindmap traversal, and ancestor retention.
- Added a replaceable repository port and local fixture adapter whose records are
  created through authorized content review/publication policy without credentials,
  persistence, storage, filesystem, or network access.
- Added public topic and mindmap endpoints with local DTO validation, Swagger metadata,
  correlation IDs, stable envelopes, and sanitized validation/not-found/internal errors.
- Added focused unit and API e2e coverage for graph failures, governance fail-closed
  behavior, immutable projections, sensitive evidence exclusion, and zero Prisma calls.
- Two bounded Codex build attempts timed out before writing source; the manager completed
  implementation against the accepted Codex plan, subject to full gates and independent
  read-only Codex review.
