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

- Run Playwright against `http://localhost:4173` with Chromium only.
- Install the browser binary with `pnpm e2e:install`.
- Run the suite with `pnpm e2e`. `pnpm story:checks` runs it automatically after
  a successful root `pnpm build`.
- The harness owns `pnpm --filter web start` in CI and other clean environments.
  Local runs may reuse an already-running server on port `4173`.
- Keep execution bounded: finite Playwright timeouts, one worker, zero retries,
  and no arbitrary sleeps.
- Retain screenshot and trace evidence on failure only. If repository checks fail, CI
  uploads any Playwright results available under `node_modules/.cache`.
- Use stable accessibility-facing selectors and observable outcomes such as
  landmarks, headings, link names, URL changes, and visible copy.
- Scope the foundation to the public landing smoke journey. Later stories own
  onboarding, learning, auth, payment, and other feature-specific journeys.
- Accessibility smoke scans must fail on any serious or critical violations and
  print actionable affected targets.
- If the current UI fails browser or accessibility checks and the story forbids
  changing application source, mark the story blocked instead of weakening the tests.
- Public SEO coverage verifies canonical/Open Graph/Twitter metadata for every public
  route, exact sitemap membership, robots directives, bidirectional links, static
  content without JavaScript, 360px overflow, and serious/critical axe findings.

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

## Observability Adapter Tests

- Contract tests use injected clocks and correlation generators; they require no
  PostHog/Sentry credentials or provider network.
- Every log, metric, and analytics path tests correlation propagation, runtime enum and
  scalar-bound validation, sensitive-key redaction, sanitized errors, and immutable
  event graphs.
- Local collectors test append order, defensive copies, frozen snapshots, and snapshot
  isolation. No-op adapters validate then discard events and expose no retained state.
- Provider integration, retries, buffering, dashboards, and production alerts belong to
  `EP1-ST038` and require separate adapter/contract tests.
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

## Identity Repository Tests

- Validate Prisma schema and regenerate the checked-in client without a database
  connection.
- Exercise identity, profile, and role repositories through mocked Prisma delegates and
  callback transactions; no Supabase, PostgreSQL, credentials, or network is required.
- Cover provider-subject uniqueness, missing/inactive identity, owner isolation before
  query execution, canonical role separation, idempotent assignment, sanitized provider
  failures, and immutable domain outputs.
- Inspect the additive migration for required keys/indexes/foreign keys, canonical role
  rows, rollback notes, and absence of executable drop/delete statements.

## Vocabulary Taxonomy Tests

- Service tests use one injected snapshot repository and cover graph integrity,
  governance filtering, deterministic ordering, pagination, filters, bounded depth,
  ancestor retention, missing roots, immutable outputs, and sensitive evidence removal.
- API e2e tests exercise both public routes through `AppModule`, assert DTO and
  correlation validation plus stable envelopes, and prove vocabulary requests make no
  Prisma call and require no credentials, database, storage, or network.
- Repository-port overrides inject malformed snapshots and rejected provider promises;
  both must produce only a correlated, sanitized `INTERNAL_ERROR` envelope without
  partial data or private adapter details. Tests also remove known database/Supabase
  credentials and spy on `fetch` while exercising both routes.
- Public vocabulary browser tests intercept every port-3005 taxonomy request and cover
  delayed loading, strict success parsing, URL-owned filters, retryable failures, empty
  variants, semantic nesting, keyboard controls, mobile overflow, and axe findings.
  They never require the API process, credentials, or private governance fixtures.

## Governed Vocabulary Item Tests

- Repository tests mock `PrismaService` and assert review/publication/time filters,
  deterministic `word` then ID ordering, and an explicit public projection that omits
  source, license, and governance state.
- API E2E tests override Prisma and prove that unpublished content is not returned,
  pagination remains stable, and a non-public taxonomy node is sanitized as not found.

## Vocabulary SRS Tests

- Service tests verify owner-derived user IDs, bounded quality behavior, server-owned
  mastery/scheduling, missing optional media, unknown/unpublished item rejection,
  duplicate replay, and conflicting replay.
- Repository/API E2E tests verify authenticated due queues, empty queues,
  `(nextReviewAt, vocabularyId)` ordering, ownership isolation, validation, and
  concurrent idempotency through mocked Prisma and identity boundaries.

## Authentication Tests

Auth tests generate local asymmetric keys and never use live Supabase, credentials,
PostgreSQL, or network access. Coverage includes signature, issuer, audience, expiry,
identity status, ownership, DTO allowlisting, and response redaction. Jest runs with
Node VM modules because the approved `jose` v6 package is ESM-only.

## CMS Governance Tests

- Service tests cover privileged-role enforcement, denied audit decisions, draft
  idempotency replay, source/rights redaction, separate human review and publish
  authority, self-review rejection, and publication gating.
- Prisma validation/generation and API build checks cover the additive CMS schema;
  API verification must additionally exercise malformed DTOs, taxonomy parent
  validation, lifecycle conflicts, and the no-private-fields projection.

