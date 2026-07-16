# Skill Router - EnglishPath

Codex must not load all skills for every task.

## Always Load

- AGENTS.md
- ai-skills/routing/skill-router.md
- .agents/skills/englishpath-token-optimizer/SKILL.md
- Current story file

## Frontend Story

Load:
- docs/05_FRONTEND_ARCHITECTURE.md
- docs/09_UI_DESIGN_SYSTEM.md
- ai-skills/project/frontend-rules.md
- ai-skills/project/token-budget-rules.md
- .agents/skills/design-taste-frontend-v1/SKILL.md
- .agents/skills/gpt-taste/SKILL.md
- .agents/skills/minimalist-ui/SKILL.md
- .agents/skills/redesign-existing-projects/SKILL.md
- .agents/skills/full-output-enforcement/SKILL.md

Use when story touches:
- apps/web/**
- packages/ui/**
- layout
- page
- component
- form
- dashboard
- learning UI

## Public Landing / Marketing UI Story

Load:
- docs/05_FRONTEND_ARCHITECTURE.md
- docs/09_UI_DESIGN_SYSTEM.md
- ai-skills/project/frontend-rules.md
- .agents/skills/design-taste-frontend-v1/SKILL.md
- .agents/skills/gpt-taste/SKILL.md
- .agents/skills/high-end-visual-design/SKILL.md
- .agents/skills/minimalist-ui/SKILL.md
- .agents/skills/full-output-enforcement/SKILL.md

Use when story touches:
- homepage
- landing page
- public news pages
- SEO pages
- marketing sections
- hero section
- pricing section
- public conversion UI

## Backend Story

Load:
- docs/06_BACKEND_ARCHITECTURE.md
- docs/08_API_CONTRACT.md
- ai-skills/project/backend-rules.md
- .agents/skills/englishpath-backend-nlayer/SKILL.md

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
- .agents/skills/englishpath-prisma-supabase/SKILL.md

Use when story touches:
- apps/api/prisma/**
- apps/api/src/generated/**
- repositories
- database migrations

## AI Story

Load:
- docs/04_SYSTEM_ARCHITECTURE.md
- ai-skills/project/ai-gateway-rules.md
- .agents/skills/englishpath-backend-nlayer/SKILL.md

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
- .agents/skills/bmad-code-review/SKILL.md
- .agents/skills/bmad-review-edge-case-hunter/SKILL.md

## BMAD Planning Story

Load:
- .agents/skills/bmad-agent-pm/SKILL.md
- .agents/skills/bmad-agent-architect/SKILL.md
- .agents/skills/bmad-create-epics-and-stories/SKILL.md
- .agents/skills/bmad-check-implementation-readiness/SKILL.md

## Token Rule

Do not load more than 8 context files for one story.

If more than 8 files are needed, split the story.

## External UI Skill Rule

Do not load all frontend taste skills at once.

Default frontend implementation:
- design-taste-frontend-v1
- gpt-taste
- minimalist-ui
- full-output-enforcement

Use high-end-visual-design only for public landing, homepage, marketing, or visual polish stories.

Use redesign-existing-projects when modifying existing UI.

Do not use stitch-design-taste unless the story explicitly uses Google Stitch.