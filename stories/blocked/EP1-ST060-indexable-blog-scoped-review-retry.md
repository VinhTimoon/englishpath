---
id: EP1-ST060
title: Indexable Blog Scoped Review Retry
status: ready
type: content
priority: medium
phase: phase-1-learning-core
risk: low
delivery_mode: fast
depends_on:
  - EP1-ST006
blocked_evidence:
  - EP1-ST037
  - EP1-ST058
  - EP1-ST059
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
  - docs/09_UI_DESIGN_SYSTEM.md
  - docs/10_TEST_STRATEGY.md
  - scripts/create-review-prompt.mjs
  - stories/ready/EP1-ST060-indexable-blog-scoped-review-retry.md
  - stories/in-progress/EP1-ST060-indexable-blog-scoped-review-retry.md
  - stories/review/EP1-ST060-indexable-blog-scoped-review-retry.md
  - stories/done/EP1-ST060-indexable-blog-scoped-review-retry.md
  - stories/blocked/EP1-ST060-indexable-blog-scoped-review-retry.md
  - stories/blocked/EP1-ST059-indexable-blog-baseline-clean-retry.md
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

# Story: Indexable Blog Scoped Review Retry

## Goal

Finish the approved ten-article public learning library with a review prompt that
evaluates only this story's blog scope. `EP1-ST059` and all prior WIP branches remain
historical evidence and must not be resumed or merged.

## Acceptance Criteria

- The blog index exposes ten distinct original Vietnamese-first learning articles
  with stable slugs, metadata, categories, summaries, and reading times.
- Detail routes, canonical/social metadata, safe conditional JSON-LD, related links,
  sitemap entries, robots policy, responsive behavior, and keyboard behavior pass.
- Touched Vietnamese content has correct diacritics and no private, leaked,
  unsupported, or unlicensed content.
- Review reports only current-diff or story-acceptance P0/P1 findings; unrelated
  pre-existing defects are recorded as out-of-scope risks and do not block approval.
- No backend, dependency, environment, CMS, provider, or `main` changes.

## Verification

- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm e2e`
- `node scripts/story-doctor.mjs stories/ready/EP1-ST060-indexable-blog-scoped-review-retry.md --ready-only`
- `pnpm story:verify stories/ready/EP1-ST060-indexable-blog-scoped-review-retry.md`
- `git diff --check`

## Blocked Report

- Failed step: `pnpm e2e` within the checks gate
- Exit code: `1`
- Attempts: `1`
- Summary: The final browser gate was not trustworthy because port `5173` was
  occupied by an unrelated Anh Decor Vite server. The loop stopped without merge.

### Evidence

- Process owner: PID `8364`, unrelated Vite command under `E:\Code_Ky7\EXE101\Project\anh-decor`.
- `Invoke-WebRequest http://localhost:5173/blog` returned title `Anh Decor`, proving
  the gate targeted the wrong application.
- Codex review classified the blocker as external environment/port conflict.
- WIP commit `99d024e` remains only on `story/ep1-st060` and is not merged.
- AI request: `notes/ai-req/2026-08-04-EP1-ST060-e2e-port-conflict.md`.

No external process was stopped or modified.
