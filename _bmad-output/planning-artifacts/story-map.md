# EnglishPath Product V2 Story Map

## Status And Supersession

| Story/history              | Status                                                       |
| -------------------------- | ------------------------------------------------------------ |
| `EP0-ST001` to `EP0-ST012` | Foundation history; `EP0-ST011` closed via `EP0-ST012`       |
| `EP0-ST013`                | Completed v1 planning baseline, superseded by v2 `EP0-ST014` |
| `EP0-ST014`                | Product v2 core rebaseline completed                         |
| `EP0-ST015`                | Roadmap-map attempt closed via `EP0-ST015R`                  |
| `EP0-ST015R`               | Product v2 roadmap-map recovery gate                         |
| `EP1-ST002`                | Public blog SEO baseline implemented                         |
| `EP1-ST004`                | Local ports baseline implemented                             |
| `EP1-ST001`, `EP1-ST003`   | Landing work closed via `EP1-ST005`                          |
| `EP1-ST022`, `EP1-ST023`   | Fully superseded by `EP1-ST047` through `EP1-ST049`          |

## Phase 0 Foundation

| Story        | Increment                                                                          | Depends on   |
| ------------ | ---------------------------------------------------------------------------------- | ------------ |
| `EP0-ST015R` | Recover product v2 epic/story maps and ready queue                                 | `EP0-ST014`  |
| `EP0-ST016`  | System/backend/data/API/security architecture and decision baseline                | `EP0-ST015R` |
| `EP0-ST017`  | CI, migration safety, and automated planning semantic checks                       | `EP0-ST016`  |
| `EP0-ST018`  | Browser E2E, accessibility smoke, and local journey harness                        | `EP0-ST017`  |
| `EP0-ST019`  | Supabase auth/JWT/application identity foundation contracts and local test adapter | `EP0-ST018`  |
| `EP0-ST020`  | Shared taxonomy, source/license/review/publish data foundation                     | `EP0-ST019`  |
| `EP0-ST021`  | Google Drive inventory manifest design and credential-free local adapter           | `EP0-ST020`  |
| `EP0-ST022`  | Structured logging, monitoring, analytics, and correlation adapters                | `EP0-ST021`  |
| `EP0-ST023`  | Synchronize loop lifecycle state and prevent concurrent loop execution             | `EP0-ST022`  |

Exit: architecture and automated gates pass; auth/content/Drive/observability
foundations exist without real credentials, paid services, or destructive migrations.

## Phase 1 Learning Core

