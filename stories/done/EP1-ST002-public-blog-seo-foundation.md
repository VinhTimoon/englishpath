---
id: EP1-ST002
title: Public Blog SEO Foundation
status: done
type: frontend
priority: critical
phase: phase-1-mvp
allowed_paths:
  - apps/web/src/app/blog/**
  - apps/web/src/entities/article/**
  - apps/web/src/widgets/public-blog/**
  - apps/web/src/shared/ui/**
  - apps/web/public/**
  - stories/**
forbidden_paths:
  - apps/api/**
  - apps/web/src/app/page.tsx
  - apps/web/src/app/layout.tsx
  - apps/web/src/app/globals.css
  - packages/**
  - .env
  - notes/englishpath_product_spec.md
requires_human_approval: false
max_fix_rounds: 2
---

# Story: Public Blog SEO Foundation

## Goal

Create an indexable public blog foundation that demonstrates EnglishPath's useful,
free-first learning content and supports future CMS/API integration without adding a
database in this story.

## Business Rules

- Blog content serves Vietnamese English learners and builds authority around daily
  English, learning strategy, grammar, vocabulary, and TOEIC.
- Use a small typed, local seed collection as an explicit temporary content source.
- Do not present current-affairs claims or fabricated learner results.
- Every published seed article has title, slug, SEO title, meta description, excerpt,
  category, tags, body sections, FAQ, related learning links, and publication dates.
- Follow `docs/05_FRONTEND_ARCHITECTURE.md`, `docs/09_UI_DESIGN_SYSTEM.md`, and
  `docs/10_TEST_STRATEGY.md`.

## FE Requirements

- Add `/blog` with a clear heading, category overview, one featured article, and a
  responsive article grid containing at least three useful seed articles.
- Add `/blog/[slug]` as a statically generated Server Component route.
- Generate route metadata from article data and return `notFound()` for unknown slugs.
- Article pages use semantic `article`, heading hierarchy, readable measure, publication
  metadata, tags, learning callouts, FAQ, and related article navigation.
- Emit valid `Article` and `FAQPage` JSON-LD from trusted local data without raw user HTML.
- Keep route files thin; article types/data belong in `entities/article`, and page
  composition belongs in `widgets/public-blog`.
- Use a scoped CSS module and existing global design tokens with local fallbacks; do not
  change global styles or the root layout.
- Support 360px layouts, visible keyboard focus, WCAG AA contrast, and 44px link targets.
- No client state, API calls, database, auth, analytics, images, or new dependencies.

## Acceptance Criteria

- `/blog` and every seeded `/blog/[slug]` path build as static HTML.
- Unknown article slugs use the Next.js not-found flow.
- Metadata, canonical path, Article JSON-LD, and FAQ JSON-LD match each article.
- Vietnamese diacritics and English examples render as text, not unsafe HTML.
- The blog index provides meaningful discovery without fake filters or controls.
- All changed files stay within allowed paths.
- Web lint, typecheck, production build, monorepo tests, and story checks pass.

## Verification

- node scripts/story-doctor.mjs stories/ready/EP1-ST002-public-blog-seo-foundation.md --ready-only
- pnpm --filter web lint
- pnpm --filter web typecheck
- node --experimental-strip-types --test apps/web/src/entities/article/config/site-origin.test.mjs
- pnpm --filter web build
- pnpm story:checks
- git diff --check

## Blocked Report

- Initial loop failure: Windows `workspace-write` patch enforcement could not create
  `.codex-plan.md`; outer-manager recovery preserved the implementation on commit
  `54fa149` of `story/ep1-st002`.
- Passing evidence: web lint, typecheck, production build with `/blog` plus three SSG
  article routes, monorepo story checks, 5 unit tests, 2 API e2e tests, and diff check.
- Review fix round closed `dynamicParams`, focus contrast, stable section IDs, and the
  Vietnamese language boundary findings.

### Decision Needed

- SEO canonical URLs and Article `mainEntityOfPage` require the approved production
  site origin. The repository and product spec do not define a domain, and this story
  must not invent one. See `notes/ai-req/2026-07-17-production-site-origin.md`.

### Decision Resolution

- On 2026-07-17, the project owner approved `http://localhost:3000` as the temporary
  local origin because the site has not been deployed to Vercel.
- Web code must prefer `NEXT_PUBLIC_SITE_URL` when configured and use the local origin
  only as a development/build fallback.
- Before public deployment, Vercel must define `NEXT_PUBLIC_SITE_URL` with the final
  HTTPS origin and no trailing slash.


