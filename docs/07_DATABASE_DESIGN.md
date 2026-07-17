# Database Design V2

## Purpose

This document defines conceptual data ownership and boundaries for Phase 0-6. It
does not prescribe a physical Prisma schema in this story.

## Current Repository Evidence

- Repository stack uses Supabase PostgreSQL with Prisma 7.
- No v2 conceptual ownership map was previously documented across the required
  learning, assessment, content, AI, entitlement, and audit domains.

## Planned Conceptual Domains

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

## Physical Identity Baseline

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
