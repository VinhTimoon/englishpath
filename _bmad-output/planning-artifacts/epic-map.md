# EnglishPath Epic Map

| Epic ID | Phase    | Goal                                                                                    | Story range                | Requirement coverage                               | Dependencies                     | Status      |
| ------- | -------- | --------------------------------------------------------------------------------------- | -------------------------- | -------------------------------------------------- | -------------------------------- | ----------- |
| `E00`   | Phase 0B | Recover planning, architecture, CI safety, and browser E2E foundations.                 | `EP0-ST013` to `EP0-ST016` | `NFR-001`, `NFR-002`, `NFR-010`, `NFR-011`         | Prior governance and `EP1-ST004` | In progress |
| `E01`   | Phase 1A | Restore the public landing journey and technical SEO baseline.                          | `EP1-ST005` to `EP1-ST006` | `FR-001`, `NFR-008`                                | `E00`                            | Next        |
| `E02`   | Phase 1B | Deliver identity, session, and recovery capabilities for learners.                      | `EP1-ST007` to `EP1-ST009` | `FR-002`, `NFR-004`                                | `E01`                            | Planned     |
| `E03`   | Phase 1C | Capture onboarding inputs and placement results to establish learner starting state.    | `EP1-ST010` to `EP1-ST013` | `FR-003`, `FR-004`                                 | `E02`                            | Planned     |
| `E04`   | Phase 1D | Generate bounded learner roadmaps and expose them in the dashboard.                     | `EP1-ST014` to `EP1-ST016` | `FR-005`, `FR-006`                                 | `E03`                            | Planned     |
| `E05`   | Phase 1E | Ship daily vocabulary, quiz, and sentence practice with content taxonomy and SRS hooks. | `EP1-ST017` to `EP1-ST023` | `FR-007`, `FR-008`, `FR-009`                       | `E04`                            | Planned     |
| `E06`   | Phase 1F | Track progress and provide guarded admin CMS operations.                                | `EP1-ST024` to `EP1-ST029` | `FR-010`, `FR-011`, `FR-012`, `NFR-003`, `NFR-004` | `E05`                            | Planned     |
| `E07`   | Phase 1G | Publish launch content and attach observability and staging readiness.                  | `EP1-ST030` to `EP1-ST038` | `FR-013`, `NFR-007`, `NFR-008`, `NFR-009`          | `E06`                            | Planned     |
| `E08`   | Phase 2  | Add listening practice, Error Notebook, and cross-skill review loops.                   | `EP2-ST001` to `EP2-ST010` | `FR-014`, `FR-015`                                 | `E07`                            | Planned     |
| `E09`   | Phase 3  | Deliver TOEIC content operations, practice, scoring, and secure exam mode.              | `EP3-ST001` to `EP3-ST012` | `FR-016`, `NFR-005`                                | `E08`                            | Planned     |
| `E10`   | Phase 4  | Introduce AI Gateway, writing, speaking, quota, and abuse controls.                     | `EP4-ST001` to `EP4-ST012` | `FR-017`, `NFR-006`                                | `E09`                            | Planned     |
| `E11`   | Phase 5  | Extend core learner experiences to mobile with shared APIs and offline support.         | `EP5-ST001` to `EP5-ST008` | `FR-018`, `NFR-012`                                | `E10`                            | Planned     |
| `E12`   | Phase 6  | Add entitlements, subscriptions, backup, load validation, and disaster recovery.        | Post-MVP backlog themes    | `FR-019`, `NFR-009`, `NFR-011`                     | `E11`                            | Planned     |

## MVP Coverage Check

| MVP capability                   | Epic coverage |
| -------------------------------- | ------------- |
| Public acquisition and SEO       | `E01`, `E07`  |
| Identity and recovery            | `E02`         |
| Onboarding and placement         | `E03`         |
| Roadmap and dashboard            | `E04`, `E06`  |
| Daily learning loop              | `E05`, `E06`  |
| Admin CMS                        | `E06`         |
| Launch content and observability | `E07`         |
