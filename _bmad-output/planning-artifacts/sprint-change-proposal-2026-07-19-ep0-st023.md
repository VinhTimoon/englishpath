# Sprint Change Proposal — EP0-ST023 Formatting Blocker

Date: 2026-07-19
Approval: Approved by project owner in the active task.
Scope: Minor direct adjustment.

## Issue Summary

`pnpm story:checks` passed all functional gates but `format:check` found two pre-existing E2E files outside EP0-ST023 allowed paths. The story could not honestly complete while the repository gate remained red.

## Impact Analysis

- Epic: E00 remains in progress; no sequencing or requirement change.
- Story: EP0-ST023 expands allowed paths by exactly two formatting-only files.
- PRD, architecture, UX, APIs, database, and runtime behavior: no impact.
- Future epics: no impact.

## Approved Change

Add `tests/e2e/error-notebook.spec.ts` and `tests/e2e/roadmap-today.spec.ts` to EP0-ST023 `allowed_paths`. Apply Prettier only; no behavioral edits.

## Handoff And Success Criteria

Developer resumes EP0-ST023, formats the two files, reruns focused and full repository gates, verifies path scope, and moves the story to review only if all gates pass.