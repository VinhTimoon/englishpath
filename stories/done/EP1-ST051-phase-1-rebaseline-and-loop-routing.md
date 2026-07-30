---
id: EP1-ST051
title: Phase 1 Rebaseline And Loop Routing
status: review
type: governance
priority: critical
phase: phase-1-learning-core
allowed_paths:
  - _bmad-output/planning-artifacts/story-map.md
  - _bmad-output/implementation-artifacts/sprint-status.yaml
  - scripts/codex-models.json
  - stories/ready/EP1-ST019-vocabulary-mindmap-item-and-review-ui.md
  - stories/ready/EP1-ST051-phase-1-rebaseline-and-loop-routing.md
  - stories/in-progress/EP1-ST051-phase-1-rebaseline-and-loop-routing.md
  - stories/review/EP1-ST051-phase-1-rebaseline-and-loop-routing.md
  - stories/done/EP1-ST051-phase-1-rebaseline-and-loop-routing.md
  - stories/blocked/EP1-ST051-phase-1-rebaseline-and-loop-routing.md
forbidden_paths:
  - apps/**
  - apps/web/**
  - apps/api/src/**
  - apps/api/prisma/schema.prisma
  - apps/api/prisma/migrations/**
  - apps/api/src/generated/**
  - packages/**
  - "**/package.json"
  - "**/pnpm-lock.yaml"
  - "**/package-lock.json"
  - "**/yarn.lock"
  - .env
  - .env.*
  - "**/.env"
  - "**/.env.*"
  - main
requires_human_approval: false
max_fix_rounds: 1
---

# Story: Phase 1 Rebaseline And Loop Routing

## Goal

Finalize the truthful Phase 1 planning baseline, align local loop routing with the
documented phase contract, and create exactly one dependency-ready implementation
story without changing product code or production state.

## Reconciliation Baseline

- `EP1-ST047` fully supersedes `EP1-ST022` and `EP1-ST023`; `EP1-ST048` provides
  closure evidence and `EP1-ST049` fixes the only identified assignment-integrity
  gap. No separately specified advanced Daily Sentence requirement remains.
- `EP1-ST036` remains backlog for its unimplemented reviewed quiz and remaining
  launch-content baseline; Daily Sentence completion does not mark that story done.
- `EP1-ST050` supplied the canonical item prerequisite for completed `EP1-ST018`.
  Therefore `EP1-ST019` is the single next dependency-ready implementation story.
- Old IDs must remain traceable to their replacements rather than being deleted or
  represented as independently implemented stories.

## Loop Routing Evidence And Intended Correction

- Local evidence captured during preparation on 2026-07-30 used Codex CLI `0.144.5`.
- The local `~/.codex/models_cache.json`, fetched at
  `2026-07-30T16:31:26.741736400Z`, contained one list-visible model with slug
  `gpt-5.6-luna`; its default reasoning was `medium` and it advertised `medium` as a
  supported reasoning level. Retaining it for the build phase is locally verified.
- `notes/ENGLISHPATH_AGENT_WORKFLOW.md` requires `high` reasoning for planning and
  difficult debug work, while `scripts/codex-models.json` currently routes both to
  `medium`. The safe correction is limited to changing `plan.reasoning` and
  `debug.reasoning` to `high` while preserving the existing plan/build/review/debug
  model names, timeouts, and sandbox values.
- Do not execute `pnpm story:loop` from inside this story and do not introduce network
  model discovery or provider changes.

## Governance Requirements

- Preserve the story-map and sprint-status reconciliation prepared for this story:
  `EP1-ST022`/`EP1-ST023` are done only by explicit supersession through
  `EP1-ST047`-`EP1-ST049`, while `EP1-ST036` remains backlog.
- Keep `EP1-ST050 -> EP1-ST018 -> EP1-ST019` dependency traceability explicit.
- Change only the two documented reasoning values in `scripts/codex-models.json`.
- Create exactly one new ready implementation artifact:
  `stories/ready/EP1-ST019-vocabulary-mindmap-item-and-review-ui.md`.
- The new `EP1-ST019` story must follow the project schema, be `type: frontend`, depend
  on completed `EP1-ST018`, cover the authenticated vocabulary mindmap/item/due-review
  UI against existing APIs, define loading/empty/error/success and mobile-accessible
  states, and include bounded frontend/docs/tests paths, explicit backend/Prisma/
  dependency/environment/`main` prohibitions, verification commands, and
  `max_fix_rounds`.
- Set sprint status `1-19-vocabulary-mindmap-item-and-review-ui` to `ready-for-dev`
  when that file is created. Do not create, ready, or modify any other implementation
  story.

## Acceptance Criteria

- `story-map.md` and `sprint-status.yaml` agree that `EP1-ST022` and `EP1-ST023` are
  fully superseded by `EP1-ST047` through `EP1-ST049`, with no claim that
  `EP1-ST036` or any other unimplemented work is done.
- Planning artifacts include `EP1-ST050` as the prerequisite of completed
  `EP1-ST018` and identify `EP1-ST019` as the only next dependency-ready
  implementation story.
- `scripts/codex-models.json` has `high` reasoning for `plan` and `debug`; all model
  names, build/review reasoning, timeouts, and sandbox values are otherwise unchanged.
- Exactly one implementation story is newly present under `stories/ready/`:
  `EP1-ST019-vocabulary-mindmap-item-and-review-ui.md`, and its sprint entry is
  `ready-for-dev`.
- The created `EP1-ST019` artifact passes story doctor and contains no authority to
  modify backend source, Prisma schema/migrations/generated output, package manifests
  or lockfiles, environment files, or `main`.
- No application source, Prisma, dependency, environment, or production-branch file
  changes are included in this story.

## Verification

- `node scripts/story-doctor.mjs stories/ready/EP1-ST019-vocabulary-mindmap-item-and-review-ui.md --ready-only`
- `node scripts/verify-story.mjs stories/in-progress/EP1-ST051-phase-1-rebaseline-and-loop-routing.md`
- `pnpm format:check`
- `pnpm story:test`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `git diff --check`

## Out Of Scope

- Implementing `EP1-ST019` or any other product behavior.
- Editing application source, backend contracts, Prisma, generated output, packages,
  dependencies, environment configuration, or `main`.
- Running the story loop, promoting production, or creating more than one next ready
  implementation story.


