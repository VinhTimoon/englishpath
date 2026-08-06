---
id: EP1-ST030
title: Governed CMS Taxonomy And Content Authoring UI
status: done
type: frontend
priority: high
phase: phase-1-learning-core
risk: high
delivery_mode: full-review
depends_on:
  - EP1-ST028
  - EP1-ST029
allowed_paths:
  - apps/web/src/app/admin/**
  - apps/web/src/features/admin/**
  - apps/web/src/widgets/admin/**
  - apps/web/src/shared/api/**
  - apps/web/src/shared/ui/**
  - apps/web/test/**
  - apps/web/tests/**
  - tests/e2e/**
  - docs/08_API_CONTRACT.md
  - docs/09_UI_DESIGN_SYSTEM.md
  - docs/10_TEST_STRATEGY.md
  - stories/ready/EP1-ST030-cms-import-and-admin-content-ui.md
  - stories/in-progress/EP1-ST030-cms-import-and-admin-content-ui.md
  - stories/review/EP1-ST030-cms-import-and-admin-content-ui.md
  - stories/done/EP1-ST030-cms-import-and-admin-content-ui.md
  - stories/blocked/EP1-ST030-cms-import-and-admin-content-ui.md
  - _bmad-output/planning-artifacts/story-map.md
  - _bmad-output/implementation-artifacts/sprint-status.yaml
forbidden_paths:
  - apps/api/**
  - apps/web/.env
  - apps/web/.env.local
  - "**/package.json"
  - "**/pnpm-lock.yaml"
  - packages/**
  - provider configuration
  - production credentials
  - main
  - learner routes outside `/admin`
  - automatic publish or client-side lifecycle override
requires_human_approval: false
max_fix_rounds: 2
---

# Story: Governed CMS Taxonomy And Content Authoring UI

## Goal

As a content editor or administrator, I want a safe CMS workspace for taxonomy
and governed content drafts, review, and publication, so that I can operate the
Phase 1 content lifecycle without bypassing backend authorization or rights policy.

This story consumes the `/api/v1/cms` contract from `EP1-ST029`. It does not add an
import worker, provider integration, content seed batch, learner route, or new
publication policy.

## Acceptance Criteria

1. `/admin` exposes a responsive CMS workspace only after the existing backend
   admin authentication boundary succeeds; `FREE_USER` and unauthenticated states
   remain denied/sanitized and no CMS controls render as if authorized.
2. Editors can load taxonomy nodes from the API, see deterministic pagination, and
   create a child node with field-level validation. Taxonomy options come from the
   API; no level/topic/track/skill/TOEIC taxonomy is hard-coded in the UI.
3. Editors can create a bounded content draft with title/body, taxonomy reference,
   provenance, usage/access, source/checksum/version, and rights metadata. The UI
   submits a stable client request key and handles replay without duplicate rows.
4. The workspace shows draft/review/published states from the server and exposes
   review/publish actions only for the role/capability returned by the API contract;
   the client never sends an approval boolean, reviewer identity claim, or publish
   override. Backend conflict/forbidden responses remain safe and actionable.
5. Every panel has loading, empty, error/retry, and success states. Mutations disable
   duplicate submission, preserve accessible focus/status announcements, and do not
   expose private source URLs, rights-owner data, raw reviewer evidence, tokens, or
   database errors in rendered UI.
6. The admin workspace remains usable at 360px, supports keyboard navigation and
   visible focus, uses the approved UI design system, and has no serious/critical
   axe violations. Existing learner/public routes and admin overview behavior stay
   unchanged.
7. Targeted unit/component/browser tests cover denied/loading/empty/error/success,
   strict envelope parsing, taxonomy-driven forms, idempotent draft replay, review
   and publish capability gating, mobile layout, keyboard behavior, and redaction.

## Implementation Boundaries

- Reuse the existing admin shell, API client, auth session, shared UI primitives,
  and frontend quality patterns; keep route files thin.
- Use the EP1-ST029 endpoint contract and response metadata exactly; do not call
  Prisma, Supabase, storage, or providers from the browser.
- Treat backend role/permission and lifecycle state as authoritative. A hidden or
  disabled button is not authorization; the API response must still be handled.
- Do not modify API, database, learner vocabulary, auth storage, credentials, or
  package manifests in this story.

## Verification

- `node scripts/story-doctor.mjs stories/ready/EP1-ST030-cms-import-and-admin-content-ui.md --ready-only`
- `pnpm story:verify stories/ready/EP1-ST030-cms-import-and-admin-content-ui.md`
- `pnpm format:check`
- `pnpm planning:traceability`
- `pnpm tool:test`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm e2e -- tests/e2e/admin-shell.spec.ts tests/e2e/cms-authoring.spec.ts`
- `git diff --check`

## Dev Notes

- Relevant contracts: `docs/08_API_CONTRACT.md` CMS section and
  `docs/09_UI_DESIGN_SYSTEM.md`.
- Existing frontend admin sources: `apps/web/src/app/admin/**`,
  `apps/web/src/features/admin/**`, and `apps/web/src/widgets/admin/**`.
- The backend is authoritative for content review, rights, publication, and audit;
  this UI must never recreate those rules with local state.

## Completion Evidence

- Story doctor passed on the in-progress lifecycle file.
- Story verification passed with all changed files inside the declared path policy.
- `pnpm format:check` passed.
- `pnpm planning:traceability` passed.
- `pnpm tool:test` passed: 59/59.
- `pnpm prisma:validate` passed.
- `pnpm lint` passed.
- `pnpm typecheck` passed.
- `pnpm test` passed: 31 suites, 290 tests.
- `pnpm build` passed for API and web.
- `pnpm e2e` passed: 46/46 browser tests, including CMS authoring, denial,
  redaction, retry, mobile, and accessibility coverage.
- `git diff --check` passed.
- Manual adversarial review covered backend-authoritative permissions, strict
  response parsing, stable mutation request keys, duplicate-submit prevention,
  redaction, lifecycle state handling, and learner-route isolation. The Codex
  CLI review subprocess was attempted but exceeded the external 240-second
  runner cap without returning an artifact; it is not counted as a passing
  automated review.
