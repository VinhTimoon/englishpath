---
id: EP0-ST018
title: Browser E2E Accessibility And Local Journey Foundation
status: review
type: tooling
priority: critical
phase: phase-0-foundation
allowed_paths:
  - .github/workflows/**
  - package.json
  - pnpm-lock.yaml
  - playwright.config.ts
  - tests/e2e/**
  - scripts/run-checks.mjs
  - scripts/tests/**
  - docs/10_TEST_STRATEGY.md
  - stories/**
forbidden_paths:
  - notes/**
  - apps/api/src/**
  - apps/api/prisma/**
  - apps/web/src/**
  - .env
requires_human_approval: false
max_fix_rounds: 3
---

# Story: Browser E2E Accessibility And Local Journey Foundation

## Goal

Add a credential-free browser test harness that exercises the current web application
at the canonical local frontend port and can be extended by later critical journeys.

## Dependency

- Requires completed `EP0-ST017` CI and migration safety gates on `dev`.
- Must complete before `EP0-ST019` auth identity foundation begins.

## Business Rules

- Browser checks use FE origin `http://localhost:5173` and require no production
  credentials, paid service, shared database, or external API.
- The harness owns starting and stopping its local web server in CI; local runs may
  reuse an already-running server.
- Tests use stable accessibility-facing selectors and observable state, never
  arbitrary sleeps.
- Keep this foundation limited to the current public landing smoke journey; later
  product stories own their feature-specific journeys.

## Requirements

- Add Playwright Chromium configuration with deterministic local/CI behavior,
  screenshot and trace evidence retained on failure, and bounded timeouts.
- Add a public landing smoke test that verifies successful navigation, the main
  landmark, meaningful page content, and absence of horizontal overflow at 360px.
- Add an automated accessibility smoke scan for serious or critical violations on the
  current landing page.
- Add root scripts and `pnpm story:checks` integration so browser E2E is a mandatory
  gate after build, with tests proving gate ordering and required-script validation.
- Update GitHub CI to install only the required Playwright browser and run the browser
  gate without secrets.
- Replace the placeholder browser section in the test strategy with executable local
  commands, selector policy, evidence policy, and ownership rules.

## Acceptance Criteria

- `pnpm e2e:install` installs the CI browser dependency and `pnpm e2e` runs the
  credential-free landing journey against port `5173`.
- The 360px test fails on horizontal document overflow and does not hide failures with
  retries locally.
- The accessibility scan fails on serious or critical violations and prints actionable
  affected targets.
- CI installs Chromium after the frozen dependency install and runs browser E2E through
  the trusted repository checks.
- Existing format, planning traceability, tooling, Prisma validation, lint, typecheck,
  unit, API e2e, and build gates continue to pass.
- Read-only Codex review reports no P0/P1 findings, story verification passes, and no
  file outside `allowed_paths` changes.

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
- `pnpm e2e:install`
- `pnpm e2e`
- `pnpm story:verify stories/review/EP0-ST018-browser-e2e-foundation.md`
- `git diff --check`

## Implementation Report

- Added a Chromium-only Playwright harness rooted at `http://localhost:5173`.
- Added landing smoke coverage for navigation, main landmark content, 360px
  horizontal overflow, and serious/critical accessibility violations.
- Made `pnpm story:checks` validate required scripts and execute browser E2E
  after `pnpm build`.
- Updated CI to install Chromium after dependency install, run repository checks
  through `pnpm story:checks`, and upload Playwright failure artifacts.
- Replaced the browser placeholder in the test strategy with executable local and
  CI policy.
