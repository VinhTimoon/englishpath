---
id: EP0-ST013
title: Planning Requirements Baseline
status: blocked
type: planning
priority: critical
phase: phase-0-foundation
allowed_paths:
  - docs/01_PRODUCT_SCOPE.md
  - docs/02_PRD.md
  - docs/03_USER_FLOWS.md
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/epic-map.md
  - _bmad-output/planning-artifacts/story-map.md
  - _bmad-output/planning-artifacts/epics.md
  - stories/**
forbidden_paths:
  - apps/**
  - packages/**
  - scripts/**
  - .env
  - notes/englishpath_product_spec.md
  - notes/ENGLISHPATH_AGENT_WORKFLOW.md
requires_human_approval: false
max_fix_rounds: 2
---

# Story: Planning Requirements Baseline

## Goal

Convert the approved EnglishPath product specification and delivery roadmap into a
concise, testable planning baseline so later stories can rely on complete product
scope, requirements, user journeys, epics, and dependency ordering.

## Source Of Truth

- `notes/englishpath_product_spec.md` defines product behavior and long-term scope.
- `notes/ENGLISHPATH_AGENT_WORKFLOW.md` defines story-loop and promotion governance.
- The approved delivery roadmap defines phase and story ordering.
- Existing completed stories define the implemented baseline; do not claim unbuilt
  modules are available.

## Requirements

- Populate product scope with actors, MVP boundaries, post-MVP boundaries, copyright
  rules, free-first principles, and measurable launch criteria.
- Populate the PRD with uniquely identified functional and non-functional requirements
  that are concise, testable, and traceable to product phases.
- Populate user flows for guest discovery, authentication/recovery, onboarding and
  placement, daily learning, quiz submission, error review, content publishing,
  TOEIC submission, and AI quota handling.
- Synchronize BMAD PRD, epic map, story map, and epics artifact with Phase 0B through
  Phase 6 from the approved roadmap.
- Include the current implementation status: foundation, blog SEO, and local runtime
  are complete; landing recovery is next; other domain modules remain unimplemented.
- Keep artifacts concise enough for story-scoped context loading and do not duplicate
  the complete 2,000-line product specification.
- Record assumptions: Supabase Auth, local-first adapters, AI-assisted draft content
  requiring review, web-based MVP CMS, PostgreSQL/pgvector before external vector or
  graph databases, FE port 5173, and BE port 3000.

## Acceptance Criteria

- All seven planning artifacts are non-empty and internally consistent.
- Every must-have MVP capability maps to an epic and planned story range.
- FR, NFR, and critical user-flow identifiers are unique and traceable.
- No artifact presents planned functionality as already implemented.
- `main` is never modified; production promotion remains human-controlled.
- Story doctor, planning checks, project gates, diff check, and read-only Codex review
  pass without P0/P1 findings.

## Verification

- node scripts/story-doctor.mjs stories/ready/EP0-ST013-planning-requirements-baseline.md --ready-only
- pnpm prettier --check docs/01_PRODUCT_SCOPE.md docs/02_PRD.md docs/03_USER_FLOWS.md _bmad-output/planning-artifacts/prd.md _bmad-output/planning-artifacts/epic-map.md _bmad-output/planning-artifacts/story-map.md _bmad-output/planning-artifacts/epics.md
- pnpm story:checks
- git diff --check



## Blocked Report

- Failed step: "node" "scripts/codex-runner.mjs" "plan" ".codex-plan-task.md"
- Exit code: 1
- Attempts: 3
- Summary: The automated loop could not complete this story.

### Evidence

```text
Command failed with exit code 1: "node" "scripts/codex-runner.mjs" "plan" ".codex-plan-task.md"
```
