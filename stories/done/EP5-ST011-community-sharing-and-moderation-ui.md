---
id: EP5-ST011
title: Community sharing and moderation UI
status: done
type: frontend
priority: high
phase: phase-5-full-test-adaptive-ai-and-community
risk: medium
delivery_mode: full-review
depends_on:
  - EP5-ST010
---

# Completion evidence

Implemented the authenticated `/community` vertical slice over EP5-ST010:
published learner posts, bounded submission with server-owned `PENDING_REVIEW`,
safe reporting, guarded moderation queue and decisions, strict Zod allowlists,
stable idempotency keys, explicit auth/forbidden/error/empty/replay/conflict/
unavailable states, mobile-first accessibility, and fail-closed pagination.

Changed files are limited to the approved web community feature, route, widget,
contracts, and browser coverage. No backend, schema, package, environment,
provider, migration, CI, or Phase 6 changes.

Verification evidence:

- `pnpm --filter web lint` pass
- `pnpm --filter web typecheck` pass
- `pnpm format:check` pass
- `pnpm planning:traceability` pass
- `pnpm --filter web build` pass
- `pnpm test` pass: 77 suites, 549 tests
- `pnpm e2e -- tests/e2e/community-sharing.spec.ts` pass: 16 tests
- `pnpm e2e` pass: 125 tests
- `pnpm story:verify stories/in-progress/EP5-ST011-community-sharing-and-moderation-ui.md` pass before lifecycle close
- `git diff --check` pass
- Mandatory medium-risk review completed with no P0/P1 findings

Merged fast-forward to `dev`; no production promotion performed.
