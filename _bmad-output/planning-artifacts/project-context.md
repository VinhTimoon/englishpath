# Project Context

## Purpose

EnglishPath is a free-first English learning platform for Vietnamese learners.

This document establishes the minimum planning context BMAD and Codex should assume before story implementation.

## Product Scope

- Deliver guided English learning experiences for Vietnamese users.
- Support frontend, backend, database, and AI-assisted learning workflows.
- Keep governance artifacts lightweight and story-driven.

## Delivery Model

- BMAD owns planning and story governance.
- Codex owns loop engineering and story implementation.
- Implementation must happen one story at a time.
- The current story is the source of truth for allowed paths, forbidden paths, acceptance criteria, and verification.

## Mandatory Inputs Before Implementation

Read in this order:
1. Current story file
2. `AGENTS.md`
3. `ai-skills/routing/skill-router.md`
4. Relevant BMAD planning artifacts
5. Relevant project docs
6. Relevant project skills

## Governance Constraints

- Do not work without a story.
- Do not modify files outside the story's `allowed_paths`.
- If a required change touches a forbidden path, stop and report the story as blocked.
- Load only the minimum context required for the active story.
- Do not modify `.env` files.

## Architecture Baseline

- Frontend: Next.js, TypeScript, Tailwind CSS, FSD-style architecture
- Backend: NestJS modular N-layer, REST API
- Database: Supabase PostgreSQL with Prisma 7
- State and forms: TanStack Query, Zustand, React Hook Form, Zod

## Quality Gate

Before reporting a story complete, run:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

If a command is missing or failing, report that honestly in the final story report.
