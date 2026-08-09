---
id: EP3-ST002
title: Drive Inventory Scan, Metadata, Checksum, and Change Detection
status: blocked
type: integration
priority: critical
phase: phase-3-licensed-content-library-and-listening
depends_on:
  - EP3-ST001
allowed_paths:
  - apps/api/src/modules/drive-inventory/**
  - apps/api/src/modules/library/**
  - apps/api/src/library-content-schema.spec.ts
  - apps/api/src/modules/drive-inventory/**/*.spec.ts
  - docs/04_SYSTEM_ARCHITECTURE.md
  - docs/07_DATABASE_DESIGN.md
  - docs/08_API_CONTRACT.md
  - docs/10_TEST_STRATEGY.md
  - docs/11_SECURITY_PLAN.md
  - notes/ai-req/**
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
requires_human_approval: true
max_fix_rounds: 2
risk: high
delivery_mode: full
---

# Story: Drive Inventory Scan, Metadata, Checksum, and Change Detection

## Goal

Provide the governed inventory boundary that reads Drive metadata only, produces
deterministic source manifests, calculates or verifies content fingerprints, and
classifies unchanged/changed/new/removed source snapshots before any import or
learner delivery can occur.

## Scope

This story owns the backend port, provider-neutral scan result, checksum and
change-detection rules, redacted error handling, and fixture-backed evidence. A
real Google Drive credential, provider configuration, network scan, or production
deployment is owner-controlled and must not be fabricated or enabled locally.

## Acceptance Criteria

- Scan metadata is normalized into the existing immutable Drive inventory model;
  source IDs, MIME/type, parent/path hints, modified time, size, checksum, source
  version, and inventory time are preserved without exposing private source refs.
- Checksum/version comparison deterministically classifies `new`, `unchanged`,
  `changed`, and `removed` records, and a changed source cannot reuse prior review
  or publication evidence.
- Results are stable and idempotent for the same fixture/query, reject malformed
  metadata, duplicate identities, invalid timestamps/checksums, and unsupported
  resource kinds, and do not skip sparse records.
- Provider access is isolated behind an adapter; the local implementation is
  fixture-driven, credential-free, non-networked, and has explicit safe errors.
- No public learner endpoint, public Drive URL, storage download, import, rights
  approval, or publication authority is added by this story.
- Production Google credentials/provider activation is not performed. If required
  for the approved acceptance scope, record an AI request and leave this story
  blocked until owner approval; do not claim live-provider evidence.

## Verification

- `pnpm --filter api exec node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand src/modules/drive-inventory/**/*.spec.ts`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `git diff --check`
- `node scripts/story-doctor.mjs stories/in-progress/EP3-ST002-drive-inventory-scan-checksum-and-change-detection.md`
- `pnpm story:verify stories/in-progress/EP3-ST002-drive-inventory-scan-checksum-and-change-detection.md`

## Risk and Review

High risk: source identity, checksum lineage, private metadata, and external
provider boundaries affect licensing and all later content flows. Full review and
quality gates are mandatory. The loop may validate fixture behavior only; it may
not use production credentials or perform a live scan.

## Definition of Done

Local adapter and change-detection rules are implemented and fully verified. The
story is `done` only if the approved scope does not require an external provider;
otherwise it remains `blocked` with a dated AI request and exact owner decision.



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
