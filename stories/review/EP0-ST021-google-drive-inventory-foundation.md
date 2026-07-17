---
id: EP0-ST021
title: Google Drive Inventory Manifest Foundation
status: review
type: backend
priority: critical
phase: phase-0-foundation
allowed_paths:
  - apps/api/src/modules/drive-inventory/**
  - docs/04_SYSTEM_ARCHITECTURE.md
  - docs/06_BACKEND_ARCHITECTURE.md
  - docs/07_DATABASE_DESIGN.md
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

# Story: Google Drive Inventory Manifest Foundation

## Goal

Define a credential-free, inventory-only Google Drive source contract and deterministic
local fixture adapter that later import stories can use without treating Drive as the
business database, public delivery path, or automatic publication channel.

## Dependency

- Requires completed `EP0-ST020` content-governance foundation on `dev`.
- Must complete before `EP0-ST022` observability adapters begin.
- `EP3-ST002` owns real Drive API scanning, metadata extraction, checksum computation,
  and source change detection.
- Later Phase 3 stories own content download, segmentation, controlled storage, CMS
  import, review orchestration, and publication.

## Business Rules

- Google Drive is a source inventory only; application runtime queries and learner
  delivery never depend on a public Drive URL or live Drive listing.
- Inventory records preserve provider/file identity, display name, MIME type, resource
  kind, parent/path hints, private source reference, checksum, source version,
  modification time, size when applicable, and inventory time.
- Supported resource kinds cover document/PDF, video, audio, slide, spreadsheet or
  question bank, transcript, image, course folder, external link, and unknown.
- Folder and external-link resources may omit byte size; file resources require a
  non-negative integer size.
- Duplicate provider/file identities in one inventory result fail closed instead of
  silently overwriting a record.
- Inventory does not imply rights approval, classification completion, review approval,
  canonical import, or publish permission.
- Private source references and folder structure are operational metadata and must not
  appear in learner-facing error messages or public projections.

## BE Requirements

- Add readonly manifest, resource-kind, inventory-query, and inventory-result contracts
  with explicit runtime validation and stable sanitized typed errors.
- Add a Drive inventory port that returns manifests only and never content bytes.
- Add a local fixture adapter that receives explicit in-memory fixtures, performs no
  environment, credential, filesystem, database, storage, or network access, and
  returns deeply frozen records in deterministic provider/file order.
- Normalize optional path/parent hints without inventing canonical business taxonomy.
- Reject malformed IDs, timestamps, checksums, versions, MIME types, negative sizes,
  duplicate identities, and unsupported runtime enum values.
- Add unit tests for happy paths, all supported resource kinds, folder/link size rules,
  deterministic ordering, duplicate rejection, deep immutability, malformed runtime
  inputs, sanitized failures, and absence of content bytes/public delivery fields.

## Documentation Requirements

- Document the manifest boundary and the distinction between source inventory,
  governed canonical content, controlled storage, and learner delivery.
- Document that real credentials and Drive API behavior are deferred to `EP3-ST002`.
- Document default-deny handling for private source URLs, path hints, changed versions,
  and any inventory item lacking later rights/review approval.

## Acceptance Criteria

- Tests run without Google credentials, network, database, storage, filesystem, or paid
  services.
- The adapter exposes metadata manifests only; no file bytes, public delivery URL,
  publish mutation, or runtime Nest registration is introduced.
- Every manifest is immutable, deterministic, and uniquely identified by provider plus
  source file ID.
- Invalid or duplicate fixture data returns stable sanitized domain errors.
- Documentation clearly defers real scanning/import/publish behavior to later stories.
- No route, Prisma/generated source, migration, frontend, environment, or runtime module
  registration change is made.
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
- `pnpm story:verify stories/review/EP0-ST021-google-drive-inventory-foundation.md`
- `git diff --check`

## Implementation Report

- Added metadata-only manifest/query/result contracts, stable sanitized errors, and a
  Drive inventory port without content-byte or publication operations.
- Added a deterministic local fixture adapter with explicit in-memory input, typed
  validation, duplicate rejection, filtering, sorting, detached copies, and deep
  immutability.
- Added credential-free tests for supported resource kinds, size rules, malformed and
  prohibited fields, query boundaries, ordering, duplicate identities, sanitization,
  and fixture isolation.
- Documented the inventory-to-governed-content boundary and deferred real Drive API,
  credentials, scanning, import, storage, and publication to Phase 3 stories.