| Story                      | Increment                                                                                | Depends on                                         |
| -------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `EP1-ST005`                | Recover landing, add goal-oriented guest trial, close contrast/mobile findings           | `EP0-ST022`                                        |
| `EP1-ST006`                | Public IA, sitemap/robots/metadata/internal links and SEO tests                          | `EP1-ST005`                                        |
| `EP1-ST007`                | User/Profile/Role application schema and ownership repositories                          | `EP0-ST019`                                        |
| `EP1-ST008`                | Supabase JWT guards, auth/profile APIs, ownership and RBAC tests                         | `EP1-ST007`                                        |
| `EP1-ST009`                | Register/login/logout/recovery web flows                                                 | `EP1-ST008`                                        |
| `EP1-ST010`                | Onboarding API and persistence                                                           | `EP1-ST008`                                        |
| `EP1-ST011`                | Onboarding UI and operational states                                                     | `EP1-ST010`                                        |
| `EP1-ST012`                | Basic placement question/result API                                                      | `EP1-ST010`                                        |
| `EP1-ST013`                | Placement UI and conservative fallback                                                   | `EP1-ST012`                                        |
| `EP1-ST014`                | General/TOEIC track roadmap templates and 30/60/90/120-day rule engine                   | `EP1-ST012`, `EP0-ST020`                           |
| `EP1-ST015`                | Roadmap API, versioning, and recalculation rules                                         | `EP1-ST014`                                        |
| `EP1-ST016`                | Dashboard and roadmap UI focused on today's work                                         | `EP1-ST015`                                        |
| `EP1-ST017`                | Vocabulary taxonomy/mindmap API                                                          | `EP0-ST020`                                        |
| `EP1-ST040`                | Vocabulary API contract and adapter hardening                                            | `EP1-ST017`                                        |
| `EP1-ST050`                | Governed vocabulary item foundation                                                      | `EP1-ST017`                                        |
| `EP1-ST018`                | Vocabulary SRS/mastery API                                                               | `EP1-ST050`                                        |
| `EP1-ST041`                | Public vocabulary taxonomy explorer UI                                                   | `EP1-ST040`                                        |
| `EP1-ST019`                | Vocabulary mindmap, item, and review UI (closed via verified recovery)                   | `EP1-ST018`                                        |
| `EP1-ST052`                | Vocabulary learner UI review remediation (closed via verified recovery)                  | `EP1-ST018`; closed by `EP1-ST062`                 |
| `EP1-ST053`                | Planning capacity fallback governance                                                    | Capacity evidence: `EP1-ST052`                     |
| `EP1-ST054`                | Vocabulary learner UI recovery (four inherited P1 findings)                              | `EP1-ST018`, `EP1-ST053`                           |
| `EP1-ST055`                | Vocabulary learner UI recovery after runner-cap incident                                 | `EP1-ST018`, `EP1-ST053`; closed by `EP1-ST062`    |
| `EP1-ST056`                | Vocabulary mindmap and paginated item flow (recovery split)                              | `EP1-ST018`, `EP1-ST053`; closed by `EP1-ST062`    |
| `EP1-ST057`                | Vocabulary mindmap selection slice (recovery split)                                      | `EP1-ST018`, `EP1-ST053`; closed by `EP1-ST062`    |
| `EP1-ST020`                | Daily practice and quiz-card session API                                                 | `EP1-ST018`                                        |
| `EP1-ST021`                | Daily practice/quiz-card UI                                                              | `EP1-ST020`                                        |
| `EP1-ST022`                | Daily sentence API and completion model                                                  | `EP1-ST020`                                        |
| `EP1-ST023`                | Daily sentence UI and dashboard integration                                              | `EP1-ST022`                                        |
| `EP1-ST024`                | Basic Error Notebook domain, capture API, and scheduler                                  | `EP1-ST018`, `EP1-ST020`                           |
| `EP1-ST025`                | Error Notebook review UI                                                                 | `EP1-ST024`                                        |
| `EP1-ST026`                | Progress, XP, streak, accuracy, and completion aggregation                               | `EP1-ST020`, `EP1-ST024`                           |
| `EP1-ST027`                | Progress/dashboard aggregation UI                                                        | `EP1-ST026`                                        |
| `EP1-ST028`                | Admin/editor RBAC, privileged audit, and guarded `/admin` shell                          | `EP1-ST008`                                        |
| `EP1-ST029`                | CMS taxonomy/vocabulary/content APIs and lifecycle rules                                 | `EP1-ST028`, `EP0-ST020`                           |
| `EP1-ST030`                | CMS import and admin content UI                                                          | `EP1-ST029`                                        |
| `EP1-ST031` to `EP1-ST035` | Five reviewed vocabulary batches of 100 items                                            | `EP1-ST029`                                        |
| `EP1-ST036`                | Reviewed quiz and daily-sentence seed baseline                                           | `EP1-ST029`                                        |
| `EP1-ST037`                | Expand useful/indexable blog baseline to ten posts                                       | `EP1-ST006`                                        |
| `EP1-ST058`                | Indexable blog baseline recovery after branch collision                                  | `EP1-ST006`; closed via `EP1-ST061`                |
| `EP1-ST059`                | Indexable blog baseline clean retry after generated-artifact cleanup                     | `EP1-ST006`; closed via `EP1-ST061`                |
| `EP1-ST060`                | Indexable blog scoped review retry                                                       | `EP1-ST006`; closed via `EP1-ST061`                |
| `EP1-ST061`                | Indexable blog browser gate recovery on isolated port                                    | `EP1-ST006`; closed after `EP1-ST060`              |
| `EP1-ST062`                | Vocabulary mindmap selection recovery                                                    | `EP1-ST018`, `EP1-ST053`; closed after `EP1-ST057` |
| `EP1-ST038`                | Analytics/monitoring integration and launch dashboards                                   | `EP0-ST022`, `EP1-ST027`; done owner-deferred      |
| `EP1-ST039`                | Browser E2E, accessibility, performance, security, content-rights, and staging readiness | `EP1-ST030` to `EP1-ST038`; done owner-deferred    |
| `EP1-ST042`                | Bundled learner entry: auth UI, onboarding API/UI, and placement API/UI                  | `EP1-ST008`                                        |
| `EP1-ST043`                | Bundled deterministic roadmap API, roadmap UI, and today dashboard                       | `EP1-ST042`                                        |
| `EP1-ST044`                | Bundled daily quiz session, immediate feedback, progress, streak, and error review       | `EP1-ST043`                                        |
| `EP1-ST045`                | Persisted owner progress summary on the learner dashboard                                | `EP1-ST044`                                        |
| `EP1-ST046`                | Private Error Notebook latest-errors API and learner review view                         | `EP1-ST044`                                        |
| `EP1-ST047`                | Bundled governed Daily Sentence API, completion, content, and learner UI                 | `EP1-ST044`                                        |
| `EP1-ST048`                | Recover formatting gate and close the verified Daily Sentence bundle                     | `EP1-ST047`                                        |
| `EP1-ST049`                | Preserve the completed Daily Sentence assignment across mutable content publication      | `EP1-ST047`                                        |
| `EP1-ST051`                | Reconcile Phase 1 planning and loop routing, then prepare the next implementation story  | `EP1-ST049`, `EP1-ST050`                           |

