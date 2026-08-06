# AI Request: EP1-ST038 Observability Provider Launch Configuration

Date: 2026-08-06
Story: EP1-ST038
Category: external provider / production configuration
Status: awaiting owner decision

## Decision Needed

Approve the production/staging observability provider configuration required for
PostHog analytics and Sentry monitoring, including provider accounts, credentials,
retention/privacy settings, retry/buffering policy, dashboards, and alert owners.

## Why This Is Outside Automatic Authority

The approved deployment plan explicitly keeps provider contracts, production
credentials, budgets, retention, and production promotion owner-controlled. The
repository currently provides credential-free local/no-op observability adapters;
activating a real provider would create external state and may incur cost or data
processing obligations.

## Impact And Risk

- Without approval, EnglishPath can continue local/staging-quality checks through the
  no-op/local adapters, but production launch dashboards and real alert delivery are
  not evidenced.
- Enabling a provider without a decision risks leaking learner identifiers or private
  learning data, violating retention/privacy policy, or creating unapproved spend.
- No credentials, provider configuration, network calls, or production changes have
  been made by this request.

## Options

1. Approve the planned PostHog/Sentry providers with exact project IDs, public/secret
   key placement, retention/privacy settings, alert recipients, and spending limits.
2. Approve a different provider pair and provide the equivalent contract, privacy,
   retention, and budget decisions.
3. Defer real provider activation and explicitly accept a beta exit based on local
   no-op evidence only; keep production readiness owner-deferred.

## Recommendation

Choose option 1 only after confirming data minimization, Vietnamese learner privacy,
retention, alert ownership, and budget limits. Until then, keep the adapters
credential-free and do not promote to production.

## Technical Evidence

- `docs/12_DEPLOYMENT_PLAN.md` requires approved PostHog/Sentry adapters, credentials,
  retention/privacy, retry/buffering behavior, dashboards, and alerts before
  production promotion.
- `docs/04_SYSTEM_ARCHITECTURE.md` requires analytics and monitoring behind replaceable
  backend adapters with local/mock implementations for credential-free environments.
- `apps/api/src/modules/observability/` contains validated, redacting local/no-op
  adapters; tests cover bounded attributes, correlation, and sensitive-data removal.

## How To Continue After Approval

Record the exact provider decision and owner in this request, then implement only the
approved adapter configuration and dashboards on a dedicated story branch. Add tests
for redaction, retry/buffering, retention, alert routing, and failure behavior before
any staging or production promotion. If option 3 is chosen, record the owner-deferred
exit decision and leave the real-provider acceptance criteria explicitly deferred.
