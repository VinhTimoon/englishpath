---
id: EP3-ST012
title: Storage Security, License, Browser, Performance, and Phase Exit Review
status: ready
type: fullstack
priority: high
phase: phase-3-licensed-content-library-and-listening
depends_on:
  - EP3-ST005
  - EP3-ST006
  - EP3-ST007
  - EP3-ST008
  - EP3-ST009
  - EP3-ST010
  - EP3-ST011
allowed_paths:
  - apps/api/src/modules/access/**
  - apps/api/src/modules/content-governance/**
  - apps/api/src/modules/drive-inventory/**
  - apps/api/src/modules/library/**
  - apps/api/test/**
  - apps/web/src/app/library/**
  - apps/web/src/features/library/**
  - apps/web/src/widgets/library/**
  - apps/web/src/shared/**
  - tests/e2e/library-catalog.spec.ts
  - tests/e2e/library-links.spec.ts
  - tests/e2e/library-listening.spec.ts
  - tests/e2e/library-player.spec.ts
  - tests/e2e/library-shadowing.spec.ts
  - docs/07_DATABASE_DESIGN.md
  - docs/08_API_CONTRACT.md
  - docs/09_UI_DESIGN_SYSTEM.md
  - docs/10_TEST_STRATEGY.md
  - docs/11_SECURITY_PLAN.md
  - docs/12_DEPLOYMENT_PLAN.md
  - stories/**
  - _bmad-output/implementation-artifacts/sprint-status.yaml
  - _bmad-output/planning-artifacts/story-map.md
forbidden_paths:
  - apps/api/.env
  - apps/api/prisma/**
  - apps/api/src/modules/auth/**
  - apps/api/src/modules/toeic/**
  - apps/api/src/modules/ai-gateway/**
  - apps/web/src/app/admin/**
  - package.json
  - pnpm-lock.yaml
  - .github/**
  - main
requires_human_approval: false
max_fix_rounds: 2
risk: high
delivery_mode: full
---

# Story: Storage Security, License, Browser, Performance, and Phase Exit Review

## Goal

Close Phase 3 with evidence that the licensed library is safe to operate as a
learner beta: private source and storage data stay operator-side, rights and
publication gates fail closed, learner journeys work on mobile, and the
approved quality gates are reproducible without provider credentials.

## Scope

Audit and harden the already implemented Phase 3 catalogue, item, media,
listening, shadowing, progress, and related-learning paths. Reuse the existing
governance/access/storage adapters and local reviewed batch. Fix only defects
that are inside the Phase 3 contracts, add focused regression evidence, and
record the phase-exit evidence in the approved documentation. Do not activate a
real provider, add a license, change production data, add a migration, or begin
Phase 4/5 work.

## Acceptance Criteria

- Every learner-facing library response and browser journey exposes only safe
  projections: no Drive/provider locator, object key, checksum, rights owner,
  review evidence, private source URL, or operator identity reaches catalogue,
  item, media, drill, shadowing, progress, or related-learning payloads.
- Storage state handling fails closed and remains explicit for `AVAILABLE`,
  `PENDING`, `QUARANTINED`, and `RETIRED`; unavailable or ineligible content
  cannot be played or used to create learner progress. Unknown, withdrawn,
  expired, rejected, conflicted, and wrong-tier versions remain unavailable.
- License/review/publication checks are server-owned and deterministic. The
  reviewed local batch remains credential-free, replay-safe, bounded, and
  atomic; no real Drive, Supabase storage, CDN, or third-party provider is
  contacted by tests or local runtime.
- The browser journeys for catalogue, item/player, listening drill, shadowing,
  and related links cover loading, success, empty, unavailable/error-retry,
  keyboard/focus, mobile 360px layout, and no serious or critical accessibility
  regressions. Existing learner progress and redaction behavior remains intact.
- Add or tighten unit, API E2E, and browser regression coverage for any finding
  in this review, including negative disclosure assertions and deterministic
  pagination/filter behavior. Run the full project gate and record real counts.
- Update the approved API, security, test, deployment, and database
  documentation with the final Phase 3 boundary and evidence. Mark EP3-ST012
  done only when all EP3 stories are done, no Phase 3 story is ready,
  in-progress, review, or blocked, and the next dependency is EP4-ST001.
- Keep changes additive and within allowed paths. If real provider activation,
  legal/rightsholder approval, production credentials, destructive migration,
  CI/firewall/service changes, or a new paid dependency is required, create an
  AI request and leave this story blocked instead of assuming approval.

## Verification

- `node scripts/story-doctor.mjs stories/ready/EP3-ST012-licensed-library-phase-exit-review.md`
- `pnpm story:verify stories/in-progress/EP3-ST012-licensed-library-phase-exit-review.md`
- `pnpm --filter api test -- --runInBand "content-governance|drive-inventory|library|access"`
- `pnpm --filter api test:e2e -- library-catalog.e2e-spec.ts library-media.e2e-spec.ts library-links.e2e-spec.ts library-reviewed-batch.e2e-spec.ts`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm e2e`
- `git diff --check`

## Implementation Guardrails

- Keep controllers thin and preserve the existing access policy, catalogue
  service, controlled-media adapter, governance policy, and local fixture
  boundaries. Do not bypass server eligibility checks in the browser.
- Preserve the learner-safe projection contracts and all existing loading,
  empty, unavailable, error, and success states. Do not invent a second source
  of taxonomy, progress, storage state, or licensing truth.
- Do not modify Prisma schema/migrations, auth, TOEIC, AI gateway, package
  dependencies, credentials, `.env`, CI, or production deployment files.
- Treat external review harness failure as an environment limitation only when
  evidenced; perform a manual high-risk review and record exact commands and
  results before merging.

## Definition of Done

Phase 3 learner library contracts are safe, tested, redacted, mobile-usable,
and reproducibly gated; documentation and lifecycle artifacts agree; EP3-ST012
is done on `dev`; no Phase 3 blocker remains and EP4-ST001 is the only next
dependency-ready story.

## Story Creation Notes

- Created after EP3-ST011 recovery commit `3f1a142` and close commit `71770e5`.
- EP3-ST011 blocked history remains preserved; this story is a phase-exit review,
  not a retry or replacement for any earlier story.
