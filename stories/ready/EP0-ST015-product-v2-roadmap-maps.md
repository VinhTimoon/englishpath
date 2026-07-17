---
id: EP0-ST015
title: Product V2 Roadmap Maps
status: ready
type: planning
priority: critical
phase: phase-0-foundation
allowed_paths:
  - _bmad-output/planning-artifacts/epic-map.md
  - _bmad-output/planning-artifacts/story-map.md
  - _bmad-output/planning-artifacts/epics.md
  - stories/**
forbidden_paths:
  - notes/**
  - docs/**
  - apps/**
  - packages/**
  - scripts/**
  - .github/**
  - .env
requires_human_approval: false
max_fix_rounds: 2
---

# Story: Product V2 Roadmap Maps

## Goal

Replace the v1 epic/story maps with a complete v2 delivery sequence for Phase 0-6,
record superseded historical planning, and create the next bounded ready queue.

## Source Of Truth

- `notes/englishpath_product_spec_v2.md` defines the authoritative Phase 0-6 outcomes.
- `docs/01_PRODUCT_SCOPE.md`, `docs/02_PRD.md`, `docs/03_USER_FLOWS.md`, and the BMAD
  PRD define the concise v2 baseline delivered by `EP0-ST014`.
- This story may update map artifacts and lifecycle records only.

## Mapping Requirements

- Define epics for Phase 0 foundation, Phase 1 learning core, Phase 2 TOEIC Listening
  & Reading, Phase 3 licensed library/listening, Phase 4 TOEIC Speaking/Writing/Four
  Skills, Phase 5 full tests/adaptive AI/community, and Phase 6 mobile/premium.
- Assign small, ordered story IDs to every approved capability, including explicit
  dependencies and exit gates.
- Map all `FR-001` through `FR-029`, `NFR-001` through `NFR-017`, and `UF-001`
  through `UF-013` to at least one epic/story range.
- Keep existing completed story history truthful: `EP1-ST002` and `EP1-ST004` remain
  implemented baselines; `EP1-ST001` and `EP1-ST003` are superseded by `EP1-ST005`.
- Mark the v1 planning baseline in `EP0-ST013` as superseded by `EP0-ST014` without
  rewriting its historical result.
- Sequence remaining Phase 0 work as `EP0-ST016` architecture/data/API/security,
  `EP0-ST017` CI/migration and semantic planning checks, `EP0-ST018` browser E2E,
  followed by auth, taxonomy/rights, Drive inventory, and observability foundations.
- Start Phase 1 product recovery at `EP1-ST005` with landing/guest trial, then deliver
  auth/onboarding, roadmap, vocabulary mindmap/SRS, daily practice, Error Notebook,
  progress, CMS, content, and launch readiness.
- Put TOEIC Listening & Reading in Phase 2, licensed library/listening in Phase 3,
  TOEIC Speaking/Writing/Four Skills in Phase 4, and preserve the v2 Phase 5-6 order.

## Ready Queue Requirements

- Create `EP0-ST016` for the v2 architecture/database/API/security/decision baseline.
- Create `EP0-ST017` for CI, migration safety, and automated planning semantic checks.
- Keep no more than three stories in `stories/ready` after this story moves to review.
- New story files must pass story-doctor and reference only v2 or concise v2 artifacts.

## Acceptance Criteria

- Epic map, story map, and epic details are mutually consistent and v2-aligned.
- Every FR/NFR/UF identifier has map coverage and every phase has an exit gate.
- Story numbering has no duplicates within a phase and dependencies are executable.
- Superseded v1/landing planning is explicit and no planned feature is claimed as
  implemented.
- The next ready queue contains only `EP0-ST016` and `EP0-ST017` after this story is
  moved out of ready.
- Formatting, project checks, diff check, story verification, and read-only Codex
  review pass without P0/P1 findings.

## Verification

- node scripts/story-doctor.mjs stories/ready/EP0-ST015-product-v2-roadmap-maps.md --ready-only
- node scripts/story-doctor.mjs stories/ready/EP0-ST016-architecture-data-security-v2.md --ready-only
- node scripts/story-doctor.mjs stories/ready/EP0-ST017-ci-migration-planning-safety.md --ready-only
- pnpm prettier --check _bmad-output/planning-artifacts/epic-map.md _bmad-output/planning-artifacts/story-map.md _bmad-output/planning-artifacts/epics.md
- pnpm story:checks
- git diff --check
