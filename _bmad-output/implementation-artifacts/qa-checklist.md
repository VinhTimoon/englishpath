# QA Checklist

## Scope

- Confirm only one story was implemented.
- Confirm changed files stay inside `allowed_paths`.
- Confirm no forbidden paths were modified.

## Governance

- Confirm `AGENTS.md` references BMAD workflow and skill routing.
- Confirm `ai-skills/routing/skill-router.md` exists.
- Confirm planning and implementation artifact folders exist.
- Confirm required story folders exist.

## Verification

- Read `docs/10_TEST_STRATEGY.md` for testing stories.
- Run the story verification commands.
- Run project verification commands when required by `AGENTS.md`.
- Confirm API-affecting stories run `pnpm --filter api test:e2e`.
- Confirm tests use no real secrets or external service dependencies.
- If any command is missing or failing, record it explicitly.
