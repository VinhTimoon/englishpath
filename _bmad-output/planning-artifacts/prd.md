# EnglishPath BMAD PRD Projection

## Objective

Create a concise planning baseline that converts the approved product specification and
roadmap into story-ready scope, requirements, flows, epics, and dependencies.

## Product Baseline

- Product: free-first English learning platform for Vietnamese learners.
- Implemented baseline: governance foundation, blog SEO foundation, local runtime ports.
- Next delivery: public landing recovery in `EP1-ST005`.
- Planned domains: identity, onboarding, roadmap, daily learning, CMS, listening, TOEIC, AI, mobile, and monetization.

## MVP Scope

1. Public acquisition and SEO.
2. Supabase-backed auth and recovery.
3. Onboarding plus placement.
4. 30/60/90/120-day roadmap generation.
5. Daily vocabulary, quizzes, and daily sentences.
6. Progress tracking and dashboard.
7. Admin RBAC and web CMS.
8. Seed content, analytics, monitoring, and staging readiness.

## Key Constraints

- Do not present planned modules as already implemented.
- Keep artifacts concise and story-loadable.
- Production promotion, destructive migrations, and paid-service activation stay human-controlled.
- AI must route through a backend gateway.
- Licensed content must preserve source and license metadata.

## Assumptions

- Supabase Auth.
- Local-first adapters until approved replacements exist.
- Web-based MVP CMS.
- Human-reviewed AI-assisted draft content.
- PostgreSQL plus pgvector before external vector or graph databases.
- FE port `5173`, BE port `3000`.

## Requirement References

- Functional: `FR-001` to `FR-019` in `docs/02_PRD.md`.
- Non-functional: `NFR-001` to `NFR-012` in `docs/02_PRD.md`.
- Critical flows: `UF-001` to `UF-009` in `docs/03_USER_FLOWS.md`.

## Success Measures

- All seven planning artifacts are non-empty and consistent.
- Every MVP capability maps to an epic and story range.
- Identifiers remain unique and traceable.
- Landing recovery remains the next product build step.
