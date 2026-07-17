---
id: EP1-ST004
title: Local Runtime Ports
status: in-progress
type: fullstack
priority: high
phase: phase-1-mvp
allowed_paths:
  - package.json
  - .env.example
  - apps/api/package.json
  - apps/api/.env.example
  - apps/api/src/main.ts
  - apps/api/src/config/**
  - apps/web/package.json
  - apps/web/.env.example
  - apps/web/README.md
  - apps/web/src/entities/article/config/**
  - notes/ai-req/**
  - stories/**
forbidden_paths:
  - apps/api/.env
  - apps/web/.env
  - apps/web/.env.local
  - apps/web/src/app/**
  - packages/**
  - notes/englishpath_product_spec.md
requires_human_approval: false
max_fix_rounds: 2
---

# Story: Local Runtime Ports

## Goal

Standardize local development on frontend port 5173 and backend port 3000, with
matching API, CORS, and SEO-origin defaults, then remove resolved AI requests.

## Requirements

- Next.js development and start scripts listen on port 5173.
- NestJS listens on port 3000 by default and permits the local frontend origin through
  CORS.
- App-specific `.env.example` files document the matching local URLs without modifying
  real environment files.
- Blog canonical fallback and tests use `http://localhost:5173`.
- Invalid API port and web-origin configuration fail clearly.
- Remove only AI request files whose decisions have already been implemented.
- Keep `main` unchanged; integrate only into `dev` after checks and review pass.

## Acceptance Criteria

- FE and BE start commands resolve to ports 5173 and 3000 respectively.
- Local API URL is `http://localhost:3000/api/v1` and allowed web origin is
  `http://localhost:5173`.
- Runtime config tests, project quality gates, and Codex review pass.
- The resolved sandbox and production-origin request files are removed.

## Verification

- node scripts/story-doctor.mjs stories/ready/EP1-ST004-local-runtime-ports.md --ready-only
- pnpm --filter api test
- node --experimental-strip-types --test apps/web/src/entities/article/config/site-origin.test.mjs
- pnpm story:checks
- git diff --check

