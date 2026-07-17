# EnglishPath Product Scope Baseline

## Purpose

EnglishPath is a free-first English learning platform for Vietnamese learners. This
baseline defines the product scope that later stories can implement without treating
planned modules as already delivered.

## Current Implementation Status

| Area                                                                     | Status                | Evidence                                                                                       |
| ------------------------------------------------------------------------ | --------------------- | ---------------------------------------------------------------------------------------------- |
| Foundation governance and local workflow                                 | Implemented           | `EP0-ST001` to `EP0-ST010` and `EP0-ST012` done; blocked `EP0-ST011` superseded by `EP0-ST012` |
| Public blog SEO foundation                                               | Implemented           | `EP1-ST002` done                                                                               |
| Local runtime port baseline                                              | Implemented           | `EP1-ST004` done                                                                               |
| Public landing recovery                                                  | Next planned delivery | `EP1-ST005`                                                                                    |
| Identity, onboarding, roadmap, learning, TOEIC, AI, mobile, monetization | Planned only          | No completed delivery stories yet                                                              |

## Product Outcome

EnglishPath helps learners assess their current level, follow a goal-based roadmap of
up to 120 days, practice daily, and measure progress across vocabulary, quizzes,
listening, TOEIC, and later AI-assisted speaking and writing.

## Actors

| Actor           | Primary goal                                                                                   |
| --------------- | ---------------------------------------------------------------------------------------------- |
| Guest           | Discover value through landing pages, blog content, and limited demos                          |
| Free learner    | Study daily with onboarding, roadmap, vocabulary, quizzes, listening, and limited AI quotas    |
| Premium learner | Unlock higher AI quotas, deeper analytics, more test volume, and later mobile/offline benefits |
| Content editor  | Create and manage learning content, blog posts, audio, and metadata                            |
| Admin           | Govern users, roles, content, AI quotas, audit trails, and operational health                  |
| Project owner   | Controls production promotion, destructive migrations, and paid-service approval               |

## Free-First Principles

- Free learners must receive useful daily learning value, not a hollow paywall.
- Premium expands capacity and personalization; it must not hide core beginner access.
- Blog and SEO content must attract learners with genuinely useful educational content.
- AI usage must be quota-controlled so free access remains sustainable.

## MVP Boundary

The MVP spans Phase 1A through Phase 1G and must include:

1. Public landing recovery and technical SEO.
2. Supabase-based authentication, recovery, and learner profile access.
3. Onboarding plus placement intake that determines initial level and goal.
4. Template-driven 30/60/90/120-day roadmap generation and learner dashboard.
5. Daily vocabulary, quiz, and daily sentence practice with progress persistence.
6. Progress, XP, streaks, and a basic learner dashboard.
7. Admin RBAC, audit trail basics, and a web-based CMS for vocab, quiz, blog, and import.
8. Seed content for vocabulary, quizzes, daily sentences, and at least ten SEO posts.
9. Analytics, monitoring adapters, staging readiness, and launch checks.

## Post-MVP Boundary

Post-MVP expansion covers:

- Phase 2: listening practice, dictation, shadowing, Error Notebook, and cross-skill SRS.
- Phase 3: TOEIC question bank, practice, mini tests, full tests, analysis, and secure exam mode.
- Phase 4: AI Gateway, quota and cost controls, writing feedback, RAG, speaking, STT/TTS, and abuse protection.
- Phase 5: Expo-based mobile delivery with auth, dashboard, daily learning, speaking, push, and offline support.
- Phase 6: monetization, entitlement, Stripe, backup and restore, load testing for 300 to 500 concurrent users, and disaster recovery.

## Explicit Out Of Scope For Initial MVP

- Native mobile app on day one.
- Professional remote proctoring with camera or screen recording.
- Unlimited human mentor review.
- Marketplace-style course sales.
- Republishing copyrighted bought-course media or unlicensed TOEIC material.

## Copyright And Content Rules

- EnglishPath may reference purchased courses only to infer taxonomy, sequencing, and exercise patterns.
- Public content must use self-authored, licensed, or otherwise permitted text, audio, and images.
- Every question, audio file, and post must retain source and license metadata.
- TOEIC content must be self-authored in the TOEIC format or explicitly licensed.
- Correct answers for secure tests must remain server-side until submission is validated.

## Assumptions

- Supabase Auth is the authentication provider.
- Local-first adapters remain acceptable until paid production services are approved.
- AI-assisted draft content always requires human review before publishing.
- The MVP CMS is web-based, not mobile-admin.
- PostgreSQL with pgvector is preferred before any external vector or graph database.
- Local development targets FE port `5173` and BE port `3000`.

## Launch Criteria

The MVP is launch-ready only when all of the following are true:

| Metric            | Minimum launch threshold                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------ |
| Roadmap coverage  | At least one complete learner roadmap template is active                                                     |
| Learning content  | Five vocabulary batches, quiz seed content, and daily sentence seed content are published                    |
| SEO content       | At least ten useful blog posts are published and indexable                                                   |
| Core learner loop | Signup, onboarding, placement, roadmap, daily practice, and progress tracking work end to end                |
| Operations        | Analytics, monitoring, staging checks, and rollback-ready deployment path exist                              |
| Security          | Auth guards, admin RBAC, audit trail basics, secret protection, and server-side exam validation are in place |

## Roadmap Alignment

| Phase          | Outcome                                             |
| -------------- | --------------------------------------------------- |
| Phase 0B       | Planning, architecture, CI safety, and E2E recovery |
| Phase 1A to 1G | Public MVP launch scope                             |
| Phase 2        | Listening and review loop                           |
| Phase 3        | TOEIC practice and secure testing                   |
| Phase 4        | AI-assisted learning                                |
| Phase 5        | Mobile experience                                   |
| Phase 6        | Post-MVP monetization and reliability               |
