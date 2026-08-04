---
id: EP1-ST037
title: Expand Indexable Blog Baseline
status: ready
type: content
priority: medium
phase: phase-1-learning-core
risk: low
delivery_mode: fast
depends_on:
  - EP1-ST006
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
  - stories/ready/EP1-ST037-indexable-blog-baseline.md
  - stories/in-progress/EP1-ST037-indexable-blog-baseline.md
  - stories/review/EP1-ST037-indexable-blog-baseline.md
  - stories/done/EP1-ST037-indexable-blog-baseline.md
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

# Story: Expand Indexable Blog Baseline

## Goal

Provide a useful, original, Vietnamese-first public learning library with ten
indexable articles so guest learners have credible practice guidance before signup.

## Acceptance Criteria

- The blog index exposes ten distinct published articles with useful titles,
  summaries, categories, reading time, stable slugs, and Vietnamese diacritics.
- Every article has a working detail route, canonical metadata, safe Article/FAQ JSON-LD
  where applicable, and internal links that do not produce dead routes.
- Sitemap output includes all published article routes; unpublished or invalid records
  are not emitted. Existing robots policy remains intact.
- Content is original English-learning guidance for Vietnamese learners, contains no
  unverified claims, leaked answers, private data, or unlicensed copied passages.
- Blog index/detail loading, empty/not-found, success, responsive, and keyboard
  behavior remain covered by focused tests; existing public routes remain stable.
- Changes stay within allowed paths, use approved UI tokens, and fresh scoped checks
  plus diff inspection pass.

## Implementation Boundaries

- Keep article data typed and deterministic; do not add CMS APIs, admin workflows,
  provider SDKs, dependencies, credentials, or Phase 2 content.
- Use the existing editorial public-blog components and metadata conventions. Fix
  encoding only where touched by this story; do not broaden into a redesign.

## Verification

- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm e2e`
- `node scripts/story-doctor.mjs stories/ready/EP1-ST037-indexable-blog-baseline.md --ready-only`
- `pnpm story:verify stories/ready/EP1-ST037-indexable-blog-baseline.md`
- `git diff --check`
