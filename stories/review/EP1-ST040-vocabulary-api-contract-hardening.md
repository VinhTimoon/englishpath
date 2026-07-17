---
id: EP1-ST040
title: Vocabulary API Contract And Adapter Hardening
status: review
type: backend
priority: high
phase: phase-1-learning-core
allowed_paths:
  - apps/api/src/modules/vocabulary/**
  - apps/api/test/**
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

# Story: Vocabulary API Contract And Adapter Hardening

## Goal

Close the residual contract and adapter-boundary risks from `EP1-ST017` so future CMS
repositories cannot leak malformed or unpublished taxonomy data through public routes.

## Dependency

- Requires completed `EP1-ST017` vocabulary taxonomy/mindmap API.
- May proceed independently of blocked auth story `EP1-ST008` because both routes remain
  public, read-only projections.
- Does not add vocabulary items, SRS, learner state, persistence, CMS mutation, or UI.

## Requirements

- Add service-level coverage proving rejected, blocked, expired, and unknown governed
  nodes are excluded while their public siblings remain available.
- Add explicit deterministic ordering, multi-page, beyond-final-page, combined filters,
  filtered ancestor retention, and sensitive-field exclusion coverage.
- Override the repository port in API e2e tests with malformed snapshot shapes and
  provider failures; verify sanitized `INTERNAL_ERROR` envelopes with correlation IDs
  and no partial data, raw exception, source evidence, or stack trace.
- Prove the routes do not invoke Prisma, `fetch`, credentials, filesystem, or environment
  configuration through boundary-focused tests rather than implementation comments.
- Standardize success/error metadata fields and document their exact public contract.
- Keep controller -> service -> repository boundaries and one snapshot load per request.

## Acceptance Criteria

- Every residual P2 from the final `EP1-ST017` review has direct automated evidence or a
  documented, justified deferral.
- Malformed or failing adapters return only sanitized stable errors and never partial
  taxonomy projections.
- Tests remain credential-, database-, storage-, filesystem-, and network-independent.
- No Prisma/generated/frontend/dependency/environment change is introduced.
- Full checks, story verification, diff check, and Codex review pass with no P0/P1.

## Verification

- `pnpm story:checks`
- `pnpm story:verify stories/review/EP1-ST040-vocabulary-api-contract-hardening.md`
- `git diff --check`

## Implementation Report

- Added fail-closed snapshot-shape validation before graph traversal and documented
  sanitized adapter-failure behavior for both public vocabulary routes.
- Standardized topic, mindmap, and error metadata on `correlationId` plus
  `idempotencyStatus: not_applicable`, including Swagger HTTP 500 declarations.
- Added direct service evidence for rejected, blocked, expired, unknown, and forged
  governance states while retaining eligible siblings and omitting source evidence.
- Added deterministic multi-page ordering, beyond-final pagination, all-filter
  intersection, bounded ancestor retention, immutability, and one-load coverage.
- Added AppModule e2e repository overrides for malformed snapshots and provider
  failures, proving stable `INTERNAL_ERROR` envelopes without partial or private data.
- Added credential removal and `fetch`/Prisma boundary assertions; the local fixture
  repository is an in-memory import and has no filesystem or environment adapter.
- The Codex build agent timed out after the initial service/controller edits; the
  manager completed the accepted plan, then ran the full gate before independent review.

