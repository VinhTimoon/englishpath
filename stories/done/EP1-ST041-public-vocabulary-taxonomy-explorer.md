---
id: EP1-ST041
title: Public Vocabulary Taxonomy Explorer
status: done
type: frontend
priority: high
phase: phase-1-learning-core
allowed_paths:
  - apps/web/src/app/**
  - apps/web/src/entities/vocabulary/**
  - apps/web/src/features/explore-vocabulary/**
  - apps/web/src/shared/api/**
  - apps/web/src/widgets/public-vocabulary/**
  - apps/web/src/widgets/public-home/**
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

# Story: Public Vocabulary Taxonomy Explorer

## Goal

Give visitors a useful, accessible public vocabulary taxonomy explorer backed by the
real `EP1-ST017A` API contract, without pretending that SRS, mastery, review, or saved
progress exists before authenticated learning stories are complete.

## Dependency

- Requires completed `EP1-ST040` hardened vocabulary API.
- This is a public read-only subset split from `EP1-ST019`; authenticated item review and
  mastery UI remain blocked behind `EP1-ST018` and `EP1-ST008`.
- Local FE origin is `http://localhost:5173`; local API base is
  `http://localhost:3000/api/v1` through validated public configuration.

## Requirements

- Add `/vocabulary` with Vietnamese canonical/social metadata, one H1, semantic
  landmarks, and a crawlable explanation of the six v2 vocabulary levels.
- Add a typed `shared/api` client that validates the public API base, uses finite timeout,
  accepts only the documented envelope shape, and normalizes errors without leaking raw
  responses or provider details.
- Use TanStack Query at a minimal client boundary for topic and mindmap data; provide
  meaningful skeleton, retryable error, empty, filtered-empty, and success states.
- Provide keyboard-operable level, track, skill, and TOEIC Part filters with shareable
  URL search parameters and bounded mindmap depth/root selection.
- Render `domain -> topic -> subtopic` as a semantic nested tree, show vocabulary counts
  and relevant levels/skills/TOEIC Parts, and preserve backend ordering.
- Clearly disclose that guest exploration does not save mastery or review progress; do
  not add fake vocabulary items, auth, SRS, XP, streak, or completion behavior.
- Link landing/header/footer to the real route and include it in sitemap/internal-link
  coverage without introducing dead routes.
- Add browser tests with intercepted contract responses for loading, success, filters,
  URL state, error/retry, empty states, keyboard operation, no overflow at 360px, and
  serious/critical axe findings; tests require no live API or credentials.

## Acceptance Criteria

- `/vocabulary` builds without a running API and becomes interactive against BE port
  3000 at runtime; browser tests are deterministic through network interception.
- The explorer handles all operational states and never displays raw governance/source
  evidence or claims to persist learner progress.
- Mobile, keyboard, reduced-motion, semantic heading/tree, and accessibility gates pass.
- No backend, dependency, lockfile, environment, auth, SRS, or learner-state change.
- Full checks, story verification, diff check, and Codex review pass with no P0/P1.

## Verification

- `pnpm story:checks`
- `pnpm story:verify stories/review/EP1-ST041-public-vocabulary-taxonomy-explorer.md`
- `git diff --check`

## Implementation Report

- Added a statically rendered `/vocabulary` route with Vietnamese canonical/social
  metadata, one H1, semantic landmarks, six crawlable v2 levels, and guest disclosure.
- Added a strict Zod vocabulary contract plus a validated `/api/v1` client with an
  eight-second timeout and normalized configuration/network/timeout/response errors.
- Added a minimal TanStack Query client boundary with URL-owned level, track, skill,
  TOEIC Part, root, and depth filters and finite automatic/manual retry behavior.
- Added skeleton, sanitized error, catalogue-empty, filtered-empty, and success states;
  the semantic nested list preserves backend domain/topic/subtopic order and evidence.
- Added the real route to landing navigation and sitemap without adding auth, SRS,
  mastery, progress, vocabulary items, dependencies, environment files, or backend code.
- Added intercepted browser coverage for loading, strict parsing, URL/keyboard filters,
  retry, empty states, nested ordering, guest disclosure, 360px containment, and axe.
- The Codex build agent timed out before writing source; the manager implemented the
  accepted Codex plan and retained independent Codex review as the approval gate.