`EP1-ST042` supersedes the former delivery units `EP1-ST009–013`; their requirements are
implemented and reviewed as one vertical slice to reduce loop overhead.

`EP1-ST043` supersedes `EP1-ST014–016`; roadmap rules, persistence, APIs, and learner UI
are delivered and reviewed together as one product increment.

`EP1-ST044` consolidates the first usable delivery of `EP1-ST020–027`; completed
`EP1-ST018`, `EP1-ST045`, and `EP1-ST046` supply the follow-up SRS, persisted progress
summary, and private Error Notebook review increments. `EP1-ST019` remains the
dedicated vocabulary item/review UI increment.

`EP1-ST047` fully supersedes the former delivery units `EP1-ST022` and `EP1-ST023`.
`EP1-ST048` supplies the verification/format closure and `EP1-ST049` closes the only
identified assignment-integrity gap. Together they deliver the specified Daily Sentence
API, completion, governed content, learner UI, and dashboard integration. No separately
specified advanced Daily Sentence requirement remains; `EP1-ST036` now closes the
reviewed quiz and remaining launch-content baseline.

`EP1-ST050` supplies the canonical vocabulary-item prerequisite discovered by
`EP1-ST018`. `EP1-ST019`, `EP1-ST052`, and the recovery chain `EP1-ST054` through
`EP1-ST057` are closed by the verified implementation and browser evidence in
completed `EP1-ST062`; none of their historical WIP commits were resumed. The
external Codex execution-cap decision remains isolated to high-risk `EP1-ST028`.

The Phase 1 rebaseline preserves the old Daily Sentence IDs for traceability: `EP1-ST022`
and `EP1-ST023` are represented as done only through the explicit supersession chain
`EP1-ST047` -> `EP1-ST048` -> `EP1-ST049`, not as independently implemented stories.
`EP1-ST036` is done after the reviewed quiz and daily-sentence seed baseline passed
full content and learner gates; it preserves the existing five-card session and
twenty governed sentence seeds.
The vocabulary route is now `EP1-ST050` -> completed `EP1-ST018` -> completed
`EP1-ST019`/`EP1-ST052`/`EP1-ST062`; `EP1-ST054` through `EP1-ST057` remain Git
history only and were closed through the verified successor without resuming WIP.

`EP1-ST060` reached the final browser gate, but the gate was blocked because external
process PID `8364` served Anh Decor on port `5173`; the historical external
port-conflict request is now resolved in the repository harness. `EP1-ST061` applied
the isolated-port configuration and
has since passed the full public-blog browser evidence, including the keyboard and
not-found journeys. It is now completed after owner approval.

`EP1-ST028` was unblocked after the normal push and clean `dev...origin/dev` state
were evidenced. Its historical high-risk build hit the external Codex execution cap,
so the existing story was completed under supervised execution from clean `dev`;
WIP commit `7a5c909` was not resumed or merged. It is now done after full backend,
frontend, Prisma, browser, story-verification, and independent read-only review
evidence. `EP1-ST029` is now done and is the completed dependency root for the
remaining CMS slice; `EP1-ST030` can start only after its own story artifact is
created from this merged baseline.

