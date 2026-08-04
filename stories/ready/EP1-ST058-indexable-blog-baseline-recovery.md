---
id: EP1-ST058
title: Indexable Blog Baseline Recovery
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
  - stories/ready/EP1-ST058-indexable-blog-baseline-recovery.md
  - stories/in-progress/EP1-ST058-indexable-blog-baseline-recovery.md
  - stories/review/EP1-ST058-indexable-blog-baseline-recovery.md
  - stories/done/EP1-ST058-indexable-blog-baseline-recovery.md
  - stories/blocked/EP1-ST058-indexable-blog-baseline-recovery.md
  - stories/blocked/EP1-ST037-indexable-blog-baseline.md
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

# Story: Indexable Blog Baseline Recovery

## Goal

Complete the approved ten-article public learning library after `EP1-ST037` was
blocked by a stale branch collision. `EP1-ST037` and branch `story/ep1-st037` remain
historical evidence and must not be resumed or merged.

## Acceptance Criteria

- The blog index exposes ten distinct original Vietnamese-first learning articles
  with stable slugs, useful metadata, categories, summaries, and reading times.
- Every published article has a working detail route, canonical metadata, safe
  Article/FAQ JSON-LD where applicable, and valid internal related links.
- Sitemap includes only valid published article routes; robots policy remains intact.
- Touched Vietnamese content renders with correct diacritics and contains no private
  data, leaked answers, unverified claims, or unlicensed copied passages.
- Focused tests cover ten entries, detail/not-found, metadata/JSON-LD, sitemap links,
  responsive and keyboard behavior; no API, dependency, environment, CMS, or main
  changes are introduced.

## Verification

- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm e2e`
- `node scripts/story-doctor.mjs stories/ready/EP1-ST058-indexable-blog-baseline-recovery.md --ready-only`
- `pnpm story:verify stories/ready/EP1-ST058-indexable-blog-baseline-recovery.md`
- `git diff --check`
