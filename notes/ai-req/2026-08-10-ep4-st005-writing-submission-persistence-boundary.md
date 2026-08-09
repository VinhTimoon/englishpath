# AI Request: EP4-ST005 Writing submission source and persistence boundary

## Decision needed

Approve the server-owned Writing task catalogue/source and the durable,
owner-scoped persistence boundary for Writing attempts, submissions, and
idempotency before EP4-ST005 is resumed.

## Why this is required

EP4-ST001 defines immutable in-memory task and rubric contracts only. It does
not provide a published Writing catalogue, a publication predicate backed by a
server-owned source, a deterministic word-count rule, or persisted attempt and
submission models. Implementing EP4-ST005 without those decisions would invent
learning content or bypass the approved data/ownership architecture.

## Impact and risks

Without approval, the learner Writing flow cannot safely start or finalize a
durable attempt. Proceeding with guessed prompts, word rules, or idempotency
constraints risks incorrect learning data, duplicate submissions, cross-user
access, and irreversible schema drift. No paid provider or external credential
is required by the proposed boundary, but any licensed content source or
provider activation would require separate approval.

## Options

1. Approve an EnglishPath-owned, credential-free reviewed Writing fixture or
   catalogue adapter, define the published-task predicate and deterministic
   Unicode word-count rule, and approve additive Prisma models/constraints for
   owner-scoped attempts, submissions, and idempotency. **Recommended for a
   durable beta.**
2. Approve a local/in-memory Writing catalogue and attempt adapter for beta,
   explicitly accepting that attempts/submissions are not durable and limiting
   the journey to a non-production fixture environment.
3. Defer Writing submission until a reviewed/licensed catalogue and persistence
   boundary are available. Keep EP4-ST005 blocked and continue independent
   Phase 4 stories.

## Recommendation

Choose Option 1. If the product owner is not ready to approve content and
persistence, choose Option 3 rather than fabricating tasks or weakening
ownership/idempotency guarantees.

## How work continues after approval

Resume EP4-ST005 in place; do not create a recovery story. Add only the
approved source/fixture, additive schema and migration, repository/service/API
implementation, redaction, and regression evidence. Run the full high-risk
quality gates before review/merge.

## Technical evidence

- Blocked loop commit: `0009cd4`.
- EP4-ST001 contract: `apps/api/src/modules/toeic/toeic-speaking-writing.models.ts`.
- EP4-ST001 has no Prisma persistence or published catalogue adapter.
- EP4-ST005 build planning explicitly identified the missing source and
  persistence boundary; no implementation files were created.
- Existing `apps/api/prisma/schema.prisma` has no approved Writing attempt/
  submission model for this story.
