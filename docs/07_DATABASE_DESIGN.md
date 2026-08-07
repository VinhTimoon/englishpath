# Database Design V2

## Purpose

This document defines conceptual data ownership and boundaries for Phase 0-6. It
does not prescribe a physical Prisma schema in this story.

## Current Repository Evidence

- Repository stack uses Supabase PostgreSQL with Prisma 7.
- No v2 conceptual ownership map was previously documented across the required
  learning, assessment, content, AI, entitlement, and audit domains.

## Planned Conceptual Domains

### EP1-ST047 Daily Sentence persistence

`GovernedSentence` is owned by the daily-learning content boundary. It stores stable
IDs, original source/license attribution, review and publication evidence, and the
answer kept server-side. Only `REVIEWED` + `PUBLISHED` rows are eligible.
`DailySentenceCompletion` is private to `User`, stores the learner-local UTC-midnight
date, submitted answer, deterministic evaluation and feedback, and enforces one row
per `(userId, localDate)`. All reads and writes are owner-scoped. The migration seeds
20 credential-free EnglishPath-authored CC0 fixtures. Manual rollback is owner-approved
only: drop `DailySentenceCompletion`, then `GovernedSentence`; do not run it
automatically in production.

### EP1-ST036 Reviewed quiz and Daily Sentence seed baseline

The Phase 1 quiz remains a credential-free, backend-owned five-card fixture because
the current practice persistence stores session/question IDs and learner outcomes,
not a separate question-bank table. Each card carries deterministic original-source,
license, review, and publication metadata internally; the start projection selects
only ID, prompt, and options. The five correct options and explanations stay in the
backend grading path. The existing `20260720120000_daily_sentence` migration provides
20 stable EnglishPath-original `CC0-1.0` rows, all `REVIEWED` and `PUBLISHED`; the
content invariant test checks the seed without applying SQL to shared infrastructure.

### EP1-ST050 Governed Vocabulary Item foundation

`GovernedVocabularyItem` is the canonical persistence record for a reviewed word or
phrase. It has a stable ID, one current fixture-taxonomy node ID, learner-facing word,
meaning, optional example/pronunciation, and private source/license/review/publication
evidence. Public delivery is default-denied: only `REVIEWED` + `PUBLISHED` rows whose
`publishedAt` is reached may be projected, and no governance evidence is returned.
This additive migration deliberately has no foreign key to the current in-memory
taxonomy fixture; a later taxonomy-CMS story must introduce that relationship without
rekeying learner mastery. The seed consists of five EnglishPath-authored CC0 fixtures.
Manual rollback is owner-approved only: drop `GovernedVocabularyItem` and its indexes;

### EP1-ST031 Reviewed vocabulary batch 1

Migration `20260806160000_reviewed_vocabulary_batch_1` adds exactly 100 stable,
EnglishPath-authored `CC0-1.0` rows across existing approved vocabulary taxonomy
nodes. All rows are fixed as `REVIEWED` and `PUBLISHED` with a deterministic review
timestamp so the learner catalogue and pagination remain reproducible. The migration
is additive; rollback is owner-approved only and must target the batch IDs rather than
dropping the shared vocabulary table.

### EP1-ST032 Reviewed vocabulary batch 2

Migration `20260806170000_reviewed_vocabulary_batch_2` adds the second exactly-100
row batch through one deterministic `VALUES` projection. It uses existing travel,
technology, and workplace taxonomy nodes and derives the same EnglishPath-original
CC0 provenance, review state, publication state, and fixed timestamp for every row.
Rollback remains owner-approved only and must target `vocab-b2-*` rows.

### EP1-ST033 Reviewed vocabulary batch 3

Migration `20260806180000_reviewed_vocabulary_batch_3` adds 100 new stable rows
across existing travel, technology, and workplace nodes. It derives deterministic
EnglishPath-original CC0 provenance and published governance markers; rollback is
owner-approved only and targets `vocab-b3-*` rows.

### EP1-ST034 Reviewed vocabulary batch 4

Migration `20260806190000_reviewed_vocabulary_batch_4` adds 100 new stable rows
across existing travel, technology, and workplace nodes with deterministic original
CC0 provenance and publication markers. Rollback is owner-approved only and targets
`vocab-b4-*` rows.

### EP1-ST035 Reviewed vocabulary batch 5

Migration `20260806200000_reviewed_vocabulary_batch_5` adds the fifth exactly-100
row batch across existing travel, technology, and workplace nodes. It preserves the
same deterministic EnglishPath-original CC0 and published governance markers;
rollback is owner-approved only and targets `vocab-b5-*` rows.

