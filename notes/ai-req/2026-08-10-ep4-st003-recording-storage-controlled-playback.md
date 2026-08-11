# AI Request: EP4-ST003 Recording Storage And Controlled Playback

## Decision needed

Approve the production-safe recording storage and controlled playback boundary
for TOEIC Speaking recordings before EP4-ST003 is implemented.

## Owner decision — approved 2026-08-11

**Selected option: Option 1 — EnglishPath-owned controlled object storage.**

Implementation may proceed with an additive, owner-scoped recording asset
contract, injectable storage adapter, retention/state policy, and backend-issued
short-lived playback capability. Local/test must remain credential-free. Real
production provider credentials, bucket/RLS configuration, deployment, and
activation remain human-controlled and are not performed by this loop.

## Why this is blocked

EP4-ST002 intentionally accepts only bounded recording metadata and a controlled
application reference. It does not accept audio bytes or provide an upload,
storage, retention, or playback authority. The existing EP3-ST006 controlled
media adapter reports safe availability state only; it does not persist or serve
learner recording bytes. Implementing ST003 without this decision would require
inventing a provider, retention policy, schema boundary, or credential setup.

Evidence:

- `docs/07_DATABASE_DESIGN.md`: EP4-ST002 stores metadata/reference only and
  explicitly excludes raw audio bytes and provider locators.
- `docs/06_BACKEND_ARCHITECTURE.md`: EP3-ST006 controlled media is a state-only,
  provider-neutral boundary.
- `docs/08_API_CONTRACT.md`: Speaking submission rejects audio bytes and provider
  URLs; controlled playback is not yet specified.
- `apps/api/src/modules/toeic/toeic-speaking-submission.service.ts`: current
  submission flow persists only the approved reference and bounded metadata.

## Options

1. **EnglishPath-owned controlled object storage (recommended for Phase 4)**
   Add an owner-scoped recording asset/reference boundary, an injectable storage
   adapter, retention/state policy, and a backend-issued short-lived playback
   capability. Production activation still requires provider credentials and
   deployment configuration approval; local/test uses a credential-free adapter.
2. **Credential-free local fixture only**
   Implement metadata and deterministic fixture playback for local/staging tests,
   while explicitly deferring real learner recording persistence. This can prove
   UI/API contracts but does not satisfy a production learner recording journey.
3. **Defer Speaking recording and all dependent Phase 4 slices**
   Keep ST003, ST004, ST008, and ST012 owner-deferred until a storage decision is
   made. This is safe but leaves Phase 4 incomplete.

## Recommendation

Approve Option 1 as the target architecture, with a credential-free local/test
adapter and a separate, explicitly approved production activation step. Do not
allow the application to expose direct provider URLs, Drive URLs, raw object
keys, or long-lived playback tokens. Define retention/deletion and maximum
recording bounds before schema or migration work begins.

## Impact, cost, and risk

- Requires an additive recording asset/reference contract and likely Prisma
  migration, plus generated client updates and owner-scoped repository tests.
- Production activation may require Supabase Storage configuration, credentials,
  bucket/RLS policy, retention policy, and deployment changes; no such external
  changes are authorized in this loop.
- Option 2 has low implementation cost but cannot be called production-ready.
- Choosing Option 3 delays Speaking UI, Speaking feedback, and the Phase 4 exit
  review; no learner data is exposed or fabricated while deferred.

## How to continue after approval

1. Record the selected option and any retention, size, MIME, and playback TTL
   limits in the decision log and story contract.
2. Unblock EP4-ST003 only; implement the adapter/repository/API slice on a fresh
   story branch with full security, ownership, migration, and browser gates.
3. Unblock EP4-ST004 and EP4-ST008 only after ST003 evidence passes.
4. Run EP4-ST012 after ST004 through ST011 pass; production provider activation
   remains a separate human-controlled operation.

## Current lifecycle action

EP4-ST003 is unblocked for credential-free local/test implementation under the
approved boundary. EP4-ST004 and EP4-ST008 remain dependency-blocked until the
ST003 contract passes. EP4-ST012 remains blocked until all dependencies pass.
No production storage, credential, or external provider change was performed.
