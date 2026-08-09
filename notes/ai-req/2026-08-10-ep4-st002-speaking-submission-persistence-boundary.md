# AI Request: EP4-ST002 Speaking Submission Persistence Boundary

## Decision needed

Confirm the approved persistence/source boundary for TOEIC Speaking task start
and submission before EP4-ST002 resumes.

## Why this is blocked

EP4-ST002 requires an owner-scoped persisted Speaking session/submission with
atomic idempotency and lifecycle constraints. EP4-ST001 currently provides
only immutable in-memory task/rubric models; there is no approved persisted
Speaking task catalogue or licensed prompt fixture to resolve a published task
version. The existing Prisma setup generates client output under
`apps/api/src/generated/prisma`, which is outside EP4-ST002's allowed paths.

Proceeding would either invent task content, bypass the approved source
boundary, or change generated/architecture files that the story forbids.

## Impact

EP4-ST002 Speaking task start/submission API is blocked. Dependent
EP4-ST003/004/008 work remains blocked by this story. Independent EP4-ST005
Writing task/submission API and other stories that depend only on EP4-ST001
may continue if their own approved content and persistence boundaries are
available.

## Cost and risk

- No paid provider, credential, or external service is required by the
  decision itself.
- Choosing a local fixture without approval risks incorrect TOEIC/licensed
  content and invalid learner evidence.
- Allowing generated Prisma output or a schema workaround outside scope risks
  architecture drift and runtime type mismatch.

## Options

1. Approve an EnglishPath-owned, credential-free Speaking task catalogue/fixture
   and extend the story scope to include the required generated Prisma client
   output or an approved repository boundary. Then implement additive schema,
   repository, API E2E, and lifecycle constraints.
2. Approve an in-memory/local adapter for the beta and explicitly defer durable
   submission persistence and cross-process idempotency to a successor story.
   This reduces safety but changes the acceptance criteria and is not
   recommended for learner progress evidence.
3. Defer EP4-ST002 until the canonical task source and Prisma generated-output
   ownership are approved. Keep the story blocked and continue independent
   EP4-ST005 or other dependency-ready work. Recommended.

## Recommendation

Choose Option 3 unless the owner explicitly approves Option 1. Preserve the
current blocked story and do not resume it until the decision is recorded.

## How to continue after approval

1. Record the selected option and any changed allowed paths/acceptance criteria
   in the story and this request.
2. If Option 1, add the approved task fixture/source and generated-client
   boundary to the story scope, then resume EP4-ST002 in place; do not create a
   duplicate recovery ID.
3. Run story doctor, Prisma validation, focused unit/repository/API E2E tests,
   full quality gates, and manual high-risk review before merge to `dev`.

## Technical evidence

- Blocked loop commit: `e713124` (`EP4-ST002: blocked by loop`).
- Build result: `.codex-build.result.md` reported no files changed and the
  persistence/source boundary as blocked.
- Planning result: `.codex-plan.result.md` identified the missing approved
  task catalogue and forbidden generated Prisma path.
- Existing generator path: `apps/api/src/generated/prisma`.