### EP1-ST018 Vocabulary SRS and mastery

`VocabularyMasteryState` stores one owner-scoped scheduling row per
`(userId, vocabularyId)`. Its due-query index is `(userId, nextReviewAt,
vocabularyId)` so queue ordering is deterministic. `VocabularyReviewSubmission`
stores the bounded recall quality and server-produced result for one
`(userId, vocabularyId, clientSubmissionId)`; the unique constraint makes retries
replayable and protects the transition from duplicate awards.

The `20260727123000_vocabulary_srs` migration is additive. Manual rollback is
owner-approved only: remove the submission foreign keys/index/table, then the
mastery foreign keys/index/table, preserving all existing vocabulary and user rows.
automation must never execute it against Supabase.

### EP1-ST028 Privileged audit boundary

`PrivilegedAuditEvent` is an additive, append-oriented record for backend-owned
administrative policy decisions. It stores the application actor (nullable so audit
history survives retained-user cleanup), fixed action and target identifiers, the
`ALLOW`/`DENY` policy result, a bounded correlation ID, redacted scalar attributes,
and the server timestamp. It never stores tokens, passwords, raw JWT claims, private
answers, provider payloads, source locations, or learner progress. The admin module
is the only current writer and exposes no audit rows to the browser.

Migration `20260806140000_privileged_audit_event` is additive and must be validated
and generated locally without applying it to shared infrastructure. Manual rollback
is owner-approved only: remove the foreign key, indexes, `PrivilegedAuditEvent`
table, and `AuditPolicyResult` enum in that order. Existing `User` rows and learner
data remain untouched.

| Domain                            | Canonical Owner                   | Key Relationships                                                            | Lifecycle                                                            | Security Boundary                                                          |
| --------------------------------- | --------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Identity, profile, role           | Backend access module             | User links to profile, role assignments, entitlements, audit                 | invited -> active -> suspended -> deleted/retained                   | JWT maps to user; backend decides role and ownership                       |
| Learning tracks                   | Backend learning domain           | Track links to roadmap, lessons, content, progress                           | draft -> published -> revised -> retired                             | Published views are public or entitled; authoring is admin-only            |
| Onboarding and placement          | Backend onboarding domain         | User links to placement attempts, recommendations, roadmap seed              | created -> submitted -> scored -> accepted/superseded                | Answers and scoring inputs stay server-side until result publication       |
| Roadmap                           | Backend roadmap domain            | User roadmap links to tracks, milestones, progress, recommendations          | generated -> active -> adjusted -> archived                          | User sees own roadmap only; admin overrides audited                        |
| Taxonomy, mindmap, SRS            | Backend knowledge domain          | Concepts link to content, vocabulary, progress, review schedule              | draft -> active -> revised -> deprecated                             | Edit rights restricted; learner sees published material only               |
| Daily learning                    | Backend session domain            | Daily plan links to roadmap, tasks, submissions, progress                    | generated -> in_progress -> completed -> expired                     | Official completion state computed server-side                             |
| Error Notebook                    | Backend reflection domain         | Errors link to user, source task, remediation content, review schedule       | captured -> reviewed -> scheduled -> resolved/reopened               | Private to owning learner and authorized staff                             |
| TOEIC sessions, tasks, rubrics    | Backend assessment domain         | Session links to tasks, submissions, timer events, scores, suspicious events | scheduled -> active -> submitted -> scored -> finalized/cancelled    | Correct answers, timer truth, and rubrics remain server authoritative      |
| Licensed content, version, rights | Backend content governance domain | Content links to source inventory, storage assets, track usage, rights       | inventoried -> reviewed -> approved/rejected -> published -> retired | License and review state gate all publication and access                   |
| Library progress                  | Backend media domain              | Progress links user, content item, entitlement, completion                   | not_started -> in_progress -> completed -> abandoned                 | User-scoped access; content availability depends on rights and entitlement |
| AI usage                          | Backend AI gateway domain         | Usage links user, feature, prompt version, provider call, quota              | requested -> allowed/denied -> executed -> logged -> settled         | Prompts, outputs, cost, and abuse markers are backend-controlled           |
| Community and moderation          | Backend community domain          | Post/report links users, moderation actions, audit                           | draft -> published -> flagged -> moderated -> archived               | Ownership plus moderator/admin policy checks                               |
| Entitlement                       | Backend billing/access domain     | Entitlement links user, plan, payment event, content access                  | pending -> active -> grace -> expired -> revoked                     | Access checks run server-side on every protected resource                  |
| Audit                             | Backend audit domain              | Audit links actor, action, target, correlation ID, policy result             | appended -> retained -> expired per policy                           | Append-oriented, redacted, least-access operational boundary               |

