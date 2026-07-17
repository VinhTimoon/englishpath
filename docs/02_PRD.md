# EnglishPath Product Requirements Baseline

## Scope Statement

This PRD defines concise, testable requirements for Phase 0B through Phase 6. Only
foundation governance, blog SEO baseline, and local runtime configuration are already
implemented. Landing recovery is the next delivery target.

## Traceability Model

- Functional requirements use `FR-###`.
- Non-functional requirements use `NFR-###`.
- User flows use `UF-###` from [docs/03_USER_FLOWS.md](03_USER_FLOWS.md).
- Epic and story-range coverage is projected in `_bmad-output/planning-artifacts`.

## Functional Requirements

| ID     | Requirement                                                                                                                                                              | Phase and story range                                     | Flow refs                    | Testable outcome                                                                              |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------- |
| FR-001 | The public web experience must let guests discover EnglishPath value through a landing page, blog/news pages, and roadmap-oriented calls to action.                      | Phase 1A `EP1-ST005` to `EP1-ST006`                       | `UF-001`                     | Guests can browse indexable public pages and reach signup prompts without authentication.     |
| FR-002 | The system must support learner registration, sign-in, sign-out, password recovery, and authenticated profile retrieval through Supabase Auth-backed APIs and web flows. | Phase 1B `EP1-ST007` to `EP1-ST009`                       | `UF-002`                     | A learner can create or recover an account and reach an authenticated session.                |
| FR-003 | The product must capture onboarding inputs for goal, current level, time budget, deadline, and preferred skills.                                                         | Phase 1C `EP1-ST010` to `EP1-ST011`                       | `UF-003`                     | An authenticated learner can submit onboarding data and persist it successfully.              |
| FR-004 | The product must provide a placement intake that determines a starting level and recommended roadmap template.                                                           | Phase 1C `EP1-ST012` to `EP1-ST013`                       | `UF-003`                     | Placement results store a level recommendation that downstream roadmap generation can use.    |
| FR-005 | The roadmap engine must generate learner plans capped at 30, 60, 90, or 120 days based on onboarding and placement inputs.                                               | Phase 1D `EP1-ST014` to `EP1-ST015`                       | `UF-003`                     | Each learner can receive a bounded roadmap with day-level tasks.                              |
| FR-006 | The learner dashboard must display the current roadmap, due tasks, and current progress state.                                                                           | Phase 1D `EP1-ST016`, Phase 1F `EP1-ST024` to `EP1-ST025` | `UF-003`, `UF-004`           | A learner can open a dashboard and see current tasks and progress.                            |
| FR-007 | The vocabulary domain must store level, topic, source, and license metadata and support daily delivery plus review-due retrieval.                                        | Phase 1E `EP1-ST017` to `EP1-ST019`                       | `UF-004`                     | The system can serve daily and due vocabulary items with traceable metadata.                  |
| FR-008 | The quiz domain must create practice sessions, accept per-question answers, score submissions, and update learner progress.                                              | Phase 1E `EP1-ST020` to `EP1-ST021`                       | `UF-005`                     | A learner can complete a quiz session and receive a scored result.                            |
| FR-009 | The daily-sentence domain must deliver one or more short practical sentences for daily use and record completion.                                                        | Phase 1E `EP1-ST022` to `EP1-ST023`                       | `UF-004`                     | A learner can consume daily sentences and mark them complete.                                 |
| FR-010 | The progress system must track XP, streaks, and completion summaries across daily learning activities.                                                                   | Phase 1F `EP1-ST024` to `EP1-ST025`                       | `UF-004`, `UF-005`           | Completing learning activities updates progress records and learner-visible summaries.        |
| FR-011 | Admin users must manage roles, audit-sensitive actions, and content operations through guarded admin capabilities.                                                       | Phase 1F `EP1-ST026` to `EP1-ST029`                       | `UF-007`                     | Admin-only actions are available only to authorized users and produce audit evidence.         |
| FR-012 | The MVP CMS must support blog posts, vocabulary, quizzes, and import workflows from a web interface.                                                                     | Phase 1F `EP1-ST027` to `EP1-ST029`                       | `UF-007`                     | Editors can create or import content without direct database access.                          |
| FR-013 | Launch preparation must publish baseline vocabulary, quiz, daily-sentence, and blog content and attach analytics and monitoring adapters.                                | Phase 1G `EP1-ST030` to `EP1-ST038`                       | `UF-001`, `UF-007`           | MVP launch content exists and production-observability hooks are configured.                  |
| FR-014 | Listening practice must support licensed audio upload, transcript-aware activities, and shadowing or dictation reviews.                                                  | Phase 2 `EP2-ST001` to `EP2-ST006`                        | `UF-004`                     | Learners can complete listening sessions backed by licensed audio metadata.                   |
| FR-015 | The Error Notebook must capture mistakes from learning activities and drive scheduled review recommendations.                                                            | Phase 2 `EP2-ST007` to `EP2-ST010`                        | `UF-006`                     | Incorrect answers reappear as learner-specific review items.                                  |
| FR-016 | TOEIC practice must support question-bank administration, timed practice or test sessions, secure submission, and score analysis.                                        | Phase 3 `EP3-ST001` to `EP3-ST012`                        | `UF-008`                     | Learners can finish TOEIC sessions with server-validated timing and delayed answer reveal.    |
| FR-017 | The AI Gateway must mediate writing, speaking, explanation, and retrieval tasks while enforcing quota, cost, and provider abstraction.                                   | Phase 4 `EP4-ST001` to `EP4-ST012`                        | `UF-009`                     | AI requests are routed through backend controls with tracked usage and policy outcomes.       |
| FR-018 | Mobile clients must reuse EnglishPath APIs for auth, dashboard, daily learning, speaking, push reminders, and offline learning.                                          | Phase 5 `EP5-ST001` to `EP5-ST008`                        | `UF-002`, `UF-004`, `UF-009` | Mobile delivery can consume the same product capabilities without a separate business model.  |
| FR-019 | Post-MVP monetization must add entitlements, Stripe-backed subscriptions, operational backup, disaster recovery, and proven load tolerance.                              | Phase 6 backlog themes                                    | `UF-009`                     | Premium access and resilience controls can be introduced without degrading free-first access. |

