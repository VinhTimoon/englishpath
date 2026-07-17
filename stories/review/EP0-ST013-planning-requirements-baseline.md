---
id: EP0-ST013
title: Planning Requirements Baseline
status: review
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

## Approved Delivery Roadmap

This roadmap was explicitly approved by the project owner and is authoritative for
planning artifacts. It extends the product specification's original Phase 0-5 outline
with a foundation-recovery phase and a post-MVP phase; do not treat these additions as
unapproved invention.

- Phase 0B, Planning Recovery: `EP0-ST013` requirements baseline, `EP0-ST014`
  architecture/database/security baseline, `EP0-ST015` CI and migration safety, and
  `EP0-ST016` browser E2E foundation.
- Phase 1A, Public MVP: `EP1-ST005` landing recovery and `EP1-ST006` technical SEO.
- Phase 1B, Identity: `EP1-ST007` identity schema, `EP1-ST008` Supabase auth API, and
  `EP1-ST009` web auth flows.
- Phase 1C, Onboarding: `EP1-ST010` onboarding API, `EP1-ST011` onboarding UI,
  `EP1-ST012` placement API/data, and `EP1-ST013` placement UI.
- Phase 1D, Roadmap: `EP1-ST014` template/rule engine, `EP1-ST015` roadmap API, and
  `EP1-ST016` learner roadmap/dashboard UI.
- Phase 1E, Daily Learning: `EP1-ST017` taxonomy/license/import pipeline,
  `EP1-ST018`-`EP1-ST019` vocabulary API/UI/SRS, `EP1-ST020`-`EP1-ST021` quiz API/UI,
  and `EP1-ST022`-`EP1-ST023` daily-sentence API/UI.
- Phase 1F, Progress and CMS: `EP1-ST024` progress/XP/streak, `EP1-ST025` dashboard,
  `EP1-ST026` admin RBAC/audit, and `EP1-ST027`-`EP1-ST029` CMS API/import/UI.
- Phase 1G, Content and Launch: `EP1-ST030`-`EP1-ST034` five vocabulary batches,
  `EP1-ST035` quiz/daily-sentence seed, `EP1-ST036` ten-post blog baseline,
  `EP1-ST037` analytics/monitoring adapters, and `EP1-ST038` staging readiness.
- Phase 2, Listening and Review: `EP2-ST001`-`EP2-ST003` audio/storage/upload,
  `EP2-ST004`-`EP2-ST006` listening/dictation/shadowing, `EP2-ST007`-`EP2-ST009`
  Error Notebook/review, and `EP2-ST010` cross-skill SRS.
- Phase 3, TOEIC: `EP3-ST001`-`EP3-ST003` licensed question bank/admin,
  `EP3-ST004`-`EP3-ST006` practice/mini test, `EP3-ST007`-`EP3-ST009`
  analysis/full test, and `EP3-ST010`-`EP3-ST012` secure exam mode.
- Phase 4, AI Learning: `EP4-ST001`-`EP4-ST003` AI Gateway/quota/cost,
  `EP4-ST004`-`EP4-ST007` writing/RAG, `EP4-ST008`-`EP4-ST010` speaking/STT/TTS,
  and `EP4-ST011`-`EP4-ST012` evaluation and abuse protection.
- Phase 5, Mobile: `EP5-ST001` shared Expo foundation, `EP5-ST002`-`EP5-ST005`
  auth/dashboard/daily learning, and `EP5-ST006`-`EP5-ST008` speaking/push/offline.
- Phase 6, Post-MVP: entitlement/free quota, Stripe integration, subscription UX,
  backup/restore, load testing for 300-500 concurrent users, and disaster recovery.

Automation continuously integrates passed stories into `dev`. Only the project owner
may promote `dev` to `main`, approve production credentials, paid services, or
destructive migrations.

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

