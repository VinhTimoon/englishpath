# Project Context

## Purpose

This is the minimum product context BMAD and Codex must apply before implementing an
EnglishPath story. The sole detailed business source is
`notes/englishpath_product_spec_v2.md`; story-scoped agents should normally use the
concise docs/maps instead of loading the full specification.

## Product Identity

EnglishPath is a comprehensive, free-first English learning platform for Vietnamese
learners. TOEIC Listening & Reading, TOEIC Speaking & Writing, and TOEIC Four Skills
are primary tracks, while general, communication, workplace, vocabulary, listening,
speaking, reading, and writing remain first-class goals.

The product is not only a test site and does not include a separate IELTS exam track.
Licensed IELTS assets may be governed learning content only.

## Learning Spine

```text
Placement -> bounded roadmap -> daily practice -> skill practice -> Error Notebook
-> smart review -> measured progress -> roadmap adjustment
```

Shared vocabulary taxonomy/mindmap and canonical content connect all tracks. A
learning activity that produces reviewable mistakes must define Error Notebook
integration.

## Phase Order

1. Phase 0: foundation/governance and content/data/API design.
2. Phase 1: public/guest and learning core.
3. Phase 2: TOEIC Listening & Reading.
4. Phase 3: licensed content library and listening.
5. Phase 4: TOEIC Speaking, Writing, and Four Skills.
6. Phase 5: full tests, adaptive/AI learning, and moderated community.
7. Phase 6: mobile and premium expansion.

## Product Scope Guard

Every product story must improve at least one objective:

1. General English ability.
2. TOEIC results.
3. Vocabulary retention.
4. Study consistency.
5. Detection and remediation of recurring errors.
6. Learner access to licensed content.
7. Product administration, security, or learning-quality measurement.

If none applies, the story requires product review.

Mandatory rules:

- Do not add an exam track without owner approval.
- Do not turn licensed IELTS material into an IELTS exam product.
- Do not publish content before license and human review.
- Do not let AI set official answers or scores.
- Do not duplicate a module when shared taxonomy/content can serve it.
- Do not change business rules solely to make tests pass.
- Score, roadmap, content-rights, and exam-session changes require happy,
  validation, boundary, and failure-path tests.

## Content Governance

- Google Drive is an inventory source, not the business database or uncontrolled
  production media dependency.
- Imported content retains source ID/URL, checksum/version, classification, usage
  scope, access tier, license, review, and publish status.
- New or changed assets remain draft until an authorized human approves them.
- One canonical asset may link to multiple tracks, skills, roadmap tasks, vocabulary,
  and quizzes.

## Delivery Model

- BMAD owns planning and story governance.
- Codex CLI performs scoped plan/build/review phases.
- The active story is authoritative for allowed/forbidden paths, acceptance, and
  verification.
- Work proceeds one story at a time with no more than three ready stories.
- Agents load no more than eight context files; split larger work.
- Passed story branches may fast-forward into `dev`; only the owner promotes to
  `main`.

## Mandatory Context Order

1. Current story.
2. `AGENTS.md`.
3. `ai-skills/routing/skill-router.md`.
4. Relevant concise BMAD artifact(s).
5. Relevant project doc(s).
6. Relevant project skill(s).

Load the full v2 specification only for rebaseline or unresolved business ambiguity.

## Architecture Defaults

- Frontend: Next.js and TypeScript with established project architecture.
- Backend: NestJS modular N-layer REST API under `/api/v1`.
- Data/auth: Supabase PostgreSQL/Auth with Prisma; backend verifies identity and owns
  application roles/ownership.
- Retrieval: PostgreSQL full-text and pgvector-compatible design before specialist
  vector/graph services.
- External services use local/mock adapters for credential-free tests.
- Local ports remain frontend `4173` and backend `3005`.

## Quality Gate

Every story runs formatting as applicable, lint, typecheck, unit tests, API e2e,
build, diff check, story verification, and read-only Codex review. Database stories
also require migration validation and rollback notes; destructive migrations require
owner approval.

## Transition

`EP0-ST014` establishes the v2 core baseline. `EP0-ST015` must refresh epic and story
maps before architecture or feature delivery resumes.
