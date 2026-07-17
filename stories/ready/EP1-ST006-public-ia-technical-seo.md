---
id: EP1-ST006
title: Public Information Architecture And Technical SEO
status: ready
type: frontend
priority: high
phase: phase-1-learning-core
allowed_paths:
  - apps/web/src/app/**
  - apps/web/src/entities/article/**
  - apps/web/src/widgets/public-home/**
  - apps/web/src/widgets/public-blog/**
  - apps/web/src/shared/seo/**
  - tests/e2e/**
  - docs/05_FRONTEND_ARCHITECTURE.md
  - docs/10_TEST_STRATEGY.md
  - stories/**
forbidden_paths:
  - notes/**
  - apps/api/**
  - apps/web/package.json
  - pnpm-lock.yaml
  - .env
requires_human_approval: false
max_fix_rounds: 3
---

# Story: Public Information Architecture And Technical SEO

## Goal

Make the landing and blog consistently discoverable and crawlable with canonical local
origin handling, route metadata, sitemap, robots, social previews, and meaningful
internal links without adding deployment credentials or inventing unavailable pages.

## Dependency

- Requires completed `EP1-ST005` landing and guest-trial recovery.
- Preserves completed `EP1-ST002` blog content/canonical-origin behavior.
- Production origin remains configurable; local default is `http://localhost:5173`.
- CMS, analytics providers, production deployment, and ten-post launch content belong to
  later stories.

## Requirements

- Add Next metadata routes for `/sitemap.xml` and `/robots.txt` covering only real public
  landing, blog index, and published article routes.
- Use the shared canonical-origin resolver for absolute canonical, Open Graph, sitemap,
  and robots URLs; reject malformed/trailing origin configuration as already documented.
- Add route-specific canonical metadata, Vietnamese title/description, Open Graph type,
  and share metadata without remote placeholder images.
- Ensure landing, blog index, and articles have crawlable bidirectional internal links
  with meaningful labels and no fake auth/pricing/product routes.
- Keep one H1 per route, semantic landmarks, stable static generation, and no hydration
  requirement for SEO data.
- Add unit/browser tests for local-origin defaults, sitemap/robots output, metadata,
  internal links, route status, 360px behavior, and serious/critical axe findings.

## Acceptance Criteria

- `/`, `/blog`, every published article, `/sitemap.xml`, and `/robots.txt` build and
  return correct indexable local URLs without credentials or network.
- Sitemap contains no duplicate, draft, admin, API, auth, or nonexistent route.
- Canonical/Open Graph URLs use one normalized origin and article metadata remains
  article-specific.
- Internal links connect landing, blog index, and article detail without dead targets.
- Full checks, story verification, diff check, and Codex review pass with no P0/P1.

## Verification

- `pnpm story:checks`
- `pnpm story:verify stories/review/EP1-ST006-public-ia-technical-seo.md`
- `git diff --check`
