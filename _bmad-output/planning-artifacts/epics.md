# EnglishPath Product V2 Epics

## `E00` Phase 0 Foundation

- Goal: establish safe, observable, credential-free foundations for product delivery.
- Stories: `EP0-ST014` v2 core, `EP0-ST015R` recovered maps, `EP0-ST016`
  architecture, `EP0-ST017` CI/migration/semantic safety, `EP0-ST018` browser E2E,
  `EP0-ST019` auth identity, `EP0-ST020` taxonomy/rights, `EP0-ST021` Drive
  inventory, and `EP0-ST022` observability adapters. The blocked `EP0-ST015` map
  attempt remains historical evidence and is superseded by `EP0-ST015R`.
- Dependencies: completed governance, health, blog SEO, and local-port baselines.
- Coverage: foundation portions of `FR-002`, `FR-006`, `FR-010`, `FR-017`, `FR-029`;
  `NFR-001` to `NFR-004`, `NFR-006`, `NFR-007`, `NFR-010` to `NFR-017`;
  `UF-002`, `UF-007`.
- Exit gate: v2 planning/architecture and automated gates agree; auth/content/Drive/
  observability foundations pass without production credentials, paid services, or
  destructive migrations.

## `E01` Phase 1 Learning Core

- Goal: ship the free-first guest and daily learner loop.
- Stories: `EP1-ST005` to `EP1-ST039`, covering landing/guest trial, technical SEO,
  auth, onboarding/placement, roadmap/dashboard, vocabulary mindmap/SRS, daily
  practice/sentences, basic Error Notebook, progress, admin/CMS, reviewed content,
  observability, and staging readiness.
- Dependencies: `E00` through its exit `EP0-ST022`; historical
  `EP1-ST001`/`EP1-ST003` are superseded by `EP1-ST005`, while
  `EP1-ST002`/`EP1-ST004` remain implemented baselines.
- Coverage: `FR-001` to `FR-011`, `FR-029`; `UF-001` to `UF-007`, `UF-009`; relevant
  web, security, content, architecture, and testing NFRs.
- Exit gate: guest trial and authenticated learning work end to end with reviewed
  content, Error Notebook, progress, accessibility, observability, and browser tests.

## `E02` Phase 2 TOEIC Listening And Reading

- Goal: deliver governed TOEIC Parts 1-7 and actionable remediation.
- Stories: `EP2-ST001` to `EP2-ST012`, covering question-bank governance, Parts 1-7,
  practice selection, mini/half tests, server timing, scoring/weakness analysis,
  Error Notebook, remediation packs, and exit review.
- Dependencies: `E01` content, learner, progress, and CMS foundations through its
  exit `EP1-ST039`.
- Coverage: `FR-009`, `FR-011` to `FR-015`; `UF-006` to `UF-008`; answer-security,
  rights, capacity, and regression-test NFRs.
- Exit gate: approved timed attempts protect answers, finalize exactly once, report
  accurate weaknesses, and schedule remediation.

## `E03` Phase 3 Licensed Content Library And Listening

- Goal: turn governed Drive assets into reusable, safe learning experiences.
- Stories: `EP3-ST001` to `EP3-ST012`, covering manifest/inventory, checksum/version,
  license/review/import, admin/learner library, controlled media/transcript, resume,
  bookmark/note, drills, shadowing, links, content batch, and exit review.
- Dependencies: `E00` Drive/content design, `E01` CMS, and completed `E02` TOEIC
  context through its exit `EP2-ST012`.
- Coverage: `FR-009`, `FR-016` to `FR-019`; `UF-004`, `UF-006`, `UF-007`, `UF-010`;
  content, storage, search, security, capacity, and testing NFRs.
- Exit gate: Drive remains only a source while reviewed canonical content is imported,
  accessed, practiced, linked, and audited through application systems.

## `E04` Phase 4 TOEIC Speaking, Writing, And Four Skills

- Goal: add rubric-driven productive skills and balanced Four Skills roadmaps.
- Stories: `EP4-ST001` to `EP4-ST012`, covering tasks/rubrics, audio/text submission,
  controlled storage, UI, provider-neutral advisory feedback, balanced roadmaps,
  progress, evaluation, and exit review.
- Dependencies: `E02` TOEIC governance, completed `E03` media through its exit
  `EP3-ST012`, and `E01` roadmap/progress.
- Coverage: `FR-004`, `FR-009`, `FR-011`, `FR-020` to `FR-022`, `FR-025`;
  `UF-003`, `UF-006`, `UF-009`, `UF-011`, `UF-013`; AI/score/security NFRs.
- Exit gate: evidence and rubric feedback work across speaking/writing/Four Skills,
  while AI remains advisory and cannot author official scores.

## `E05` Phase 5 Full Test, Adaptive AI, And Community

- Goal: deepen assessment and personalization without weakening integrity or safety.
- Stories: `EP5-ST001` to `EP5-ST013`, covering full mocks, secure finalization,
  strict exam UI, integrity/analysis, advanced errors, adaptive roadmap, AI
  explanation/speaking/writing, moderated community, quota/cost operations, and exit
  review.
- Dependencies: completed `E04` productive skills through its exit `EP4-ST012` and
  all prior shared learning/content domains.
- Coverage: `FR-009`, `FR-011`, `FR-023` to `FR-026`, `FR-029`; `UF-006`, `UF-009`,
  `UF-012`, `UF-013`; exam, AI, web-state, security, capacity, and regression NFRs.
- Exit gate: exam, adaptive, AI, and community journeys pass integrity, evaluation,
  abuse, accessibility, observability, and performance gates.

## `E06` Phase 6 Mobile And Premium Expansion

- Goal: extend proven web rules to mobile and sustainable free-first monetization.
- Stories: `EP6-ST001` to `EP6-ST014`, covering Expo/shared contracts, mobile auth,
  roadmap/daily/TOEIC/listening/speaking/writing, push, offline sync, entitlements,
  Stripe webhooks/UI, analytics, backup/load/DR, and release readiness.
- Dependencies: `E05` stable backend APIs, policies, content, and observability
  through its exit `EP5-ST013`.
- Coverage: `FR-027` to `FR-029`; `UF-002`, `UF-004`, `UF-010`, `UF-013`; mobile
  state, AI, adapters, security, capacity, owner-control, and regression NFRs.
- Exit gate: mobile shares API/RBAC and deterministic sync; free-first billing is
  idempotent; owner accepts resilience, capacity, and release evidence.

## Governance

- Detailed story dependencies are authoritative in `story-map.md`.
- Requirement coverage is authoritative in `epic-map.md` and cross-checked by
  `EP0-ST017` automation.
- Only passed story branches merge into `dev`; only the project owner promotes to
  `main` or approves protected production decisions.
