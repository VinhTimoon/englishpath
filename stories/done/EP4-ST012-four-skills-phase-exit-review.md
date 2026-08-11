---
id: EP4-ST012
title: AI Evaluation Score Separation Abuse Browser And Phase Exit Review
status: done
type: quality
priority: high
phase: phase-4-toeic-speaking-writing-and-four-skills
depends_on:
  - EP4-ST004
  - EP4-ST005
  - EP4-ST006
  - EP4-ST007
  - EP4-ST008
  - EP4-ST009
  - EP4-ST010
  - EP4-ST011
allowed_paths:
  - apps/api/**
  - apps/web/**
  - tests/e2e/**
  - docs/**
  - _bmad-output/implementation-artifacts/sprint-status.yaml
  - _bmad-output/planning-artifacts/story-map.md
  - stories/**
  - notes/ai-req/**
forbidden_paths:
  - apps/api/.env*
  - production credentials
  - main
requires_human_approval: true
blocked_by: notes/ai-req/2026-08-10-ep4-st003-recording-storage-controlled-playback.md
max_fix_rounds: 2
risk: high
delivery_mode: full
---

# Story: Phase 4 Exit Review

## Goal

Prove the complete Speaking/Writing/Four Skills journey is secure, browser
covered, advisory-only, abuse-resistant, and ready for the approved release
boundary.

## Acceptance Criteria

- EP4-ST003 through EP4-ST011 are done with evidence and no unresolved P0/P1.
- Recording ownership, retention, playback, and provider isolation are verified.
- Advisory feedback cannot become an official score; quotas and idempotency are
  enforced; sensitive fields are absent.
- Full API, frontend, browser, accessibility, build, and security gates pass.
- Any production provider activation remains owner-controlled.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm e2e`
- `git diff --check`

## Dependency Resolution

EP4-ST003 through EP4-ST011 are done and merged to `dev` with recorded review
and full-gate evidence. The owner-approved local/test recording and feedback
boundaries are now available for this exit review. Production storage/provider
activation remains explicitly owner-controlled.

## Exit Review Evidence

- EP4-ST003 through EP4-ST011 are present in `stories/done` with status `done`,
  review evidence, and merged commits on `dev`.
- Recording ownership is enforced by authenticated application-user lookups;
  retention expiry, revocation, deletion, capability expiry, and provider
  isolation fail closed. Learner projections exclude object keys, provider
  locators, credentials, raw audio, and long-lived URLs.
- Speaking/Writing submissions are server-owned and idempotent. Feedback is
  advisory-only; gateway output is allowlisted and cannot set official scores,
  mutate progress, expose rubric internals, or return raw provider data.
- Gateway quota, UTC-day accounting, exact replay, changed-payload conflict,
  explicit denied/unavailable outcomes, redaction, and owner-scoped usage
  persistence are covered by the completed gateway and feedback stories.
- Four Skills roadmap projection is backend-owned and preserves explicit
  unavailable Speaking/Writing states; the frontend does not derive business
  progress from task types or aggregate counts.
- Browser evidence covers Speaking recording/playback, Writing submission and
  unavailable/retry states, Four Skills roadmap projection, accessibility,
  responsive mobile journeys, and the existing Phase 1/2/3 regression suite.
- Full gate on 2026-08-11 with `ENGLISHPATH_E2E_PORT=4180`: formatting,
  planning traceability, 59 harness tests, Prisma validation, lint, typecheck,
  72 API unit suites / 501 tests, 22 API E2E suites / 122 tests, build, and 99
  browser tests all passed. `git diff --check` passed.

## Phase 4 Decision

Phase 4 is complete for the approved local/test release boundary. Production
storage activation, bucket/RLS configuration, retention/deletion jobs,
audio-capable Speaking feedback provider/STT contract, credentials, budget,
deployment, and promotion to `main` remain owner-controlled and are not claimed
as complete by this review. No new AI request is required because these are
explicitly deferred operations rather than unresolved implementation blockers.
