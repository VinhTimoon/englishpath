# EnglishPath Epics Baseline

## `E00` Phase 0B Foundation Recovery

- Goal: Establish concise planning, architecture, CI safety, and E2E foundations for product delivery.
- Story range: `EP0-ST013` to `EP0-ST016`.
- Covers: `NFR-001`, `NFR-002`, `NFR-010`, `NFR-011`.
- Depends on: completed foundation governance stories and the `EP1-ST004` runtime baseline.
- Acceptance outcome: planning artifacts, API pagination policy, architectural baseline,
  local port defaults, CI safety, and browser E2E readiness exist without touching
  production controls.

## `E01` Public Acquisition And SEO

- Goal: Recover the public landing journey and technical SEO fundamentals.
- Story range: `EP1-ST005` to `EP1-ST006`.
- Covers: `FR-001`, `NFR-008`.
- Depends on: `E00`.
- Acceptance outcome: guests can discover the product, browse useful public pages, and reach signup calls to action on indexable pages.

## `E02` Identity And Recovery

- Goal: Create secure learner authentication and account recovery.
- Story range: `EP1-ST007` to `EP1-ST009`.
- Covers: `FR-002`, `NFR-004`.
- Depends on: `E01`.
- Acceptance outcome: learners can register, sign in, recover access, and reach authenticated product surfaces.

## `E03` Onboarding And Placement

- Goal: Capture learner context and assign a credible starting level.
- Story range: `EP1-ST010` to `EP1-ST013`.
- Covers: `FR-003`, `FR-004`.
- Depends on: `E02`.
- Acceptance outcome: onboarding and placement produce persisted inputs for roadmap generation.

## `E04` Personalized Roadmaps

- Goal: Generate bounded learner plans and expose them clearly.
- Story range: `EP1-ST014` to `EP1-ST016`.
- Covers: `FR-005`, `FR-006`.
- Depends on: `E03`.
- Acceptance outcome: every learner receives a 30/60/90/120-day plan with visible tasks and next actions.

## `E05` Daily Learning Core

- Goal: Deliver the repeatable daily-learning loop for vocabulary, quizzes, and daily sentences.
- Story range: `EP1-ST017` to `EP1-ST023`.
- Covers: `FR-007`, `FR-008`, `FR-009`.
- Depends on: `E04`.
- Acceptance outcome: learners can study daily content, submit work, and persist review-relevant outcomes.

## `E06` Progress And CMS Operations

- Goal: Track learner progress and enable safe admin content operations.
- Story range: `EP1-ST024` to `EP1-ST029`.
- Covers: `FR-010`, `FR-011`, `FR-012`, `NFR-003`, `NFR-004`.
- Depends on: `E05`.
- Acceptance outcome: learners see progress states while admins manage content and access through guarded tools.

## `E07` Launch Content And Readiness

- Goal: Publish enough useful content and operational controls to launch the web MVP.
- Story range: `EP1-ST030` to `EP1-ST038`.
- Covers: `FR-013`, `NFR-007`, `NFR-008`, `NFR-009`.
- Depends on: `E06`.
- Acceptance outcome: baseline vocabulary, quizzes, daily sentences, SEO posts, analytics, monitoring, and staging readiness are in place.

## `E08` Listening And Review

- Goal: Extend the learner loop with licensed audio practice and structured review.
- Story range: `EP2-ST001` to `EP2-ST010`.
- Covers: `FR-014`, `FR-015`.
- Depends on: `E07`.
- Acceptance outcome: learners can practice listening, shadowing, and mistake review with transcript-aware content.

## `E09` TOEIC Practice And Exam Security

- Goal: Support TOEIC practice depth without compromising answer security.
- Story range: `EP3-ST001` to `EP3-ST012`.
- Covers: `FR-016`, `NFR-005`.
- Depends on: `E08`.
- Acceptance outcome: admins manage the question bank and learners complete secure TOEIC sessions with delayed answer reveal.

## `E10` AI Learning Services

- Goal: Add controlled AI assistance for writing, speaking, and explanations.
- Story range: `EP4-ST001` to `EP4-ST012`.
- Covers: `FR-017`, `NFR-006`.
- Depends on: `E09`.
- Acceptance outcome: AI requests pass through a backend gateway with quota, cost, and abuse controls.

## `E11` Mobile Experience

- Goal: Bring the core learner loop to mobile after the web product proves out.
- Story range: `EP5-ST001` to `EP5-ST008`.
- Covers: `FR-018`, `NFR-012`.
- Depends on: `E10`.
- Acceptance outcome: learners can authenticate, study daily content, and use key retention features on mobile.

## `E12` Monetization And Reliability

- Goal: Introduce premium entitlements and stronger resilience after MVP traction.
- Story range: Phase 6 backlog themes not yet split into numbered stories.
- Covers: `FR-019`, `NFR-009`, `NFR-011`.
- Depends on: `E11`.
- Acceptance outcome: subscriptions, backup and restore, disaster recovery, and load validation mature without weakening free-first access.