`EP1-ST029` through `EP1-ST036` have executable stories and merged implementations.
`EP1-ST038` and `EP1-ST039` are done under the owner-confirmed Option 3 beta exit;
real provider activation and production promotion remain explicitly deferred.

`EP1-ST030` is now done after its CMS authoring implementation passed the
documented full gates. `EP1-ST031` is done after its reviewed content batch passed
the full data and learner gates. `EP1-ST032` is done after its second reviewed
content batch passed the same full data and learner gates. `EP1-ST033` is done after
its third reviewed batch passed the same full data and learner gates. `EP1-ST034`
is done after its fourth batch passed the same gates. `EP1-ST035` is done after the
fifth reviewed vocabulary batch passed the same full data and learner gates.

Exit evidence: guest trial and the authenticated daily loop work end to end; roadmap,
mindmap/SRS, Error Notebook, progress, CMS, and reviewed launch content pass critical
browser and security gates. Local/no-op observability passes repository checks;
real provider dashboards and production activation remain owner-deferred through the
confirmed ST038 decision. The Phase 1 beta exit is complete on the local equivalent
environment without any promotion to `main`.

## Phase 2 TOEIC Listening And Reading

| Story       | Increment                                                                            | Depends on                 |
| ----------- | ------------------------------------------------------------------------------------ | -------------------------- |
| `EP2-ST001` | TOEIC L&R question/content/license schema (`done`)                                   | `EP1-ST039`                |
| `EP2-ST002` | Question bank repository/API and answer protection (`done`)                          | `EP2-ST001`                |
| `EP2-ST003` | Admin import/review/publish workflow (`done`)                                        | `EP2-ST002`                |
| `EP2-ST004` | Parts 1-4 listening practice session API (`done`)                                    | `EP2-ST002`                |
| `EP2-ST005` | Parts 5-7 reading practice session API (`done`)                                      | `EP2-ST002`, `EP2-ST003`   |
| `EP2-ST006` | Part/topic/difficulty practice UI (`done`)                                           | `EP2-ST004`, `EP2-ST005`   |
| `EP2-ST007` | Mini/half test assembly and server-timed session API (`done`)                        | `EP2-ST004`, `EP2-ST005`   |
| `EP2-ST008` | Timed mini/half test UI and interruption handling (`done`)                           | `EP2-ST007`                |
| `EP2-ST009` | Scoring, Part/skill weakness, and time analysis (`done`)                             | `EP2-ST007`, `EP2-ST008`   |
| `EP2-ST010` | TOEIC Error Notebook and remediation integration (`done`; owner-approved Option 1)   | `EP2-ST009`, `EP1-ST024`   |
| `EP2-ST011` | TOEIC vocabulary/grammar remediation packs (`done`)                                  | `EP2-ST010`                |
| `EP2-ST012` | TOEIC L&R security, browser, accessibility, and content-license exit review (`done`) | `EP2-ST003` to `EP2-ST011` |

Exit: approved Parts 1-7 and timed mini/half tests finalize safely, protect answers,
produce accurate analysis, and route weaknesses into remediation.

## Phase 3 Licensed Content Library And Listening

Execution queue: `EP3-ST001` through `EP3-ST012`, `EP4-ST001`, and `EP4-ST010`
are complete and merged to `dev`; `EP4-ST002` is blocked by its AI request and
`EP4-ST005` and `EP4-ST007` are blocked by their AI requests; `EP4-ST011` is
the next independent dependency-ready story. Later Phase 4-5 stories remain
backlog until their declared dependencies pass.

