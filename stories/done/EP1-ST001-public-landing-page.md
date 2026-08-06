---
id: EP1-ST001
title: Public Landing Page
status: done
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

## Blocked Report

- Initial failure: Windows `workspace-write` prevented the planning Agent from creating
  `.codex-plan.md`; outer-manager recovery preserved the implementation on commit
  `e77838f` of `story/ep1-st001`.
- Failed gate: Codex read-only review after two fix rounds.
- Passing evidence: web lint, web typecheck, production build, 5 unit tests,
  2 API e2e tests, monorepo story checks, and `git diff --check`.
- Environment limitation: integrated browser was unavailable for rendered 360px QA.

### Remaining P1 Findings

- Muted text using opacity on green cards does not reliably meet WCAG AA contrast.
- Outcome proof uses a blockquote as its accessible section label instead of a heading.
- Brand links expose a 34px rather than 44px interaction target.
- Several translucent UI colors still bypass semantic CSS tokens.
- Path preview needs the documented 30/60/90/120-day options, not only level cards.

## Supersession

Superseded by `EP1-ST005`, which recovers the preserved landing work against product
v2 and adds the required goal-oriented guest trial. Keep this story as historical
review evidence; do not resume it directly.

