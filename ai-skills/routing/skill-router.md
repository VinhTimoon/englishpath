# Skill Router - EnglishPath

Codex must not load all skills for every task.

## Always Load

- AGENTS.md
- _bmad-output/planning-artifacts/project-context.md
- _bmad-output/implementation-artifacts/definition-of-done.md
- Current story file

## Frontend Story

Load:
- docs/05_FRONTEND_ARCHITECTURE.md
- docs/09_UI_DESIGN_SYSTEM.md
- ai-skills/project/frontend-rules.md
- ai-skills/project/token-budget-rules.md

Use when story touches:
- apps/web/**
- packages/ui/**
- layout
- page
- component
- form
- dashboard
- learning UI

## Backend Story

Load:
- docs/06_BACKEND_ARCHITECTURE.md
- docs/08_API_CONTRACT.md
- ai-skills/project/backend-rules.md
- ai-skills/project/api-contract-rules.md
- ai-skills/project/token-budget-rules.md

Use when story touches:
- apps/api/src/modules/**
- controllers
- services
- repositories
- DTO
- guards
- policies

## Database Story

Load:
- docs/07_DATABASE_DESIGN.md
- ai-skills/project/database-rules.md
- ai-skills/project/token-budget-rules.md

Use when story touches:
- apps/api/prisma/**
- migrations
- Prisma schema
- repositories

## AI Story

Load:
- docs/04_SYSTEM_ARCHITECTURE.md
- ai-skills/project/ai-gateway-rules.md
- ai-skills/project/token-budget-rules.md

Use when story touches:
- apps/api/src/modules/ai-gateway/**
- writing feedback
- speaking room
- AI scoring
- prompt templates

## Testing Story

Load:
- docs/10_TEST_STRATEGY.md
- ai-skills/project/testing-rules.md
- ai-skills/project/token-budget-rules.md

## Token Rule

Do not load every skill.

Maximum files per story:
- small story: 3 to 5 context files
- medium story: 5 to 8 context files
- large story: split into smaller stories

If more than 8 skill/context files are required, the story is too large.