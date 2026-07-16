---
id: EP0-ST009
title: Frontend Architecture and Design Governance
status: review
type: documentation
priority: high
phase: phase-0-foundation
allowed_paths:
  - docs/05_FRONTEND_ARCHITECTURE.md
  - docs/09_UI_DESIGN_SYSTEM.md
  - ai-skills/project/frontend-rules.md
  - stories/**
forbidden_paths:
  - apps/**
  - packages/**
  - scripts/**
  - .env
  - notes/englishpath_product_spec.md
requires_human_approval: false
max_fix_rounds: 1
---

# Story: Frontend Architecture and Design Governance

## Goal

Define the frontend structure and visual system required before implementing the
EnglishPath landing page and subsequent Phase 1 learning experiences.

## Business Rules

- EnglishPath serves Vietnamese learners and must feel encouraging, credible, and
  focused on daily progress rather than generic SaaS marketing.
- Frontend implementation uses Next.js App Router, TypeScript, Tailwind CSS,
  FSD-style boundaries, shared UI, TanStack Query, Zustand, React Hook Form, and Zod.
- Route files remain thin and business logic stays in features/entities/shared layers.
- Product specifications remain unchanged.

## Requirements

- Define route, feature, entity, widget, and shared-layer responsibilities.
- Define server/client component, data fetching, state, form, validation, and error rules.
- Define the EnglishPath visual direction, color tokens, typography, spacing, radii,
  responsive breakpoints, accessibility, motion, and component-state rules.
- Include guidance for landing pages and application/learning surfaces.
- Provide concise agent-facing frontend rules aligned with both documents.
- Do not implement UI or add dependencies in this story.

## Acceptance Criteria

- Both frontend governance documents are non-empty and EnglishPath-specific.
- Architecture rules prevent business logic from accumulating in route files.
- Visual rules avoid default template styling, purple bias, random gradients, and
  interchangeable SaaS layouts.
- Mobile-first, accessibility, loading, empty, error, and success states are mandatory.
- The next landing-page story can derive structure and styling without inventing a new system.
- Repository gates remain green.

## Verification

- node scripts/story-doctor.mjs stories/ready/EP0-ST009-frontend-design-governance.md --ready-only
- pnpm story:test
- pnpm story:checks
- git diff --check



## Recovery Report

- Failed step: "node" "scripts/codex-runner.mjs" "plan" ".codex-plan-task.md"
- Exit code: 1
- Attempts: 2
- Summary: The automated loop could not complete this story.
- Recovery: The outer project manager implemented the validated Codex plan after the phase contract rejected heading capitalization.

### Evidence

```text
Command failed with exit code 1: "node" "scripts/codex-runner.mjs" "plan" ".codex-plan-task.md"
```

## Verification Report

- `pnpm story:test`: passed, 28/28 tests.
- `pnpm story:checks`: passed lint, typecheck, unit tests, API e2e, and builds.
- Story doctor, story verifier, and `git diff --check`: passed.
- Codex review confirmed the FSD boundaries, accessibility rules, and visual direction;
  the requested landing-page widget stack was added.
- The lifecycle finding is resolved by this tracked move to `review`.
