---
id: EP1-ST048
title: Format Gate Recovery And Daily Sentence Closure
status: done
type: maintenance
priority: critical
phase: phase-1-learning-core
allowed_paths:
  - tests/e2e/daily-sentence.spec.ts
  - _bmad-output/planning-artifacts/story-map.md
  - scripts/tests/story-tools.test.mjs
  - stories/review/EP1-ST047-daily-sentence-learning-bundle.md
  - stories/done/EP1-ST047-daily-sentence-learning-bundle.md
  - stories/ready/EP1-ST048-format-gate-and-daily-sentence-closure.md
  - stories/done/EP1-ST048-format-gate-and-daily-sentence-closure.md
  - stories/blocked/EP1-ST048-format-gate-and-daily-sentence-closure.md
  - _bmad-output/implementation-artifacts/sprint-status.yaml
forbidden_paths:
  - apps/api/**
  - apps/web/**
  - apps/api/prisma/**
  - package.json
  - pnpm-lock.yaml
  - main
requires_human_approval: false
max_fix_rounds: 1
---

# Story: Format Gate Recovery And Daily Sentence Closure

## Goal

Restore the repository formatting gate without changing product behavior, then close
the already-merged `EP1-ST047` Daily Sentence bundle only after its existing
verification and independent-review requirements are evidenced.

## Context

`pnpm story:checks` ran on 2026-07-26. Prisma validation, lint, typecheck, unit
tests, API E2E, production builds, and 30 Playwright tests passed. The only failure
was `pnpm format:check`, which reported these three files:

- `tests/e2e/daily-sentence.spec.ts`
- `_bmad-output/planning-artifacts/story-map.md`
- `scripts/tests/story-tools.test.mjs`

The third file was outside `EP1-ST047`'s allowed paths. This maintenance story owns
all three formatting-only changes and the lifecycle synchronization needed to close
`EP1-ST047` safely.

## Business Rules

- Formatting changes must not alter assertions, test fixtures, runtime behavior,
  story-map semantics, dependencies, or product scope.
- Do not add dependencies, change Prettier configuration, or weaken any quality gate.
- `EP1-ST047` may move from `review` to `done` only after its independent review has
  no P0/P1 findings and all of its required checks are green.
- Keep the story's frontmatter, file location, and `sprint-status.yaml` synchronized.
- Do not begin another feature story as part of this maintenance work.

## Implementation Requirements

- Apply the repository's existing Prettier configuration only to the three reported
  files; inspect the diff to prove it is formatting-only.
- Preserve the Daily Sentence browser journey, including keyboard submission,
  revisited feedback, and mobile-overflow assertion.
- Preserve the planning-traceability and loop-tool regression tests exactly in
  meaning; their formatting must not change the temporary-repository test behavior.
- After the independent review and green checks, move `EP1-ST047` to `stories/done/`,
  change its frontmatter status to `done`, and update its sprint entry to `done`.
- Mark this story `done` only after the preceding closure actions are complete.

## Acceptance Criteria

- `pnpm format:check` passes with no changes required.
- `git diff --check` passes, and the implementation diff contains only whitespace or
  line-wrapping changes in the three format-recovery files.
- `pnpm story:checks` passes without weakening its checks.
- An independent read-only review of `EP1-ST047` reports no P0/P1 findings.
- `EP1-ST047` exists only under `stories/done/`, has frontmatter `status: done`, and
  its matching sprint-status entry is `done`.
- No API, web, Prisma, dependency, or product-behavior file changes are present.

## Verification

- `pnpm format:check`
- `pnpm story:verify stories/ready/EP1-ST048-format-gate-and-daily-sentence-closure.md`
- `pnpm story:checks`
- `git diff --check`
- `git diff -- tests/e2e/daily-sentence.spec.ts _bmad-output/planning-artifacts/story-map.md scripts/tests/story-tools.test.mjs`

## Developer Notes

- The current branch is `dev`; `EP1-ST047` was fast-forwarded into it at commit
  `1ca0d1b`. Do not reset, rebase, or re-merge that work.
- The previous combined gate passed all functional layers before stopping at the
  formatting gate. Re-run the complete gate after formatting because closure requires
  fresh, repository-level evidence.
- The loop-tool tests have previously exercised Git state. Treat any unexpected
  branch or worktree mutation as a stop-and-report condition; do not repair history
  with destructive Git commands.

## Blocked

Independent review found a P1 in `EP1-ST047`: a completion is stored by learner and
local date, but the sentence for that date is recalculated from a mutable eligible
set. Publishing an eligible sentence during the day can therefore show feedback from
one sentence alongside another sentence's prompt. The correction requires backend,
schema, migration, API, and regression-test paths forbidden by this maintenance story.
Create and complete a dedicated Daily Sentence assignment-integrity story before
closing `EP1-ST047`.