## Non-Functional Requirements

| ID      | Requirement                                                                                                                                   | Phase anchor         | Testable outcome                                               |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | -------------------------------------------------------------- |
| NFR-001 | Planning artifacts must remain concise enough for story-scoped loading and must not duplicate the full product specification.                 | Phase 0B             | Planning docs stay brief, scoped, and traceable.               |
| NFR-002 | Every list endpoint in application APIs must support pagination before launch.                                                                | Phase 1 onward       | Large collections do not require unbounded fetches.            |
| NFR-003 | Controllers remain thin, services own business rules, and repositories own persistence access.                                                | Phase 1 onward       | Architecture reviews show no business logic in controllers.    |
| NFR-004 | All protected endpoints must enforce backend authorization, and admin endpoints require admin role checks.                                    | Phase 1 onward       | Unauthorized requests are rejected server-side.                |
| NFR-005 | Correct answers for secure quizzes and TOEIC tests must not be exposed before validated submission.                                           | Phase 3              | Client payloads never contain answer keys before submit.       |
| NFR-006 | AI integrations must run only through the backend AI Gateway and must record model, prompt version, quota usage, and estimated cost.          | Phase 4              | Every AI call has backend-owned audit metadata.                |
| NFR-007 | Licensed and self-authored content must preserve source and license metadata for auditability.                                                | Phase 1E onward      | Content records carry source and license fields.               |
| NFR-008 | Public pages must support technical SEO foundations including crawlability, metadata, and stable canonical routing.                           | Phase 1A and 1G      | Public pages can be indexed and attributed correctly.          |
| NFR-009 | The platform must be designed to scale to roughly 300 to 500 concurrent users with queues, caching, and non-blocking heavy jobs where needed. | Phase 1G and Phase 6 | Load-sensitive operations have an explicit scaling path.       |
| NFR-010 | Local development defaults remain FE `5173` and BE `3000` until explicitly changed by a later approved story.                                 | Current baseline     | Local runtime commands resolve to the approved ports.          |
| NFR-011 | Production promotion to `main`, destructive migrations, and paid-service activation remain human-controlled.                                  | Phase 0B onward      | Automation never self-promotes or self-approves those actions. |
| NFR-012 | Learning surfaces must preserve clear loading, empty, error, and success states on web and mobile clients.                                    | Phase 1 onward       | Feature UIs define all required operational states.            |

## MVP Capability Coverage

| MVP capability                                | Requirement coverage                                 |
| --------------------------------------------- | ---------------------------------------------------- |
| Public acquisition and SEO                    | `FR-001`, `FR-013`, `NFR-008`                        |
| Identity and recovery                         | `FR-002`, `NFR-004`                                  |
| Onboarding and placement                      | `FR-003` to `FR-005`                                 |
| Personalized roadmap and dashboard            | `FR-005`, `FR-006`, `FR-010`                         |
| Daily vocabulary, quiz, and sentence practice | `FR-007` to `FR-010`                                 |
| Admin CMS and content operations              | `FR-011`, `FR-012`, `FR-013`, `NFR-007`              |
| Launch operations and safety                  | `FR-013`, `NFR-001`, `NFR-009`, `NFR-010`, `NFR-011` |

## Implementation Boundary Reminder

- Completed today: governance foundation, blog SEO foundation, local runtime ports.
- Next planned product delivery: public landing recovery in `EP1-ST005`.
- All other learner, admin, TOEIC, AI, mobile, and monetization requirements remain planned.