## Content Inventory and Canonical Boundaries

- Google Drive is an inventory source, not the canonical publishing system.
- Inventory records must preserve source provider ID, checksum, source version,
  ingest timestamp, and import outcome.
- Canonical content records must preserve classification, rights owner, license
  terms, review status, publish status, and controlled-storage references.
- A single canonical content item may support multiple learning domains such as
  track lessons, TOEIC tasks, daily learning, and library items.
- A Drive inventory manifest is source evidence, not a canonical content row. Future
  import persistence may retain provider/file identity, checksum, version, and scan
  timestamps, but rights/review/publish state remains owned by governed content.

## Search and Retrieval

- Primary search baseline is PostgreSQL full-text search over normalized content
  projections.
- Semantic retrieval must remain pgvector-compatible in PostgreSQL.
- Specialist search, graph, or external vector systems are deferred until the
  PostgreSQL baseline proves insufficient.

## Retention and Versioning Principles

- Content, rubric, and roadmap changes require explicit version lineage.
- Audit and suspicious-event data are append-oriented and never silently mutated.
- Learner progress and submissions retain historical traceability required for
  scoring, support, and abuse review.
- Deletion behavior must respect entitlement, licensing, and audit obligations.

## Planned Content Version Invariants

Each future canonical content version persists one normalized taxonomy reference plus
source ID/URL, checksum, source version, provenance, usage scope, access tier, rights
owner, license state, allowed usage scopes/access tiers, review evidence, and
publication state. Review evidence binds to
the exact content ID, version ID, checksum, and source version.

| Transition                 | Required evidence                                                        | Result                                            |
| -------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------- |
| create/import/AI assist    | Complete classification, source, and rights metadata                     | New immutable draft without review evidence       |
| draft to approved/rejected | Policy-issued human actor/action decision plus matching version evidence | New reviewed projection; original draft unchanged |
| approved to published      | Compatible rights, matching review, policy-issued human publish decision | New immutable published projection                |
| any version to revision    | New version ID and changed checksum or source version                    | Linked draft with prior review evidence removed   |
| published to edited draft  | Never allowed in place                                                   | Create a linked revision instead                  |

Unknown, blocked, expired, or incompatible rights are default-denied. A changed source
never inherits approval automatically.

EP1-ST029 materializes these invariants with the additive `CmsTaxonomyNode`,
`CmsContent`, and `CmsContentVersion` tables. `(contentId, clientRequestId)` is
unique for safe draft creation retries; versions retain explicit source checksum and
version identity, lineage, rights compatibility, review evidence, and publication
state. The migration does not alter learner vocabulary tables and has no automatic
rollback or destructive operation.

## Physical Identity Baseline

EP2-ST005 adds additive `ToeicReadingPracticeSession` and
`ToeicReadingPracticeAnswer` tables. They are isolated from listening rows, cascade
with the application user/session, and enforce unique owner/client and session/question
keys for retry safety.

The Phase 1 identity schema preserves the original `User` table and adds provider
identity, explicit status, one-to-one `UserProfile`, canonical `Role`, and unique
`UserRole` assignment records. The application user ID remains independent from the
Supabase subject. The unique `(authProvider, externalSubject)` index allows legacy null
subjects during additive migration while preventing two linked users from sharing a
provider identity.

Profiles contain only display name, HTTPS avatar URL, locale, and timezone. Onboarding
goals, target scores, daily study time, skill preferences, entitlement, and progress are
not identity profile columns. Persisted roles are `FREE_USER`, `PREMIUM_USER`,
`CONTENT_EDITOR`, `ADMIN`, and `SUPER_ADMIN`; anonymous guests do not receive database
rows or role assignments.

Migration `20260717113000_identity_schema` is additive and must be validated/generated
without applying it to remote infrastructure in automation. Its manual rollback order
is recorded in the SQL: remove new foreign keys/tables/indexes/columns, then new enums,
while preserving all original user columns and rows.

## Physical Learner Entry Baseline

Migration `20260717170000_learner_entry` adds two owner-scoped records without changing
or deleting existing data. `LearnerOnboarding` is unique by `userId` and stores the
learner's goal, self-assessed level, sustainable study time, roadmap duration, selected
skills, and completion timestamp. `PlacementAttempt` stores one immutable graded result
per `(userId, clientSubmissionId)`, including submitted answers, aggregate score, level,
and skill breakdown.

