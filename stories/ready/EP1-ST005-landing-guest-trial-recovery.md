---
id: EP1-ST005
title: Landing And Goal-Oriented Guest Trial Recovery
status: ready
type: frontend
priority: critical
phase: phase-1-learning-core
allowed_paths:
  - apps/web/src/app/page.tsx
  - apps/web/src/app/layout.tsx
  - apps/web/src/app/globals.css
  - apps/web/src/widgets/public-home/**
  - apps/web/src/shared/ui/**
  - apps/web/public/**
  - tests/e2e/landing-page.spec.ts
  - stories/**
forbidden_paths:
  - notes/**
  - apps/api/**
  - apps/web/src/app/blog/**
  - apps/web/src/entities/article/**
  - apps/web/src/widgets/public-blog/**
  - apps/web/src/app/api/**
  - apps/web/package.json
  - pnpm-lock.yaml
  - .env
requires_human_approval: false
max_fix_rounds: 3
---

# Story: Landing And Goal-Oriented Guest Trial Recovery

## Goal

Replace the default Next.js home screen by selectively recovering the preserved landing
work from commit `7dc086b`, close its remaining accessibility findings, and add a
credential-free goal-oriented guest trial aligned with product specification v2.

## Dependency

- Requires completed `EP0-ST022` observability foundation on `dev`.
- Supersedes blocked historical stories `EP1-ST001` and `EP1-ST003`; those files remain
  immutable audit evidence.
- `EP1-ST006` owns technical SEO and public information architecture after this story.
- Auth, persistence, placement, personalized roadmaps, analytics providers, and paid
  features belong to later stories.

## Business Rules

- EnglishPath remains free-first and serves Vietnamese learners without pricing pressure.
- A guest may explore a demo, sample roadmap, vocabulary, quiz, and daily sentence but
  cannot save progress, access a full test, use private error history, or receive a
  persisted personalized roadmap.
- The guest trial offers the seven v2 primary goals: English foundation, daily
  communication, four-skill English, workplace English, TOEIC Listening and Reading,
  TOEIC Speaking and Writing, and TOEIC four skills.
- Recover only the allowed landing files from `7dc086b`; do not merge or cherry-pick its
  branch because current blog and SEO work on `dev` must remain intact.
- Do not present unavailable auth, AI, premium, API, scoring, or persistence behavior as
  functional. Demo state stays local and is clearly labeled as a preview.

## FE Requirements

- Preserve the named `PublicHeader`, `Hero`, `LearningLoop`, `PathPreview`,
  `OutcomeProof`, `HowItWorks`, `ContentPreview`, `FinalCallToAction`, and `PublicFooter`
  composition documented in `docs/05_FRONTEND_ARCHITECTURE.md`.
- Add a keyboard-operable guest-trial experience that lets a visitor select one primary
  goal and see a matching local sample day with roadmap duration, vocabulary, quiz, and
  daily-sentence preview plus a clear no-save disclosure.
- Keep the route thin and isolate guest-trial behavior from static section composition.
- Close the preserved P1 findings: use surface-aware focus indicators with at least 3:1
  contrast and retain readable text on the amber 60-day roadmap card regardless of CSS
  selector order.
- Preserve semantic headings, visible navigation, minimum 44x44px targets, reduced
  motion, Vietnamese metadata, responsive behavior, and no horizontal overflow at 360px.
- Use the semantic tokens and visual direction in `docs/09_UI_DESIGN_SYSTEM.md`; do not
  introduce raw component colors, generic SaaS sections, or a dark-mode redesign.
- Extend browser coverage for goal selection, visible sample update, keyboard focus,
  no-save disclosure, 360px overflow, and serious/critical accessibility violations.

## Acceptance Criteria

- The home route no longer renders the default Next.js starter screen and all nine
  documented public widgets are present in order.
- Every v2 primary goal is available in the guest trial and selecting a different goal
  deterministically changes the local sample without network, credentials, or storage.
- The preview accurately states guest limitations and does not expose a fake working
  sign-in, full-test, AI, payment, or progress-saving flow.
- Existing `/blog` routes, article data, canonical-origin behavior, and public-blog files
  are unchanged and still build.
- Focus visibility and amber-card contrast findings are closed; keyboard operation,
  heading structure, 44px targets, reduced motion, 360px no-overflow, and axe checks pass.
- Full repository checks, diff check, story verification, and read-only Codex review pass
  with no P0/P1 findings.

## Verification

- `pnpm format:check`
- `pnpm planning:traceability`
- `pnpm tool:test`
- `pnpm prisma:validate`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm --filter api test:e2e`
- `pnpm build`
- `pnpm e2e`
- `pnpm story:verify stories/review/EP1-ST005-landing-guest-trial-recovery.md`
- `git diff --check`