The reviewed vocabulary batch test asserts the exact 100 stable IDs, approved
taxonomy coverage, original CC0 provenance, and published state markers without
connecting to shared PostgreSQL or executing rollback SQL.
The batch-2 invariant additionally compares headwords with the foundation fixtures
and batch 1 to prevent duplicate learner cards across migrations.
The batch-3 invariant extends that comparison across both prior migrations and
keeps the same exact-count, taxonomy, provenance, and publication checks.
The batch-4 invariant extends the same cross-migration duplicate protection through
the fourth reviewed content batch.
The batch-5 invariant closes the five-batch uniqueness chain and protects against
duplicate learner cards across every reviewed vocabulary migration.

## TOEIC Question Governance Schema Tests

`toeic-question-schema.spec.ts` is a credential-free static invariant suite. It
proves that Parts 1–7 and the closed question, license, review, publication,
usage, and access domains are representable; answer keys, source locations,
rights metadata, and review evidence remain server-owned; stable version and
import identities plus lifecycle indexes exist; and the named migration contains
no executable destructive SQL.

## Learner Entry Tests

- Service tests cover owner-scoped onboarding persistence, answer-key redaction,
  deterministic grading, and duplicate-question rejection.
- API e2e tests preserve guards, DTO validation, controllers, and services while
  replacing database and identity boundaries; they cover the complete onboarding and
  placement contract plus mass-assignment and incomplete-submission rejection.
- A 360px Playwright journey intercepts only backend requests and exercises auth,
  onboarding, all ten placement answers, dashboard result rendering, bearer propagation,
  answer-key absence, and horizontal-overflow protection without credentials or network.

## Roadmap And Today Tests

- Pure rule-engine tests cover all four phases, the three-task cap below 30 minutes, five
  tasks at 60 minutes, TOEIC Parts 1-7 coverage, and communication speaking/daily-sentence
  invariants.
- API e2e tests preserve guards, validation, controller, and service while replacing the
  repository. They prove principal-owned seed usage, today projection, status allowlisting,
  authentication, and missing-prerequisite behavior without a database or credentials.
- A 360px Playwright journey covers no-roadmap generation, task completion, progress
  persistence in the response, phase overview navigation, bearer propagation, and mobile
  overflow without external network access.

## Daily Practice Tests

- The reviewed content baseline asserts five stable quiz cards with valid options,
  governed provenance, and no answer-key or governance metadata in the start
  projection. A migration fixture test independently asserts twenty stable,
  EnglishPath-original, reviewed and published Daily Sentence seeds.

- Service tests prove five-card answer-key redaction and backend grading inputs.
- The 360px browser journey completes five cards, covers correct/incorrect feedback,
  final score, XP, streak/error review, bearer propagation, and overflow without network
  or credentials.

## TOEIC question-bank evidence

EP2-ST002 tests should mock `PrismaService` and `AuthenticationGuard` without
Supabase credentials or network access. Focused coverage includes strict DTO
allowlisting, pagination and filters, server-side eligibility/current-version
selection, unauthorized access, empty and failure results, exact safe response
shape, and recursive negative assertions for answer and governance-field
leakage. Time is controlled at the service/repository boundary.

## TOEIC governance workflow evidence

EP2-ST003 tests use mocked Prisma, identity, and audit boundaries. Coverage proves
strict import/review/publish DTOs, actor- and request-derived import identity, exact
replay and conflict behavior, immutable version lineage, reviewer/publisher role
separation, self-review rejection, compare-and-set lifecycle transitions, server-
owned source-policy resolution, source URL and payload-checksum binding,
complete-content approval gates, approved-license
and free-practice publication gates, malformed-ID handling, repository/audit
fail-closed behavior, audit redaction, sanitized errors, and recursive negative
assertions for answer keys, source URLs, rights owners, and review evidence.
No test uses credentials, a shared database, a provider, or network access.

## TOEIC listening practice evidence

EP2-ST004 service, repository, and API E2E tests cover governed Parts 1-4
selection, insufficient-content failure, owner binding, client-session replay and
conflict, immutable answer retries, incomplete submission, compare-and-set submit,
safe projections, strict DTO rejection, authentication, and absence of answer keys
or correctness fields from pre-submit responses, plus active-session locking before
answer insertion and newest-version selection per canonical question. Tests mock Prisma and identity
boundaries and do not require a shared database or provider.

## TOEIC reading practice evidence

EP2-ST005 coverage mirrors the listening safety boundary for Parts 5-7: governed
selection and canonical-version deduplication, strict DTOs, owner/client replay
and race recovery, immutable answer retries, active-session locking before answer
insertion, complete submission, active/final results, sanitized repository errors,
and recursive negative assertions for answer keys, correctness, source, license,
review, and publication metadata. Tests use mocked Prisma and identity boundaries
without credentials, network access, or a shared database.

## TOEIC practice filter and UI evidence

EP2-ST006 covers governed catalogue derivation, filter propagation, preserved
reading topic identity, and full-shape replay conflicts in repository/service/API tests.
Browser coverage checks server-derived controls at 360px, no-skip answer
acknowledgement, ordered progress, final submission, safe response assertions, and
catalogue retry handling.
