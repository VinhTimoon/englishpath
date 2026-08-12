---
id: EP5-ST011
title: Community sharing and moderation UI
status: done
type: frontend
priority: high
phase: phase-5-full-test-adaptive-ai-and-community
risk: medium
delivery_mode: full-review
depends_on:
  - EP5-ST010
allowed_paths:
  - apps/web/src/entities/community/**
  - apps/web/src/features/community/**
  - apps/web/src/widgets/community/**
  - apps/web/src/app/community/**
  - tests/e2e/community-sharing.spec.ts
  - stories/**
  - _bmad-output/implementation-artifacts/sprint-status.yaml
  - _bmad-output/planning-artifacts/story-map.md
forbidden_paths:
  - apps/api/**
  - apps/web/.env*
  - package.json
  - pnpm-lock.yaml
  - .github/**
  - provider credentials or direct provider calls
  - production data or shared Supabase migrations
  - main
  - Phase 6
requires_human_approval: false
max_fix_rounds: 2
---

## Goal

Give authenticated learners a safe, accessible community sharing flow with
server-owned publication and reporting states, while giving approved
moderators a bounded review surface without exposing sensitive data.

## Acceptance Criteria

- Learners can browse published posts, submit bounded content, and report a
  post with stable idempotency and safe retry/conflict handling.
- Approved moderators can review and decide publication through the existing
  role-gated API; learners cannot access moderation data.
- Loading, empty, error, unavailable, authentication, forbidden, replay, and
  conflict states are explicit and actionable.
- Strict client allowlists reject unknown or sensitive fields, and no browser
  surface renders learner identity, provider payloads, credentials, or private
  moderation data.
- The UI is mobile-first, keyboard accessible, and free of horizontal overflow.
- No backend, schema, package, environment, provider, CI, production, or Phase 6
  change is introduced.

# Completion evidence

Implemented the authenticated `/community` vertical slice over EP5-ST010:
published learner posts, bounded submission with server-owned `PENDING_REVIEW`,
safe reporting, guarded moderation queue and decisions, strict Zod allowlists,
stable idempotency keys, explicit auth/forbidden/error/empty/replay/conflict/
unavailable states, mobile-first accessibility, and fail-closed pagination.

Changed files are limited to the approved web community feature, route, widget,
contracts, and browser coverage. No backend, schema, package, environment,
provider, migration, CI, or Phase 6 changes.

## Verification

Verification evidence:

- `pnpm --filter web lint` pass
- `pnpm --filter web typecheck` pass
- `pnpm format:check` pass
- `pnpm planning:traceability` pass
- `pnpm --filter web build` pass
- `pnpm test` pass: 77 suites, 549 tests
- `pnpm e2e -- tests/e2e/community-sharing.spec.ts` pass: 16 tests
- `pnpm e2e` pass: 125 tests
- `pnpm story:verify stories/in-progress/EP5-ST011-community-sharing-and-moderation-ui.md` pass before lifecycle close
- `git diff --check` pass
- Mandatory medium-risk review completed with no P0/P1 findings

Merged fast-forward to `dev`; no production promotion performed.
