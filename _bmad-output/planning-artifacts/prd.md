# EnglishPath BMAD PRD Projection

## Authority

- Detailed source: `notes/englishpath_product_spec_v2.md`.
- Executable requirements: `docs/02_PRD.md`.
- Critical journeys: `docs/03_USER_FLOWS.md`.
- Epic/story maps are rebaselined immediately in `EP0-ST015`.

## Product Outcome

EnglishPath gives Vietnamese learners a free-first, roadmap-driven English learning
loop that connects daily practice, vocabulary retention, recurring-error remediation,
licensed content, progress, and three primary TOEIC tracks. It remains broader than a
test site and does not become a separate IELTS exam product.

## Primary Tracks And Shared Core

Primary TOEIC tracks:

1. TOEIC Listening & Reading.
2. TOEIC Speaking & Writing.
3. TOEIC Four Skills.

Shared core:

- General, communication, and workplace English.
- Onboarding, placement, dashboard, and 30/60/90/120-day roadmap.
- Vocabulary mindmap/taxonomy, SRS, daily practice, and Error Notebook.
- Shared CMS/content model with source, license, review, and publish governance.
- Licensed library and reviewed Google Drive inventory/import path.

## Phase Projection

| Phase | Product increment                                                                                                                       |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | Governance, auth foundation, taxonomy/rights design, Drive inventory design, data/API conventions, health and observability foundations |
| 1     | Public/guest and learning core: auth, placement, dashboard, roadmap, mindmap/SRS, daily practice, Error Notebook, CMS                   |
| 2     | TOEIC Listening & Reading Parts 1-7, question bank, mini/half tests, timing, analysis, remediation                                      |
| 3     | Licensed library, Drive import, media/transcript, listening/shadowing, resume/bookmark and learning links                               |
| 4     | TOEIC Speaking, Writing and Four Skills with rubrics, submissions, advisory AI and progress                                             |
| 5     | Full tests, exam simulation, adaptive/error learning, AI learning and moderated community                                               |
| 6     | Mobile, push/offline, premium quotas/subscriptions and advanced analytics                                                               |

## Non-Negotiable Rules

- Free baseline value cannot be replaced by a paywall.
- Google Drive is a source/inventory input, never the production business database.
- Imported or AI-assisted content cannot publish before license and human review.
- Shared taxonomy/content is reused across tracks and skills.
- Learning activities that produce reviewable errors integrate with Error Notebook.
- Official answer keys, scores, exam timing, roles, ownership, quotas, and rights are
  backend-owned.
- AI feedback is advisory and cannot set official answers or official scores.
- No unapproved exam track and no separate IELTS exam product.
- Production credentials, paid services, destructive migrations, and `dev` to `main`
  promotion remain owner-controlled.

## Launch Evidence

Useful early web delivery requires an end-to-end learner loop, governed content,
TOEIC L&R core, licensed-library foundations, technical quality gates, observability,
and enough reviewed content to demonstrate each critical journey. Exact content
counts and phase story ranges are maintained in the v2 roadmap/maps, not duplicated
here.

## Current Boundary

Governance/loop tooling, health, local ports, and a blog SEO baseline are implemented.
The product v2 core planning baseline is `EP0-ST014`; detailed map alignment is
`EP0-ST015`. All broader domain capabilities remain planned.
