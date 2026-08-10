# AI Request: EP4-ST007 Provider-neutral feedback gateway policy

## Category
business

## Summary
EP4-ST007 cannot be implemented safely until the owner approves the
server-owned advisory feedback policy and its provider-neutral contract.

## Evidence
- `docs/04_SYSTEM_ARCHITECTURE.md` explicitly lists AI gateway implementation as
  out of scope for the current architecture foundation.
- `docs/06_BACKEND_ARCHITECTURE.md` defines only the future AI adapter boundary;
  it does not define an active feedback gateway contract.
- Repository search found no approved quota limits, estimated-cost calculation,
  advisory response schema, policy version, or licensed prompt source for this
  story.
- Existing planning artifacts describe these values as required but do not
  approve concrete values or a provider-neutral feedback schema.

## Attempts
Inspected the current story, `.codex-plan.md`, architecture/API/security
planning documents, decision log, existing modules, and repository-wide policy
references. No implementation files were created and no provider or external
service was contacted.

## Decision Needed
Approve all of the following before resuming EP4-ST007:

1. A versioned advisory response schema, including allowed fields and explicit
   rejection rules for official scores, rubric weights, hidden prompts,
   credentials, raw provider responses, and progress mutations.
2. A versioned server-owned quota policy with deterministic allowed, denied,
   and provider-unavailable outcomes, retry/idempotency semantics, and an
   approved estimated-cost model.
3. The prompt version/policy version identifiers and a licensed or
   EnglishPath-owned prompt source.
4. Whether durable usage evidence is approved, including its owner-scoped
   persistence boundary and additive Prisma constraints.

## Impact
Proceeding with guessed limits, cost values, schema fields, prompt provenance,
or persistence semantics could leak unsafe output, double-consume quota, expose
cross-owner evidence, or create irreversible contract/schema drift. No paid
provider activation or production credential is required for the eventual local
adapter, but the policy and contract decisions are prerequisites even for a
deterministic implementation.

## Owner brainstorming artifact

An autonomous brainstorming pass was completed for this request. It recommends
starting with a local deterministic/no-op adapter behind a provider-neutral port,
with a versioned server-owned quota policy, idempotency, safe allowlisted output,
and explicit provider-unavailable outcomes before any external provider is
activated.

- `_bmad-output/brainstorming/brainstorm-provider-neutral-ai-feedback-gateway-2026-08-10/brainstorm.html`
- `_bmad-output/brainstorming/brainstorm-provider-neutral-ai-feedback-gateway-2026-08-10/.memlog.md`

No EP4-ST007 implementation, provider activation, credential use, or external
service call was performed in this turn.

