---
name: englishpath-prisma-supabase
description: Guide safe Prisma 7 and Supabase PostgreSQL changes for EnglishPath.
---

# EnglishPath Prisma Supabase Skill

Use this skill when working on:
- Prisma schema
- migrations
- repositories
- Supabase PostgreSQL connection
- database access patterns

## Current Setup

- Database: Supabase PostgreSQL
- ORM: Prisma 7
- Backend: NestJS
- Prisma Client is generated into `apps/api/src/generated/prisma`
- Prisma must be accessed through `PrismaService`

## Rules

- Do not instantiate PrismaClient outside PrismaService.
- Do not modify `schema.prisma` without updating database docs.
- Do not run destructive migrations without human approval.
- Do not expose raw internal database fields.
- Use repository layer for Prisma queries.
- Keep migration names meaningful.

## Supabase Rules

- Treat Supabase as PostgreSQL database for now.
- Do not use Supabase client directly in frontend.
- Do not bypass NestJS API.
- Do not commit Supabase credentials.
- Use `.env.example` for sample connection strings only.

## Migration Checklist

Before changing schema:
- Is the model needed for the current story?
- Does it affect existing data?
- Does it require human approval?
- Is docs/07_DATABASE_DESIGN.md updated?
- Is migration generated?
