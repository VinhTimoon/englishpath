---
id: EP0-ST020
title: Shared Taxonomy And Content Rights Foundation
status: ready
type: backend
priority: critical
phase: phase-0-foundation
allowed_paths:
  - apps/api/src/modules/content-governance/**
  - docs/06_BACKEND_ARCHITECTURE.md
  - docs/07_DATABASE_DESIGN.md
  - docs/08_API_CONTRACT.md
  - docs/11_SECURITY_PLAN.md
  - stories/**
forbidden_paths:
  - notes/**
  - apps/web/**
  - apps/api/prisma/**
  - apps/api/src/app.module.ts
  - apps/api/src/generated/**
  - .env
requires_human_approval: false
max_fix_rounds: 3
---

# Story: Shared Taxonomy And Content Rights Foundation

## Goal

Define reusable taxonomy, provenance, rights, human-review, and publication contracts
that fail closed before later CMS, vocabulary, TOEIC, library, and AI content features
persist or expose learning material.

## Dependency

- Requires completed `EP0-ST019` auth identity foundation on `dev`.
- Must complete before `EP0-ST021` Google Drive inventory foundation begins.
- `EP1-ST029` owns persisted CMS taxonomy/content schema, repositories, and APIs.
- Later phase stories own feature-specific vocabulary, TOEIC, library, and AI fields.

## Business Rules

- Shared taxonomy supports level, topic, subtopic, collocation, related skills,
  learning tracks, and relevant TOEIC Part links without creating isolated taxonomies
  for each module.
- Every governed content version records source identity, source URL when available,
  checksum, source version, usage scope, access tier, rights owner, license status,
  review status, publish status, and provenance.
- Imported or AI-assisted content always starts as draft and cannot approve or publish
  itself; approval requires an explicitly authorized human review decision.
- Unknown, blocked, expired, or incompatible rights prevent publication.
- Missing required classification/provenance, failed quality review, or changed
  checksum/version prevents publication and requires a new draft version.
- Published versions are immutable evidence; revision creates a new version lineage.
- This story defines framework-independent contracts and policy behavior only: no
  runtime module, route, database schema, migration, storage call, or frontend UI.

## BE Requirements

- Add readonly value contracts for shared taxonomy and governed content version
  metadata with normalized, duplicate-free classification values.
- Define explicit enums/unions for provenance, usage scope, access tier, license,
  review, publish, and lifecycle decisions; avoid arbitrary string state transitions.
- Implement creation and transition policies that return stable typed failures and do
  not silently mutate prior versions.
- Validate checksum/version, source identity, taxonomy classification, rights owner,
  license compatibility, human reviewer evidence, and publish prerequisites.
- Support a deterministic revision operation that links a new draft to the prior
  content/version and requires changed checksum or source version.
- Add unit tests for happy, validation, boundary, and failure paths, including unknown
  rights, expired rights, AI/import auto-publish attempts, missing reviewer, rejected
  review, duplicate taxonomy values, unchanged revision evidence, and immutable
  published records.

## Documentation Requirements

- Document canonical taxonomy ownership and reuse across vocabulary, daily learning,
  TOEIC, library, roadmap, and Error Notebook.
- Document source/version/license/review/publish invariants and lifecycle transition
  table for later Prisma/API stories.
- Map internal policy failures to sanitized API errors without exposing private source
  locations or reviewer-only evidence.

## Acceptance Criteria

- Tests run without credentials, network, database, storage, or paid services.
- No content can reach published state without compatible rights and authorized human
  approval evidence tied to the same immutable version/checksum.
- AI-assisted and imported provenance cannot self-review or self-publish.
- A source checksum/version change results in a new draft linked to the previous
  version and invalidates prior review evidence for the new version.
- Shared taxonomy preserves all required dimensions and removes empty/duplicate values
  deterministically.
- No runtime module, API route, Prisma/generated source, migration, or frontend change.
- Full repository checks, diff check, story verification, and read-only Codex review
  pass with no P0/P1 findings.

## Verification

- `pnpm format:check`
- `pnpm planning:traceability`
- `pnpm tool:test`
- `pnpm prisma:validate`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm --filter api test:e2e`
- `pnpm build`
- `pnpm e2e`
- `pnpm story:verify stories/review/EP0-ST020-taxonomy-content-rights-foundation.md`
- `git diff --check`