The question bank and answer key remain application-owned fixtures in this first slice;
they are not persisted or returned by the public question contract. Rollback order and
all constraints are documented in the migration SQL. Automation validates the migration
and generated client but does not apply it to shared or remote databases.

## Physical Roadmap Baseline

Migration `20260717183000_roadmap_today` adds versioned `Roadmap` and owner-child
`RoadmapItem` records. Exactly one application workflow treats a roadmap as active;
recalculation marks the prior version `SUPERSEDED`, records `previousRoadmapId`, and
creates a new immutable plan shape in one transaction. Completed task status remains on
the historical version rather than being silently copied into the replacement.

Roadmap items are ordered by `(roadmapId, dayNumber, sequence)` and indexed for today's
owner-scoped status query. A partial unique index on `userId` where status is `ACTIVE`
prevents concurrent generation from leaving multiple active plans. Duration, daily
minutes, day number, and task minutes have
database checks. The migration is additive; its owner-approved rollback removes items,
roadmaps, and then roadmap enums, and is never executed automatically.

## Physical Daily Practice Baseline

Migration `20260718103000_daily_practice` adds owner-scoped practice sessions, unique
question answers, learner XP/streak progress, and private Error Notebook entries. Session
and answer uniqueness make retries safe; only an `ACTIVE` session transaction can award
XP and update streak. Question definitions and answer keys remain backend fixtures and
are not persisted in client-readable records before answer submission.

## Physical TOEIC Question Governance Boundary

### Cross-source Error Notebook projection (EP2-ST010)

Owner-approved migration `20260807100000_error_notebook_toeic_source` keeps
existing daily-practice `ErrorNotebookEntry` rows attached to `PracticeSession`
and adds `source`, nullable `toeicTimedTestSessionId`, and the corresponding
owner-scoped relation to `ToeicTimedTestSession`. The existing practice
uniqueness `(sessionId, questionId)` is preserved; TOEIC errors use a separate
unique `(toeicTimedTestSessionId, questionId)` constraint. A database check
requires exactly one source/reference pair, preventing synthetic sessions and
cross-source ambiguity. The migration is additive, has a manual rollback note
in its SQL, and is validated locally only; it is never run automatically
against shared Supabase or production.

EP2-ST007 adds `ToeicTimedTestSession` and `ToeicTimedTestAnswer` additively.
Sessions snapshot ordered version IDs, mode, policy version, server start and
deadline, and final state; answers are unique by session/question and cascade
with the owner session. Snapshot reads use those stored IDs rather than a moving
eligibility query. The migration is local/generated evidence only; manual
rollback is documented in its SQL and is never automated. Answer writes
re-check live governance before grading.

EP2-ST004 adds owner-scoped `ToeicPracticeSession` and private
`ToeicPracticeAnswer` rows. Sessions snapshot governed version IDs, enforce
unique `(userId, clientSessionId)`, and transition `ACTIVE` to `SUBMITTED`.
Answers enforce `(sessionId, questionId)` uniqueness; answer keys are selected
only in the backend grading projection. Answer insertion is performed in a
transaction that locks the active session row before creating the answer, while
submission uses a separate active-state compare-and-set. Migration
`20260806220000_toeic_listening_practice` is additive.

Migration `20260806233000_toeic_practice_filters` adds nullable filter snapshots
to both practice session tables. Listening records its selected difficulty;
reading records difficulty and the server-catalogued topic. These snapshots are
used for idempotent replay/conflict detection and do not expose answer keys or
content governance fields.

`ToeicQuestion` owns the stable canonical identity. `ToeicQuestionVersion` is an
immutable content record keyed by `(questionId, version)` and a separate
`importIdentity`; lineage is restrictive, while deleting a canonical question
cascades only to its versions. Parts 1–7, question type, difficulty, license,
review, publication, usage, and access tier are closed Prisma enums.

Prompt/options and optional media are content fields. `correctAnswer`, source
identity/URL/checksum/version, provenance, rights owner, license state, review
decision/evidence/reviewer identity, and publication evidence are private
server-owned fields and must never be included in a learner projection. Later
publication rules require reviewed content, `PUBLISHED` state, reached
`publishedAt`, compatible license, and an unset or future `validUntil`.

Deterministic indexes cover canonical version lookup, part/type/difficulty,
stimulus grouping, and reviewed/published/expiry eligibility. Migration
`20260806210000_toeic_question_governance` is additive local/generated evidence
only; automation must not apply it to shared Supabase infrastructure. Owner-
approved rollback, if ever required, removes version foreign keys/indexes/table,
then the canonical table and new enums, preserving all existing learner, CMS,
vocabulary, progress, and identity data.
