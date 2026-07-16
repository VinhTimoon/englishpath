---
id: EP0-ST002
title: Health Check API
status: done
type: backend
priority: high
phase: phase-0-foundation
allowed_paths:
  - apps/api/src/modules/health/**
  - apps/api/src/app.module.ts
  - docs/08_API_CONTRACT.md
  - docs/06_BACKEND_ARCHITECTURE.md
forbidden_paths:
  - apps/api/prisma/schema.prisma
  - apps/api/src/generated/**
  - apps/api/.env
  - apps/web/**
  - packages/**
requires_human_approval: false
max_fix_rounds: 2
---

# Story: Health Check API

## Goal

Create a health check API endpoint for EnglishPath.

## Business Rules

- The endpoint confirms the API is running.
- The endpoint checks database connectivity through PrismaService.
- It must not expose secrets or database credentials.

## BE Requirements

- Create a Health module under apps/api/src/modules/health.
- Add GET /api/v1/health.
- Return:
  - status
  - api
  - database
  - timestamp
- Register the module in AppModule.
- Use NestJS N-layer style where reasonable.

## API Contract

GET /api/v1/health

Example response:

{
  "status": "ok",
  "api": "running",
  "database": "connected",
  "timestamp": "2026-07-16T00:00:00.000Z"
}

## Acceptance Criteria

- GET /api/v1/health returns 200.
- Response includes status, api, database, timestamp.
- Database check uses PrismaService.
- No frontend files are changed.
- No Prisma schema changes are made.

## Verification

- pnpm --filter api build
- pnpm --filter api test
- pnpm --filter api start:dev

## Completion Report

- API lint passed.
- API build passed.
- API unit tests passed: 4 suites, 5 tests.
- Approved into the `dev` baseline.
