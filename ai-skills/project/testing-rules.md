# EnglishPath Testing Rules

- Read `docs/10_TEST_STRATEGY.md` before changing tests or test tooling.
- Add the smallest test level that catches the behavior: unit first, integration
  when collaboration matters, e2e for HTTP/module wiring.
- A bug fix must include a regression test for the original failure.
- Mock external boundaries, not internal business logic.
- API e2e must boot `AppModule`, use HTTP assertions, and override `PrismaService`;
  never require `DATABASE_URL` or a live Supabase project.
- Do not edit `apps/api/src/generated/**` to satisfy Jest or TypeScript.
- Keep fixtures explicit, isolated, deterministic, and independent of test order.
- Do not use arbitrary sleeps, real secrets, paid APIs, or shared mutable databases.
- Assert sanitized failure responses as well as success paths.
- Run `pnpm lint`, `pnpm typecheck`, `pnpm test`,
  `pnpm --filter api test:e2e`, and `pnpm build` before reporting done.
- Report skipped or unavailable commands honestly.
- If required coverage needs a forbidden path, return `blocked`; do not weaken the
  acceptance criteria.
