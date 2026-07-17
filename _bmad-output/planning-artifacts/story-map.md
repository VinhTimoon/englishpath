# EnglishPath Story Map

## Delivery Status Legend

- `Implemented`: completed story evidence exists.
- `Next`: explicitly identified as the next delivery.
- `Planned`: approved roadmap item not yet implemented.

## Baseline Already Implemented

| Story                                      | Outcome                                                                                                   | Status      |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------- | ----------- |
| `EP0-ST001` to `EP0-ST010` and `EP0-ST012` | Governance, loop, checks, and implementation safety foundation; `EP0-ST011` was superseded by `EP0-ST012` | Implemented |
| `EP1-ST002`                                | Public blog SEO foundation                                                                                | Implemented |
| `EP1-ST004`                                | Local runtime ports baseline                                                                              | Implemented |

## Ordered Story Progression

| Phase    | Story range                | User value increment                                                  | Depends on                  | Status      |
| -------- | -------------------------- | --------------------------------------------------------------------- | --------------------------- | ----------- |
| Phase 0B | `EP0-ST013` to `EP0-ST016` | Planning, architecture, CI safety, and E2E readiness for product work | Existing foundation stories | In progress |
| Phase 1A | `EP1-ST005` to `EP1-ST006` | Credible landing experience and crawlable acquisition surface         | Phase 0B                    | Next        |
| Phase 1B | `EP1-ST007` to `EP1-ST009` | Learners can create and recover accounts                              | Phase 1A                    | Planned     |
| Phase 1C | `EP1-ST010` to `EP1-ST013` | Learners define goals and receive a starting level                    | Phase 1B                    | Planned     |
| Phase 1D | `EP1-ST014` to `EP1-ST016` | Learners receive bounded personalized roadmaps                        | Phase 1C                    | Planned     |
| Phase 1E | `EP1-ST017` to `EP1-ST023` | Learners can study vocabulary, quizzes, and daily sentences daily     | Phase 1D                    | Planned     |
| Phase 1F | `EP1-ST024` to `EP1-ST029` | Learners see progress; admins manage content and access               | Phase 1E                    | Planned     |
| Phase 1G | `EP1-ST030` to `EP1-ST038` | MVP gains launch content, observability, and staging readiness        | Phase 1F                    | Planned     |
| Phase 2  | `EP2-ST001` to `EP2-ST010` | Learners add listening depth and structured review loops              | Phase 1G                    | Planned     |
| Phase 3  | `EP3-ST001` to `EP3-ST012` | Learners can practice TOEIC securely at increasing fidelity           | Phase 2                     | Planned     |
| Phase 4  | `EP4-ST001` to `EP4-ST012` | Learners receive controlled AI assistance for writing and speaking    | Phase 3                     | Planned     |
| Phase 5  | `EP5-ST001` to `EP5-ST008` | Mobile extends retention and access beyond the web MVP                | Phase 4                     | Planned     |
| Phase 6  | Post-MVP backlog themes    | Monetization and resilience mature after product-market validation    | Phase 5                     | Planned     |

## Flow To Story Alignment

| Flow                                 | Earliest supporting story range                                    |
| ------------------------------------ | ------------------------------------------------------------------ |
| `UF-001` Guest discovery             | `EP1-ST005` to `EP1-ST006`                                         |
| `UF-002` Authentication and recovery | `EP1-ST007` to `EP1-ST009`                                         |
| `UF-003` Onboarding and placement    | `EP1-ST010` to `EP1-ST016`                                         |
| `UF-004` Daily learning session      | `EP1-ST016` to `EP1-ST025`, expanded in `EP2-ST001` to `EP2-ST010` |
| `UF-005` Quiz submission             | `EP1-ST020` to `EP1-ST021`                                         |
| `UF-006` Error review loop           | `EP2-ST007` to `EP2-ST010`                                         |
| `UF-007` Content publishing          | `EP1-ST026` to `EP1-ST029`, expanded in `EP3-ST001` to `EP3-ST003` |
| `UF-008` TOEIC secure submission     | `EP3-ST004` to `EP3-ST012`                                         |
| `UF-009` AI quota handling           | `EP4-ST001` to `EP4-ST012`, expanded by Phase 6 entitlements       |
