---
id: EP1-ST061
title: Indexable Blog Browser Gate Recovery
status: done
type: qa
priority: high
phase: phase-1-learning-core
risk: medium
delivery_mode: review-required
depends_on:
  - EP1-ST006
blocked_evidence:
  - EP1-ST037
  - EP1-ST058
  - EP1-ST059
  - EP1-ST060
allowed_paths:
  - apps/web/src/app/blog/**
  - apps/web/src/entities/article/**
  - apps/web/src/widgets/public-blog/**
  - apps/web/src/shared/seo/**
  - apps/web/src/app/sitemap.ts
  - apps/web/src/app/robots.ts
  - apps/web/test/**
  - apps/web/tests/**
  - tests/e2e/**
  - playwright.config.ts
  - docs/09_UI_DESIGN_SYSTEM.md
  - docs/10_TEST_STRATEGY.md
  - stories/ready/EP1-ST061-indexable-blog-browser-gate-recovery.md
  - stories/in-progress/EP1-ST061-indexable-blog-browser-gate-recovery.md
  - stories/review/EP1-ST061-indexable-blog-browser-gate-recovery.md
  - stories/done/EP1-ST061-indexable-blog-browser-gate-recovery.md
  - stories/blocked/EP1-ST061-indexable-blog-browser-gate-recovery.md
  - stories/blocked/EP1-ST060-indexable-blog-scoped-review-retry.md
  - _bmad-output/planning-artifacts/story-map.md
  - _bmad-output/implementation-artifacts/sprint-status.yaml
forbidden_paths:
  - apps/api/**
  - apps/api/prisma/**
  - packages/**
  - "**/package.json"
  - "**/pnpm-lock.yaml"
  - "**/package-lock.json"
  - "**/yarn.lock"
  - .env
  - .env.*
  - "**/.env"
  - "**/.env.*"
  - provider configuration
  - main
  - paid content or unverified third-party copy
requires_human_approval: false
max_fix_rounds: 2
---

# Story: Indexable Blog Browser Gate Recovery

## Goal

Complete the ten-article public blog and prove its browser journey against an
isolated EnglishPath server port. `EP1-ST060` remains historical blocked evidence;
do not resume or merge its WIP branch.

## Acceptance Criteria

- The public blog exposes ten original Vietnamese-first articles with stable detail
  routes, correct metadata, safe conditional JSON-LD, valid related links, and
  sitemap coverage.
- Playwright starts EnglishPath on an isolated loop-owned port and never reuses an
  unrelated process on port `5173`; the tested page title and origin are EnglishPath.
- Blog index/detail, not-found, responsive, keyboard, metadata, JSON-LD, and sitemap
  journeys pass against the EnglishPath server.
- No backend, dependency, environment, CMS, provider, or `main` changes occur.

## Verification

- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm e2e`
- `node scripts/story-doctor.mjs stories/ready/EP1-ST061-indexable-blog-browser-gate-recovery.md --ready-only`
- `pnpm story:verify stories/ready/EP1-ST061-indexable-blog-browser-gate-recovery.md`
- `git diff --check`

## Blocked Report

- Failed step: `node scripts/codex-runner.mjs build .codex-build-task.md`
- Exit code: 42; the loop stopped after one valid blocked result.
- Build, lint, typecheck, tests, and production build passed; E2E reported 37
  passing tests but reruns timed out because of lingering local server/socket state.
- Review also found learner vocabulary queue/pagination/mindmap defects and missing
  learner-flow browser coverage. Those files are outside this story's allowed paths;
  no unrelated WIP was merged.

## Resolution Evidence

The repository-local blocker is resolved by the verified dev implementation. The
isolated Playwright server now uses port `4173`, the public learning library exposes
ten original articles, and the blog route explicitly renders its scoped not-found
page for unknown slugs. The final browser evidence includes metadata, JSON-LD,
sitemap, no-JavaScript rendering, responsive/axe checks, keyboard navigation, and
the article not-found journey.

Verified on `dev`:

- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm e2e tests/e2e/public-seo.spec.ts`
- `git diff --check`

The 240-second external Codex cap remains an owner decision for `EP1-ST028`; it is
not a blocker for this blog story. Owner completion direction was received on
2026-08-06 after the verified gates above; the story is approved and may be marked
`done`.
