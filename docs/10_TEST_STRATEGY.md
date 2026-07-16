# EnglishPath Test Strategy

## Purpose

Testing protects learner progress, API contracts, content integrity, and the
automation that promotes stories into `dev`. Tests must be deterministic,
repeatable on a clean machine, and independent of developer secrets.

## Test Levels

### Unit Tests

- Cover services, repositories, controllers, utilities, validation, and state logic.
- Mock the direct dependency of the subject, not the subject itself.
- Backend service tests mock repositories; repository tests mock `PrismaService`.
- Assert success, expected failure, and sanitized error behavior.
- Use `*.spec.ts` or the framework convention beside the tested source.

### Integration Tests

- Verify multiple in-process components when their collaboration contains risk.
- Preserve real DTO validation, serialization, module providers, and business rules.
- Replace only external boundaries such as PostgreSQL, Redis, queues, email, storage,
  analytics, and AI providers.
- Do not require `.env` secrets or live network services.

### API E2E Tests

- Boot the Nest application through `AppModule` and exercise routes over HTTP.
- Preserve controllers, services, repositories, dependency injection, exception
  mapping, and response shaping.
- Override `PrismaService` in the testing module so tests never connect to a real
  Supabase/PostgreSQL database.
- Validate status codes and contract fields, including sanitized error responses.
- Prisma generated TypeScript uses relative `.js` import specifiers; Jest
  configuration must resolve them to TypeScript source without editing generated files.
- Run with `pnpm --filter api test:e2e`.

### Browser E2E Tests

Browser tests will be added when user-facing flows are implemented. They should
cover only high-value journeys such as onboarding, daily learning, quiz completion,
and authentication recovery. Use stable accessibility selectors and mock or seed
external boundaries deterministically.

## Mandatory Gates

Every story must run the commands required by its scope. The repository completion
baseline is:

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm --filter api test:e2e
pnpm build
```

`pnpm story:checks` runs this baseline. A green root `pnpm test` does not replace
the separate API e2e command.

## Regression Rules

- Every bug fix adds a test that fails for the original defect.
- Changed behavior updates both tests and the relevant API/product documentation.
- Security-sensitive flows test ownership, authorization, and data redaction.
- TOEIC answer keys must never appear in pre-submission responses or fixtures exposed
  to the frontend.
- AI features mock the gateway/provider boundary and assert model, prompt-version,
  quota, and cost metadata where applicable.

## Test Data And Environment

- Use small explicit fixtures with names that explain intent.
- Freeze or validate time without relying on locale-specific strings.
- Tests must not depend on execution order or shared mutable state.
- Clean up applications, timers, mocks, and temporary files after each test.
- Never read real `.env` credentials, call paid APIs, or mutate shared databases.
- Never edit or snapshot generated Prisma source to make a test pass.

## Flakiness Policy

- Do not use arbitrary sleeps.
- Wait on observable application state with finite timeouts.
- A flaky test is a failing test; fix or quarantine it with an owner and written
  reason before merging.
- Retries must not hide deterministic failures.

## Story Expectations

Tests must stay inside the story's allowed paths. If meaningful verification
requires a forbidden path, mark the story blocked rather than weakening the test.
Report commands that were skipped or unavailable; never claim they passed.
