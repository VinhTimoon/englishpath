---
id: EP0-ST014
title: Product V2 Core Rebaseline
status: done
type: planning
priority: critical
phase: phase-0-foundation
allowed_paths:
  - notes/englishpath_product_spec.md
  - notes/englishpath_product_spec_v2.md
  - docs/01_PRODUCT_SCOPE.md
  - docs/02_PRD.md
  - docs/03_USER_FLOWS.md
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/project-context.md
  - stories/**
forbidden_paths:
  - apps/**
  - packages/**
  - scripts/**
  - .github/**
  - .env
  - _bmad-output/planning-artifacts/epic-map.md
  - _bmad-output/planning-artifacts/story-map.md
  - _bmad-output/planning-artifacts/epics.md
requires_human_approval: false
max_fix_rounds: 2
---

# Story: Product V2 Core Rebaseline

## Goal

Promote `englishpath_product_spec_v2.md` as the sole detailed product source of truth,
remove the superseded v1 specification, and update the concise core planning baseline
before architecture or feature delivery continues.

## Owner Decision

On 2026-07-17, the project owner explicitly selected v2 as the new source of truth and
requested removal of v1 because v2 clarifies the product's primary business domain.

## Source Transition Requirements

- Track `notes/englishpath_product_spec_v2.md` without changing its Vietnamese
  semantics or UTF-8 encoding; normalize only trailing whitespace required by the
  repository diff gate.
- Delete `notes/englishpath_product_spec.md`; do not retain two competing detailed
  product specifications.
- Update all in-scope source references to point only to v2.
- Record that epic/story maps are intentionally refreshed by the immediate follow-up
  `EP0-ST015`; do not edit those forbidden files in this story.

## Product Baseline Requirements

- Keep EnglishPath a comprehensive, free-first English platform for Vietnamese
  learners, not merely a test-answer site and not a separate IELTS exam platform.
- Establish TOEIC Listening & Reading, TOEIC Speaking & Writing, and TOEIC Four Skills
  as primary learning tracks while retaining general English, communication,
  workplace English, vocabulary, listening, speaking, reading, and writing.
- Add vocabulary mindmap/knowledge taxonomy, basic Error Notebook, guest trial,
  licensed-content library, and Google Drive content inventory/import governance to
  the planned product baseline.
- Treat Google Drive as an approved content source, never the production business
  database; changed content must pass license validation and human review before
  publish.
- Preserve source, checksum/version, usage scope, access tier, license, review, and
  publish metadata for imported content.
- Keep AI-assisted content and feedback advisory: AI cannot set official answer keys
  or official scores and cannot auto-publish content.

## Phase Requirements

- Phase 0: foundation/governance, auth foundation, taxonomy, source/license model,
  Drive inventory design, database/API conventions, health, logging, and monitoring.
- Phase 1: learning core with public/guest experience, auth/onboarding, placement,
  dashboard, 30/60/90/120-day roadmap, vocabulary mindmap/SRS, daily practice, basic
  Error Notebook, and basic CMS.
- Phase 2: TOEIC Listening & Reading question bank, Parts 1-7, topic/difficulty
  practice, mini/half tests, timing, score/weakness analysis, and remediation.
- Phase 3: licensed content library and listening, including Drive import, media,
  transcript, drills, shadowing, resume/bookmark, and roadmap/vocabulary links.
- Phase 4: TOEIC Speaking, Writing, Four Skills, rubrics, submissions, AI-assisted
  feedback, roadmap, and progress dashboard.
- Phase 5: full tests, exam simulation, advanced Error Notebook, adaptive roadmap, AI
  explanation/speaking/writing, and moderated community.
- Phase 6: Expo mobile, push, offline learning, premium quota/subscription, and
  advanced analytics.

## Product Scope Guard

Every later product story must serve at least one v2 guard objective: improve general
English, TOEIC results, vocabulary retention, study consistency, recurring-error
remediation, access to licensed content, or product administration/security/quality
measurement. Stories that serve none require product review.

Mandatory invariants:

- Do not add an unapproved exam track or convert licensed IELTS content into an IELTS
  exam product.
- Do not publish content without license and human review.
- Do not omit Error Notebook integration when a learning activity produces errors.
- Reuse shared taxonomy/content rather than creating isolated duplicate modules.
- Score, roadmap, content-rights, and exam-session rules require happy, validation,
  boundary, and failure-path tests in their implementation stories.
- Never change a business rule solely to make a test pass.

## Acceptance Criteria

- V2 is tracked as the only detailed product specification and v1 is removed.
- Product scope, PRD, critical user flows, BMAD PRD, and project context consistently
  reflect v2's business focus and Phase 0-6 ordering.
- Requirements distinguish current implementation from planned capabilities.
- FR, NFR, and UF identifiers are unique within their defining documents.
- The immediate `EP0-ST015` map-refresh dependency is explicit; no forbidden map file
  changes in this story.
- Formatting, project checks, diff check, story verification, and read-only Codex
  review pass without P0/P1 findings.

## Verification

- node scripts/story-doctor.mjs stories/ready/EP0-ST014-product-v2-core-rebaseline.md --ready-only
- pnpm prettier --check docs/01_PRODUCT_SCOPE.md docs/02_PRD.md docs/03_USER_FLOWS.md _bmad-output/planning-artifacts/prd.md _bmad-output/planning-artifacts/project-context.md stories/ready/EP0-ST014-product-v2-core-rebaseline.md
- pnpm story:checks
- git diff --check


