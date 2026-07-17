---
id: EP1-ST003
title: Landing Review Remediation
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

# Story: Landing Review Remediation

## Goal

Recover the validated EP1-ST001 landing implementation from commit `e77838f`, close
its remaining review findings, and deliver the public landing page without bypassing
the original story's fix-round limit.

## Business Rules

- Preserve the free-first Vietnamese learner positioning and the documented nine-widget
  composition from EP1-ST001.
- Do not add unavailable auth, AI, premium, API, or personalized functionality.
- Follow `docs/05_FRONTEND_ARCHITECTURE.md` and `docs/09_UI_DESIGN_SYSTEM.md`.
- EP1-ST001 remains an immutable audit record; this follow-up owns remediation.

## FE Requirements

- Preserve named PublicHeader, Hero, LearningLoop, PathPreview, OutcomeProof,
  HowItWorks, ContentPreview, FinalCallToAction, and PublicFooter components.
- Replace level-only path cards with clear 30/60/90/120-day roadmap options mapped to
  appropriate learner goals.
- Give OutcomeProof a semantic heading while retaining the editorial quotation.
- Ensure every brand/navigation/CTA link has a minimum 44x44px interaction target.
- Remove text opacity combinations that fail WCAG AA on colored cards.
- Express translucent borders, shadows, decorative colors, and text colors through
  semantic CSS variables instead of raw UI `rgba()` values.
- Preserve visible responsive navigation, 360px no-overflow behavior, reduced motion,
  Vietnamese metadata, and the thin route composition.

## Acceptance Criteria

- All five remaining EP1-ST001 P1 findings are closed.
- The complete original landing acceptance criteria still hold.
- No changed paths fall outside the allowed list.
- Web lint, typecheck, production build, tests, story checks, and diff check pass.
- A fresh Codex read-only review returns pass with no P0/P1 findings.

## Verification

- node scripts/story-doctor.mjs stories/ready/EP1-ST003-landing-review-remediation.md --ready-only
- pnpm --filter web lint
- pnpm --filter web typecheck
- pnpm --filter web build
- pnpm story:checks
- git diff --check
