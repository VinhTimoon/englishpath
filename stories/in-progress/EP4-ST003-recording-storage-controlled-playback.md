---
id: EP4-ST003
title: Recording Storage And Controlled Playback
status: in-progress
type: backend
priority: high
phase: phase-4-toeic-speaking-writing-and-four-skills
depends_on:
  - EP4-ST002
  - EP3-ST006
allowed_paths:
  - apps/api/src/modules/toeic/**
  - apps/api/src/modules/library/**
  - apps/api/prisma/schema.prisma
  - apps/api/prisma/migrations/**
  - apps/api/src/generated/prisma/**
  - apps/api/test/**
  - docs/04_SYSTEM_ARCHITECTURE.md
  - docs/06_BACKEND_ARCHITECTURE.md
  - docs/07_DATABASE_DESIGN.md
  - docs/08_API_CONTRACT.md
  - docs/11_SECURITY_PLAN.md
  - docs/12_DEPLOYMENT_PLAN.md
  - _bmad-output/implementation-artifacts/sprint-status.yaml
  - _bmad-output/planning-artifacts/story-map.md
  - stories/**
  - notes/ai-req/**
forbidden_paths:
  - apps/api/.env*
  - production credentials
  - direct provider URLs in learner responses
  - main
requires_human_approval: true
blocked_by: notes/ai-req/2026-08-10-ep4-st003-recording-storage-controlled-playback.md
max_fix_rounds: 2
risk: high
delivery_mode: full
---

# Story: Recording Storage And Controlled Playback

## Goal

Persist approved learner Speaking recordings through a server-owned controlled
storage boundary and expose only an authenticated, owner-scoped playback
capability.

## Acceptance Criteria

- The approved storage/provider/retention contract is recorded before code.
- Upload or attachment is bounded by owner, MIME, size, duration, and lifecycle.
- Recording state and references are owner-scoped and never expose provider URLs,
  credentials, raw object keys, or long-lived tokens.
- Playback is authenticated, short-lived, revocable by state, and fail-closed.
- Local/test storage remains credential-free; production activation is separate.
- Migration, repository, API, security, and browser evidence pass.

## Verification

- `pnpm prisma:validate`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm e2e`
- `git diff --check`

## Blocker

Do not resume this story until the linked AI request has an owner decision.
