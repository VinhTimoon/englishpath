# EnglishPath Agent Instructions

## Project

EnglishPath is a free-first English learning platform for Vietnamese learners.

Current stack:
- Next.js frontend
- NestJS backend
- Supabase PostgreSQL
- Prisma 7
- REST API
- BMAD for planning and story governance
- Codex for loop engineering

## BMAD Workflow

Codex must follow BMAD artifacts before implementation.

Read in this order:
1. Current story file
2. AGENTS.md
3. ai-skills/routing/skill-router.md
4. Relevant BMAD planning artifacts
5. Relevant project docs
6. Relevant project skills

Do not implement features without a story.

## Skill Routing

Codex must use `ai-skills/routing/skill-router.md` to decide which docs and skills to load for a story.

Do not load all project skills by default.
Load only the story, AGENTS, skill router, and the minimum relevant BMAD artifacts, docs, and skills for the current task.

## Story Rule

Implement one story at a time.

Each story must define:
- id
- title
- status
- type
- allowed_paths
- forbidden_paths
- acceptance criteria
- verification commands

If the requested change requires forbidden paths, stop and mark the story as blocked.

## Frontend Rules

Frontend stack:
- Next.js
- TypeScript
- Tailwind CSS
- FSD-style architecture
- Atomic/shared UI
- TanStack Query
- Zustand
- React Hook Form
- Zod

Rules:
- Route files must be thin.
- Do not put business logic directly in route files.
- Use shared UI components before creating new ones.
- Every page must handle loading, empty, error, and success states.
- UI must be mobile-first.
- Do not invent random colors or gradients.
- Follow docs/09_UI_DESIGN_SYSTEM.md.

## Backend Rules

Backend stack:
- NestJS
- Modular N-layer
- Controller -> Service -> Repository
- REST API
- Swagger/OpenAPI
- PostgreSQL + Prisma

Rules:
- Controllers must not contain business logic.
- Services contain business rules.
- Repositories contain database access.
- DTO validation is required.
- Protected endpoints require guards.
- Admin endpoints require admin role.
- List endpoints require pagination.
- Never return sensitive fields.

## Prisma Rules

- Use Prisma through PrismaService.
- Do not instantiate PrismaClient in random files.
- Do not modify schema.prisma without updating docs/07_DATABASE_DESIGN.md.
- Do not run destructive migrations without human approval.

## AI Rules

- AI calls must go through backend AI Gateway.
- Never call AI provider directly from frontend.
- Never expose API keys.
- Track model, prompt version, user quota, and estimated cost.

## TOEIC Security

- Never send correct_answer to frontend before submission.
- Exam timer must be validated server-side.
- Suspicious exam events should be stored.

## Token Budget

Do not load the entire codebase unless explicitly required.

Use:
- current story
- skill-router
- relevant docs
- relevant files only

If context becomes too large, summarize first or split the story.

## Verification

Before reporting done, run:
- pnpm lint
- pnpm typecheck
- pnpm test
- pnpm build

If a command does not exist yet, report it clearly and do not pretend it passed.

## Automation

- Never auto-merge production.
- Auto PR to staging is allowed after checks pass.
- If blocked, write the reason clearly.