| Story       | Increment                                                              | Depends on                       |
| ----------- | ---------------------------------------------------------------------- | -------------------------------- |
| `EP3-ST001` | Library/storage/content version model and Drive manifest adapter       | `EP2-ST012`                      |
| `EP3-ST002` | Drive inventory scan, metadata, checksum, and change detection         | `EP3-ST001` (ready)              |
| `EP3-ST003` | License/review/import/publish workflow                                 | `EP3-ST002`, `EP1-ST028` (ready) |
| `EP3-ST004` | Admin library inventory/review UI                                      | `EP3-ST003` (done)               |
| `EP3-ST005` | Learner catalog, search, filters, and access policy                    | `EP3-ST003` (done)               |
| `EP3-ST006` | Controlled media/transcript API                                        | `EP3-ST005` (done)               |
| `EP3-ST007` | Player, resume, bookmark, and personal note UI                         | `EP3-ST006` (done)               |
| `EP3-ST008` | Listening drills and persisted outcomes                                | `EP3-ST006` (done)               |
| `EP3-ST009` | Shadowing workflow and progress                                        | `EP3-ST008`                      |
| `EP3-ST010` | Roadmap/vocabulary/quiz/content linking                                | `EP3-ST007`, `EP3-ST008`         |
| `EP3-ST011` | Reviewed licensed content batch and import validation                  | `EP3-ST004`                      |
| `EP3-ST012` | Storage security, license, browser, performance, and phase exit review | `EP3-ST005` to `EP3-ST011`       |

Exit: Drive is only a governed source; reviewed assets are safely imported, searched,
resumed, practiced, linked, and audited through application data/storage.

## Phase 4 TOEIC Speaking, Writing, And Four Skills

| Story       | Increment                                                              | Depends on                 |
| ----------- | ---------------------------------------------------------------------- | -------------------------- |
| `EP4-ST001` | Speaking/Writing task and rubric models                                | `EP3-ST012`                |
| `EP4-ST002` | TOEIC Speaking task/submission API                                     | `EP4-ST001`                |
| `EP4-ST003` | Recording storage and controlled playback                              | `EP4-ST002`, `EP3-ST006`   |
| `EP4-ST004` | TOEIC Speaking task/recording UI                                       | `EP4-ST003`                |
| `EP4-ST005` | TOEIC Writing task/submission API                                      | `EP4-ST001`                |
| `EP4-ST006` | TOEIC Writing practice UI                                              | `EP4-ST005`                |
| `EP4-ST007` | Provider-neutral advisory feedback gateway, quota, and cost log        | `EP0-ST022`                |
| `EP4-ST008` | Speaking rubric feedback worker and fallback                           | `EP4-ST003`, `EP4-ST007`   |
| `EP4-ST009` | Writing rubric feedback worker and fallback                            | `EP4-ST005`, `EP4-ST007`   |
| `EP4-ST010` | TOEIC Four Skills roadmap balance rules                                | `EP1-ST015`, `EP4-ST001`   |
| `EP4-ST011` | Four Skills progress dashboard                                         | `EP4-ST010`                |
| `EP4-ST012` | AI evaluation, score separation, abuse, browser, and phase exit review | `EP4-ST004` to `EP4-ST011` |

Exit: speaking/writing evidence, rubrics, advisory feedback, and balanced Four Skills
roadmaps work without AI authoring official scores.

## Phase 5 Full Test, Adaptive AI, And Community

| Story       | Increment                                                                    | Depends on                            |
| ----------- | ---------------------------------------------------------------------------- | ------------------------------------- |
| `EP5-ST001` | Full mock test assembly and versioning                                       | `EP4-ST012`                           |
| `EP5-ST002` | Full exam session, server timer, finalization, and idempotency               | `EP5-ST001`                           |
| `EP5-ST003` | Strict exam UI and interruption handling                                     | `EP5-ST002`                           |
| `EP5-ST004` | Full scoring, integrity events, and weakness analysis                        | `EP5-ST002`                           |
| `EP5-ST005` | Advanced cross-skill Error Notebook                                          | `EP5-ST004`, `EP3-ST008`, `EP4-ST009` |
| `EP5-ST006` | Adaptive roadmap evidence/rules and versioning                               | `EP5-ST005`, `EP1-ST015`              |
| `EP5-ST007` | AI explanation service and grounded fallback                                 | `EP4-ST007`                           |
| `EP5-ST008` | AI Speaking room                                                             | `EP4-ST008`                           |
| `EP5-ST009` | AI Writing Coach                                                             | `EP4-ST009`                           |
| `EP5-ST010` | Community content/report/moderation API                                      | `EP1-ST028`                           |
| `EP5-ST011` | Community sharing/moderation UI                                              | `EP5-ST010`                           |
| `EP5-ST012` | AI quota/cost/abuse operations dashboard                                     | `EP5-ST007` to `EP5-ST009`            |
| `EP5-ST013` | Exam/AI/community security, evaluation, load, browser, and phase exit review | `EP5-ST003` to `EP5-ST012`            |

