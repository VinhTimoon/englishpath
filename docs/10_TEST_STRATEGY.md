# EnglishPath Test Strategy

## EP2-ST012 TOEIC exit evidence

TOEIC eligibility regression coverage asserts that practice and timed-test
catalogues share the approved source-identity allowlist while applying their
distinct usage scopes. The exit gate also exercises answer-key protection,
owner-scoped sessions, content governance, responsive keyboard journeys, and
the full browser suite on the approved local ports (`3005` API and `4173` web).

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

## EP2-ST007 evidence

Timed-test policy, service, repository-boundary, and API E2E tests freeze the
server clock and assert the exact MINI/HALF quotas and durations, strict DTOs,
owner isolation, canonical-version selection, immutable snapshot reads,
insufficient catalogue failure, replay/conflict behavior, unique-answer race
recovery, authoritative post-write progress, deadline expiry, exactly-once
finalization, and recursive forbidden-field absence. Tests use injected
repositories, Prisma boundary fixtures, and identity overrides; no credentials,
provider, network, or shared database is required.

## EP2-ST008 evidence

`tests/e2e/toeic-timed-test.spec.ts` covers the authenticated mocked learner
journey at 360px: exact MINI start inputs, server-shaped ordered questions,
answer acknowledgement before advancing, safe-field absence, stored-session
resume, retry after a failed answer, and server expiry reconciliation. The
entity parser rejects malformed totals, incomplete active snapshots, duplicate
options, forbidden nested fields, and active score leakage. Full project gates
remain required before merge.

EP2-ST009 adds deterministic analysis-policy tests for score/accuracy rounding,
Part-to-skill mapping, stable weakness ordering, zero-answer and time-clamping
boundaries, persisted policy/quota validation, plus API tests for finalization,
owner isolation, repeat reads, malformed snapshots, sanitized repository
failures, and recursive disclosure. Browser coverage verifies conditional
analysis fetching, final-result preservation on analysis failure, retry,
unavailable state, Part/skill rendering, refresh repeat, 360px layout, keyboard
access, and accessibility. The analysis endpoint never accepts client-authored
score or timing values.

EP2-ST009 verification evidence (2026-08-06): TOEIC backend unit tests passed
13 suites/86 tests, timed-test API E2E passed 15 tests, the deterministic
frontend unit runner passed 6 checks, the focused timed-test browser journey
passed 12 tests, and the full browser suite passed 64 tests. Project lint,
typecheck, test (52 suites/388 tests), build, Prisma validate, formatting, and
planning traceability also passed.

## EP2-ST010 Error Notebook evidence

Coverage must prove additive source/reference constraints, finalized-only capture,
incorrect-answer filtering, duplicate and unique-race replay, owner isolation,
bounded source-filtered pagination, practice regression, and absence of private
fields in timed-test responses. Browser coverage exercises notebook loading,
empty/error/success states, TOEIC remediation navigation, keyboard access, and a
360px no-overflow viewport. Local Prisma validation and mocked repository tests
are evidence only; the additive migration is not applied to shared Supabase.

## EP2-ST011 remediation-pack evidence

Coverage must also prove bounded deterministic pack ordering, duplicate removal,
published vocabulary eligibility, reviewed grammar-link allowlisting,
catalogue-confirmed practice deep links, empty-content behavior, failure
isolation, strict response parsing, and absence of answer/session/user fields.
Browser evidence covers pack links, deep-link setup, unavailable/empty states,
keyboard focus, 360px layout, and axe checks.

# EP3-ST001 local verification

The library foundation is verified with static Prisma schema/migration checks and
credential-free deterministic adapter tests. Tests must not read `.env`, access
Drive/Supabase, call a network, or apply migrations to shared infrastructure.

## EP3-ST005 catalogue evidence

API unit and E2E coverage must prove authentication, fail-closed eligibility,
server-derived facets, bounded validation, deterministic pagination/search,
safe-field redaction, distinct empty states, and sanitized adapter failure.
Browser coverage must prove URL query preservation, retry, keyboard/focus
behavior, 360px no-overflow, and an accessibility smoke check. The local
catalogue adapter is fixture-compatible and must not contact a real provider.

## EP3-ST006 media evidence

API tests must prove request-time eligibility, indistinguishable not-found
responses, transcript ordering/bounds, all controlled storage states, provider
failure sanitization, and absence of locators/source fields. The local adapter
must not contact Drive, Supabase, or real storage; no browser player test is
required until EP3-ST007.

## EP3-ST007 learner state coverage

The player slice requires API unit and E2E coverage for authentication,
request-time eligibility, owner isolation, bounded/idempotent progress,
bookmark and note CRUD, note control-data rejection, media-state redaction,
and indistinguishable not-found behavior. Browser coverage verifies server
resume, unavailable media, note-save and bookmark flows, retry, keyboard
accessibility, and a 360px layout.

## EP3-ST008 listening drill coverage

Tests must prove answer-key redaction, strict option/question validation,
request-time eligibility, owner-scoped immutable outcomes, duplicate replay,
retry/unavailable/empty UI states, keyboard submission, narrow-screen layout,
and accessibility without color-only correctness communication.
Library-link coverage includes authenticated eligibility failures, deterministic
ordering, safe internal-route redaction, and owner isolation. Browser coverage
checks loading/empty/error/success states, retry, keyboard focus, mobile width,
and restoration of the library version context.

### Reviewed batch coverage

Governance tests cover identity validation, exact replay, duplicate/conflict
handling, and batch atomicity. Library API tests cover publication gating,
unavailable states, deterministic inventory ordering, and learner redaction.

### EP3-ST012 phase-exit evidence (2026-08-10)

Credential-free targeted verification passed: 16 API unit suites/195 tests and
4 API E2E suites/10 tests. Full verification passed lint, typecheck, 63 API
unit suites/457 tests, build, 87 Chromium browser tests, and `git diff --check`.
No Drive, Supabase Storage, CDN, third-party provider, credential, migration,
or shared database was used.

# EP4-ST001 coverage

The additive model boundary has focused unit coverage for allowlists, bounds,
lineage/publication behavior, deep immutability, rubric weights and duplicate
identifiers, safe projections, and forbidden-field absence. Persistence,
submission, recording, AI, and official-score behavior are intentionally not
tested until their later stories.

## Four Skills balance coverage

Test the canonical bucket validator, deterministic ordering, bounded allocation, required/due preservation, underrepresented skills, empty or unavailable pools, learner-safe projections, and regression of roadmap/today ownership behavior.

The roadmap API regression suite also verifies the additive `fourSkills`
projection, canonical ordering, owner-authenticated access, explicit
Speaking/Writing unavailability, backward-compatible roadmap/today fields, and
absence of provider, rubric, submission, credential, or answer data.

EP4-ST002 adds service, repository-boundary, and API E2E coverage for published
task gating, owner-scoped sessions, DTO bounds, exact idempotent replay,
changed-key conflicts, finalization immutability, and safe response redaction.
