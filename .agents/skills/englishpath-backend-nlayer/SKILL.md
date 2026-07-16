---
name: englishpath-backend-nlayer
description: Enforce EnglishPath NestJS modular N-layer architecture for backend stories.
---

# EnglishPath Backend N-layer Skill

Use this skill when working on:
- NestJS modules
- controllers
- services
- repositories
- DTOs
- guards
- policies
- REST API endpoints

## Architecture

Each backend module should follow:

module/
- module.controller.ts
- module.service.ts
- module.repository.ts
- module.module.ts
- dto/
- types/ if needed

## Controller Rules

Controllers:
- handle HTTP request/response only
- must not contain business logic
- use DTOs for input
- use Swagger decorators when public API changes

## Service Rules

Services:
- contain business rules
- orchestrate repositories
- handle validations that require business context
- do not directly expose Prisma models if response shaping is needed

## Repository Rules

Repositories:
- contain Prisma/database access
- do not contain HTTP logic
- do not contain UI/API response formatting

## API Rules

- REST only.
- Use `/api/v1`.
- List endpoints need pagination.
- Protected endpoints need guards.
- Admin endpoints need role checks.
- Never return sensitive fields.

## Review Checklist

Before marking done:
- Is controller thin?
- Is service responsible for business logic?
- Is repository responsible for Prisma?
- Are DTOs validated?
- Is API contract updated?
- Are errors meaningful?
