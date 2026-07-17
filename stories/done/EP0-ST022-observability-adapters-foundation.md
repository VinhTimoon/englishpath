---
id: EP0-ST022
title: Observability And Correlation Adapters Foundation
status: done
type: backend
priority: critical
phase: phase-0-foundation
allowed_paths:
  - apps/api/src/modules/observability/**
  - docs/06_BACKEND_ARCHITECTURE.md
  - docs/08_API_CONTRACT.md
  - docs/10_TEST_STRATEGY.md
  - docs/11_SECURITY_PLAN.md
  - docs/12_DEPLOYMENT_PLAN.md
  - stories/**
forbidden_paths:
  - notes/**
  - apps/web/**
  - apps/api/prisma/**
  - apps/api/src/app.module.ts
  - apps/api/src/generated/**
  - .env
requires_human_approval: false
max_fix_rounds: 3
---

# Story: Observability And Correlation Adapters Foundation

## Goal

Define credential-free structured logging, monitoring, analytics, and correlation
contracts with deterministic local/no-op adapters and default-deny data redaction, so
later runtime integrations can be added without coupling product code to providers.

## Dependency

- Requires completed `EP0-ST021` Drive inventory foundation on `dev`.
- Completes the Phase 0 foundation exit sequence before Phase 1 feature stories begin.
- `EP1-ST038` owns real PostHog/Sentry integration, launch dashboards, provider
  credentials, and production alert configuration.
- Later domain stories own feature-specific event names and operational SLO thresholds.

## Business Rules

- Correlation IDs are accepted or generated at the application edge and propagated
  through logs, metrics, analytics, jobs, adapters, audit events, and API envelopes.
- Observability events use explicit names, timestamps, correlation IDs, severity or
  measurement semantics, and flat bounded attributes; arbitrary nested payloads are
  not accepted.
- Logs and monitoring never expose authorization headers, tokens, cookies, passwords,
  secrets, private answers, raw provider payloads, private source locations, payment
  payloads, or unnecessary personal data.
- Analytics receives the minimum product-event data required and must not use email,
  phone, name, token, or raw free text as identity/attributes.
- Local collectors are deterministic, in-memory, deeply immutable snapshots; no-op
  adapters safely discard events. Neither adapter uses console, environment, file,
  database, network, credentials, or paid services.
- Provider delivery failure must not change product business decisions in this
  foundation; retry/buffering policy belongs to the real integration story.

## BE Requirements

- Add readonly contracts for correlation context, structured log events, metric
  measurements, analytics events, bounded scalar attributes, and the three adapter
  ports.
- Add runtime factories/validators with stable sanitized typed errors, injected clock,
  and injected correlation-ID generator for deterministic tests.
- Define explicit log severities and metric kinds/units; reject unknown runtime enums,
  malformed names/timestamps/IDs, non-finite measurements, nested values, oversized
  attribute sets/keys/strings, and prohibited sensitive keys.
- Implement redaction that drops prohibited attributes before any adapter receives an
  event and never includes rejected values in error messages.
- Add no-op adapters plus local in-memory collectors that copy/freeze input, preserve
  deterministic append order, and return frozen snapshots that cannot mutate internal
  state.
- Add unit tests for correlation acceptance/generation, propagation across all event
  types, redaction, validation boundaries, stable failures, no-op behavior, collector
  isolation/order/immutability, malformed runtime inputs, and absence of external I/O.

## Documentation Requirements

- Document `X-Correlation-Id` validation/generation/propagation and sanitized API error
  correlation behavior without adding a route or middleware in this story.
- Document local/no-op adapter ownership, provider deferral to `EP1-ST038`, minimum
  future metrics, redaction rules, and credential-free test strategy.
- Document that audit persistence is a separate append-oriented domain and analytics
  events are not an audit substitute.

## Acceptance Criteria

- Tests run without provider credentials, network, database, filesystem, console, or
  paid services.
- All three ports accept only validated, redacted, immutable events carrying the same
  correlation context.
- Sensitive/prohibited attributes never appear in collector snapshots or errors.
- Local collectors cannot be mutated through original input or returned snapshots; no-op
  adapters expose no retained state.
- No provider SDK, route, middleware, Prisma/generated source, migration, frontend,
  environment, or Nest runtime registration change is introduced.
- Documentation clearly defers PostHog/Sentry and production alerting to `EP1-ST038`.
- Full repository checks, diff check, story verification, and read-only Codex review
  pass with no P0/P1 findings.

## Verification

- `pnpm format:check`
- `pnpm planning:traceability`
- `pnpm tool:test`
- `pnpm prisma:validate`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm --filter api test:e2e`
- `pnpm build`
- `pnpm e2e`
- `pnpm story:verify stories/done/EP0-ST022-observability-adapters-foundation.md`
- `git diff --check`

## Implementation Report

- Added provider-neutral correlation, structured logging, monitoring, and analytics
  contracts with injected clock/ID dependencies and stable sanitized errors.
- Added centralized bounded-scalar validation and case/separator-insensitive redaction
  before adapter delivery.
- Added no-op adapters and deterministic in-memory collectors with defensive copies,
  append ordering, frozen snapshots, and no external I/O.
- Added credential-free unit tests for propagation, runtime validation, redaction,
  sanitization, no-op behavior, collector isolation, and deep immutability.
- Documented API correlation behavior, audit separation, test strategy, launch signals,
  and deferral of PostHog/Sentry production wiring to `EP1-ST038`.
