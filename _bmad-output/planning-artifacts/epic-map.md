# EnglishPath Product V2 Epic Map

## Epic Sequence

| Epic  | Phase                      | Goal                                                                                                                                 | Story range                | Requirements                                                                                                                      | Flows                                            | Depends on                                   | Status       |
| ----- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | -------------------------------------------- | ------------ |
| `E00` | 0 Foundation               | Finish governance, architecture, CI/E2E, auth/content foundations, Drive inventory design, and observability.                        | `EP0-ST014` to `EP0-ST023` | `FR-002`, `FR-006`, `FR-010`, `FR-017`, `FR-029`; `NFR-001` to `NFR-004`, `NFR-006`, `NFR-007`, `NFR-010` to `NFR-017`            | `UF-002`, `UF-007`                               | Existing governance, health, blog SEO, ports | Completed    |
| `E01` | 1 Learning Core            | Deliver guest/public value, identity, onboarding, roadmap, mindmap/SRS, daily practice, errors, progress, CMS, and launch content.   | `EP1-ST005` to `EP1-ST039` | `FR-001` to `FR-011`, `FR-029`; `NFR-002` to `NFR-007`, `NFR-010`, `NFR-013` to `NFR-017`                                         | `UF-001` to `UF-007`, `UF-009`                   | `E00` / `EP0-ST022`                          | Planned next |
| `E02` | 2 TOEIC L&R                | Deliver governed Parts 1-7 practice, mini/half tests, timing, scoring, weakness analysis, and remediation.                           | `EP2-ST001` to `EP2-ST012` | `FR-009`, `FR-011` to `FR-015`; `NFR-002`, `NFR-006` to `NFR-008`, `NFR-013`, `NFR-014`, `NFR-017`                                | `UF-006` to `UF-008`                             | `E01` / `EP1-ST039`                          | Planned      |
| `E03` | 3 Licensed Library         | Import governed Drive content and deliver library, listening, transcript, shadowing, resume/bookmark, and learning links.            | `EP3-ST001` to `EP3-ST012` | `FR-009`, `FR-016` to `FR-019`; `NFR-006`, `NFR-007`, `NFR-010` to `NFR-014`, `NFR-017`                                           | `UF-004`, `UF-006`, `UF-007`, `UF-010`           | `E02` / `EP2-ST012`                          | Planned      |
| `E04` | 4 TOEIC Four Skills        | Deliver TOEIC Speaking/Writing tasks, rubrics, submissions, advisory AI feedback, Four Skills roadmaps, and progress.                | `EP4-ST001` to `EP4-ST012` | `FR-004`, `FR-009`, `FR-011`, `FR-020` to `FR-022`, `FR-025`; `NFR-002`, `NFR-006` to `NFR-010`, `NFR-013`, `NFR-017`             | `UF-003`, `UF-006`, `UF-009`, `UF-011`, `UF-013` | `E03` / `EP3-ST012`                          | Planned      |
| `E05` | 5 Full Test, AI, Community | Add secure full tests, adaptive/error learning, AI explanation/speaking/writing, and moderated community.                            | `EP5-ST001` to `EP5-ST013` | `FR-009`, `FR-011`, `FR-023` to `FR-026`, `FR-029`; `NFR-002`, `NFR-005`, `NFR-008` to `NFR-010`, `NFR-013`, `NFR-014`, `NFR-017` | `UF-006`, `UF-009`, `UF-012`, `UF-013`           | `E04` / `EP4-ST012`                          | Planned      |
| `E06` | 6 Mobile And Premium       | Extend the shared product to Expo, push/offline, premium entitlements/subscriptions, analytics, resilience, and capacity validation. | `EP6-ST001` to `EP6-ST014` | `FR-027` to `FR-029`; `NFR-002`, `NFR-005`, `NFR-009`, `NFR-010`, `NFR-013` to `NFR-017`                                          | `UF-002`, `UF-004`, `UF-010`, `UF-013`           | `E05` / `EP5-ST013`                          | Planned      |

Foundation transition: blocked `EP0-ST015` is historical evidence only;
`EP0-ST015R` is the executable roadmap-map gate before `EP0-ST016`.

## Exit Gates

| Epic  | Exit gate                                                                                                                                                 |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `E00` | V2 planning/architecture are consistent; CI and browser foundations pass; auth/content/Drive/observability foundations require no production credentials. |
| `E01` | A guest can trial value and a learner can authenticate, onboard, receive a roadmap, study/review daily, see progress, and use reviewed content.           |
| `E02` | Governed TOEIC L&R Parts 1-7 and timed mini/half tests produce protected, accurate analysis and Error Notebook remediation.                               |
| `E03` | Reviewed licensed assets can be imported, searched, accessed safely, resumed, practiced, and linked without Drive becoming the runtime database.          |
| `E04` | Speaking/Writing submissions and Four Skills roadmaps work with rubric evidence, advisory AI, quotas, and official-score separation.                      |
| `E05` | Full exam finalization, adaptive review, AI learning, and moderated community pass security, abuse, performance, and critical-journey tests.              |
| `E06` | Mobile shares API/RBAC, offline sync has policy, billing is idempotent/free-first, and backup/load/disaster-recovery evidence is accepted by the owner.   |

## Coverage Check

- Functional coverage: `FR-001` through `FR-029` appears in at least one epic.
- Non-functional coverage: `NFR-001` through `NFR-017` appears in at least one epic.
- Flow coverage: `UF-001` through `UF-013` appears in at least one epic.
- Detailed story assignment lives in `story-map.md`; epic outcomes live in `epics.md`.

## Explicit Coverage Ledger

| Epic  | Primary functional IDs                                                         |
| ----- | ------------------------------------------------------------------------------ |
| `E00` | `FR-002`, `FR-006`, `FR-010`, `FR-017`, `FR-029`                               |
| `E01` | `FR-001`, `FR-003`, `FR-004`, `FR-005`, `FR-007`, `FR-008`, `FR-009`, `FR-011` |
| `E02` | `FR-012`, `FR-013`, `FR-014`, `FR-015`                                         |
| `E03` | `FR-016`, `FR-018`, `FR-019`                                                   |
| `E04` | `FR-020`, `FR-021`, `FR-022`, `FR-025`                                         |
| `E05` | `FR-023`, `FR-024`, `FR-026`                                                   |
| `E06` | `FR-027`, `FR-028`                                                             |

| Epic  | Primary non-functional IDs                                                                                                                               |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `E00` | `NFR-001`, `NFR-002`, `NFR-003`, `NFR-004`, `NFR-006`, `NFR-007`, `NFR-010`, `NFR-011`, `NFR-012`, `NFR-013`, `NFR-014`, `NFR-015`, `NFR-016`, `NFR-017` |
| `E01` | `NFR-005`                                                                                                                                                |
| `E02` | `NFR-008`                                                                                                                                                |
| `E04` | `NFR-009`                                                                                                                                                |

| Epic  | Primary flow IDs                                           |
| ----- | ---------------------------------------------------------- |
| `E00` | `UF-002`, `UF-007`                                         |
| `E01` | `UF-001`, `UF-003`, `UF-004`, `UF-005`, `UF-006`, `UF-009` |
| `E02` | `UF-008`                                                   |
| `E03` | `UF-010`                                                   |
| `E04` | `UF-011`, `UF-013`                                         |
| `E05` | `UF-012`                                                   |
