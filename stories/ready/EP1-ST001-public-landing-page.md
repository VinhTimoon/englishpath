---
id: EP1-ST001
title: Public Landing Page
status: ready
type: frontend
priority: critical
phase: phase-1-mvp
allowed_paths:
  - apps/web/src/app/page.tsx
  - apps/web/src/app/layout.tsx
  - apps/web/src/app/globals.css
  - apps/web/src/widgets/public-home/**
  - apps/web/src/shared/ui/**
  - apps/web/public/**
  - stories/**
forbidden_paths:
  - apps/api/**
  - apps/web/src/app/api/**
  - packages/**
  - .env
  - notes/englishpath_product_spec.md
requires_human_approval: false
max_fix_rounds: 2
---

# Story: Public Landing Page

## Goal

Replace the default Next.js screen with a credible, mobile-first EnglishPath landing
page that communicates the free daily-learning value and guides visitors to begin.

## Business Rules

- EnglishPath is free-first and serves Vietnamese English learners.
- The page promises practical daily progress without implying unavailable AI,
  premium, authentication, or personalized features.
- Follow `docs/05_FRONTEND_ARCHITECTURE.md` and `docs/09_UI_DESIGN_SYSTEM.md`.
- The route stays thin and composes public-home widgets.

## FE Requirements

- Implement the documented widget order: header, hero, learning loop, path preview,
  outcome proof, how it works, content preview, final CTA, and footer.
- Use the green/amber editorial token system, purposeful typography, textured/atmospheric
  backgrounds, and no purple SaaS defaults.
- Use semantic HTML and responsive navigation without adding dependencies.
- Provide meaningful Vietnamese copy with concise English learning examples.
- Use honest non-functional links such as section anchors; do not fake auth flows.
- Add page metadata appropriate for English learning in Vietnam.
- Keep motion CSS-based, limited, and compatible with reduced-motion preferences.
- Ensure keyboard focus, contrast, heading order, and 44px interactive targets.

## Acceptance Criteria

- The default Next.js/Vercel template content is fully removed.
- Desktop and 360px mobile layouts are polished and free of horizontal overflow.
- The primary value proposition, daily loop, roadmap options, and free-first CTA are clear.
- `page.tsx` remains a thin composition layer.
- No API, authentication, database, or dependency changes are made.
- Lint, typecheck, tests, and production build pass.

## Verification

- node scripts/story-doctor.mjs stories/ready/EP1-ST001-public-landing-page.md --ready-only
- pnpm --filter web lint
- pnpm --filter web typecheck
- pnpm --filter web build
- pnpm story:checks
- git diff --check