Exit: secure full tests, adaptive review, AI learning, and moderated sharing pass
integrity, evaluation, abuse, observability, accessibility, and performance gates.

## Phase 6 Mobile And Premium Expansion

| Story       | Increment                                                                        | Depends on                 |
| ----------- | -------------------------------------------------------------------------------- | -------------------------- |
| `EP6-ST001` | Expo foundation and shared contracts                                             | `EP5-ST013`                |
| `EP6-ST002` | Mobile auth/recovery                                                             | `EP6-ST001`                |
| `EP6-ST003` | Mobile dashboard/roadmap                                                         | `EP6-ST002`                |
| `EP6-ST004` | Mobile vocabulary/daily/Error Notebook                                           | `EP6-ST003`                |
| `EP6-ST005` | Mobile TOEIC/listening                                                           | `EP6-ST004`                |
| `EP6-ST006` | Mobile speaking/writing submissions                                              | `EP6-ST005`                |
| `EP6-ST007` | Push reminders and preference policy                                             | `EP6-ST002`                |
| `EP6-ST008` | Offline vocabulary/listening sync and conflict policy                            | `EP6-ST004`, `EP6-ST005`   |
| `EP6-ST009` | Entitlement/free-quota domain                                                    | `EP5-ST012`                |
| `EP6-ST010` | Stripe adapter and idempotent webhooks                                           | `EP6-ST009`                |
| `EP6-ST011` | Subscription/customer-portal UI                                                  | `EP6-ST010`                |
| `EP6-ST012` | Advanced learning/product analytics                                              | `EP6-ST009`                |
| `EP6-ST013` | Backup/restore, 300-500 concurrency load test, SLO, and disaster recovery        | `EP6-ST012`                |
| `EP6-ST014` | Mobile E2E, offline/billing security, release readiness, and owner approval pack | `EP6-ST006` to `EP6-ST013` |

Exit: mobile reuses API/RBAC, offline sync is deterministic, free-first billing is
idempotent, and owner-approved resilience/capacity evidence exists.

## Requirement And Flow Assignment

| Coverage               | Primary stories                                                                    |
| ---------------------- | ---------------------------------------------------------------------------------- |
| `FR-001` to `FR-011`   | `EP1-ST005` to `EP1-ST030`                                                         |
| `FR-012` to `FR-015`   | `EP2-ST001` to `EP2-ST011`                                                         |
| `FR-016` to `FR-019`   | `EP3-ST001` to `EP3-ST011`                                                         |
| `FR-020` to `FR-022`   | `EP4-ST001` to `EP4-ST011`                                                         |
| `FR-023` to `FR-026`   | `EP5-ST001` to `EP5-ST012`                                                         |
| `FR-027` to `FR-029`   | `EP6-ST001` to `EP6-ST013`, with admin foundation in `EP1-ST028`                   |
| `NFR-001` to `NFR-017` | Foundation `EP0-ST016` to `EP0-ST022` plus each phase exit-review story            |
| `UF-001` to `UF-005`   | `EP1-ST005` to `EP1-ST023`                                                         |
| `UF-006`               | `EP1-ST024`, expanded in `EP2-ST010` and `EP5-ST005`                               |
| `UF-007`               | `EP1-ST028` to `EP1-ST030`, `EP2-ST003`, `EP3-ST001` to `EP3-ST004`                |
| `UF-008`               | `EP2-ST004` to `EP2-ST012`                                                         |
| `UF-009`               | `EP1-ST014` to `EP1-ST016`, expanded in `EP5-ST006`                                |
| `UF-010`               | `EP3-ST005` to `EP3-ST012`                                                         |
| `UF-011`               | `EP4-ST001` to `EP4-ST012`                                                         |
| `UF-012`               | `EP5-ST001` to `EP5-ST004`, verified in `EP5-ST013`                                |
| `UF-013`               | `EP4-ST007` to `EP4-ST012`, `EP5-ST007` to `EP5-ST013`, `EP6-ST009` to `EP6-ST011` |
