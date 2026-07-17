# EnglishPath Product Scope Baseline

## Authority

`notes/englishpath_product_spec_v2.md` is the sole detailed product source of truth.
This document is its concise delivery baseline. Epic and story maps are refreshed by
the immediate follow-up `EP0-ST015`.

## Product Position

EnglishPath is a comprehensive, free-first English learning platform for Vietnamese
learners. It connects assessment, a 30/60/90/120-day roadmap, daily practice, error
remediation, licensed content, measurable progress, and later AI and mobile delivery.

TOEIC is a primary business axis, not the whole product. The primary exam-oriented
tracks are:

- TOEIC Listening & Reading.
- TOEIC Speaking & Writing.
- TOEIC Four Skills.

General English, communication, workplace English, vocabulary, listening, speaking,
reading, and writing remain first-class learning goals. EnglishPath does not create a
separate IELTS exam platform; licensed IELTS material may only be used as governed
English-learning content.

## Current Implementation Status

| Area                                                            | Status               | Evidence                                                                      |
| --------------------------------------------------------------- | -------------------- | ----------------------------------------------------------------------------- |
| Story governance and local loop                                 | Implemented baseline | Completed Phase 0 stories, with superseded work recorded in lifecycle folders |
| Health API and local ports                                      | Implemented baseline | `GET /api/v1/health`, web `5173`, API `3000`                                  |
| Public blog SEO foundation                                      | Implemented baseline | `EP1-ST002`                                                                   |
| Product v2 core planning                                        | In progress          | `EP0-ST014`                                                                   |
| Epic/story map v2 alignment                                     | Immediate follow-up  | `EP0-ST015`                                                                   |
| Landing, auth, learning, TOEIC, library, AI, and mobile domains | Planned              | No completed domain delivery story yet                                        |

## Actors

| Actor          | Primary outcome                                                                     |
| -------------- | ----------------------------------------------------------------------------------- |
| Guest          | Explore useful content and a limited learning trial before registration             |
| Learner        | Follow a goal-based roadmap, practice, review errors, and measure progress          |
| TOEIC learner  | Train one or more TOEIC tracks with secure scoring and remediation                  |
| Content editor | Classify, review, license, import, and publish reusable learning content            |
| Admin          | Govern roles, content, exam operations, AI usage, audit, and product quality        |
| Project owner  | Approve production promotion, risky migrations, paid services, and business changes |

## Free-First Rules

- Free learners receive meaningful onboarding, roadmap, vocabulary, daily practice,
  error review, and TOEIC core value rather than a hollow paywall.
- Premium expands quota, analytics, offline access, and advanced experiences; it does
  not remove the useful free learning loop.
- Guests can sample learning value before registration.
- AI and expensive processing are quota-controlled and always backend-mediated.

## Early Web Product Boundary

The initial useful web product spans the Phase 1 learning core and the first
production-ready slices of Phase 2 and Phase 3:

1. Public landing, guest trial, auth, onboarding, and placement.
2. Dashboard and personalized 30/60/90/120-day roadmaps.
3. Shared vocabulary topic/subtopic/collocation taxonomy and mindmap navigation.
4. SRS, daily practice, quiz cards, daily sentences, progress, and basic Error
   Notebook.
5. Basic CMS with source, license, review, and publish governance.
6. TOEIC Listening & Reading question bank, Part 1-7 practice, timed mini/half tests,
   score analysis, and vocabulary/grammar remediation.
7. Licensed content inventory and a reviewed import path, followed by listening media,
   transcript, resume, bookmark, and roadmap links.
8. Analytics, monitoring, accessibility, security, and staging readiness.

## Later Product Boundary

- Phase 4: TOEIC Speaking, Writing, Four Skills roadmaps, rubrics, submissions, and
  advisory AI feedback.
- Phase 5: full mock tests, exam simulation, advanced Error Notebook, adaptive
  roadmap, AI learning rooms/coaches, and moderated community.
- Phase 6: Expo mobile, push, offline learning, premium subscriptions, and advanced
  analytics.

## Licensed Content Rules

- Google Drive is a governed source and inventory input, never the production business
  database or an uncontrolled public runtime dependency.
- Imported assets retain source file ID/URL, checksum, version, content type, track,
  topic, level, usage scope, access tier, license, review, and publish metadata.
- New or changed source content passes metadata extraction, license validation,
  classification, segmentation, and human review before CMS publication.
- Published private media uses controlled storage/access; changing a Drive file never
  auto-publishes a new version.
- Shared taxonomy and content are reused across roadmaps and skills instead of copied
  into isolated modules.

## AI And Assessment Rules

- AI cannot define official answer keys or official scores.
- AI-assisted publishable content remains draft until human approval.
- TOEIC answer keys, scoring rules, and authoritative timers remain backend-owned.
- Learning mistakes flow into Error Notebook when the activity can produce a
  reviewable error.
- Score, roadmap, content-rights, and exam-session implementations require happy,
  validation, boundary, and failure-path tests.

## Explicit Early Exclusions

- A separate IELTS exam product or any unapproved exam track.
- Professional camera/screen proctoring.
- Marketplace or livestream-class delivery.
- Native mobile before web business rules stabilize.
- Unlimited AI or human mentoring.
- Auto-publication of imported or AI-assisted content.

## Phase Alignment

| Phase   | Outcome                                                                                                                                     |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase 0 | Foundation, governance, auth foundation, taxonomy/license design, Drive inventory design, API/data conventions, health, logging, monitoring |
| Phase 1 | Learning core: public/guest, auth/onboarding, placement, dashboard, roadmap, mindmap/SRS, daily practice, Error Notebook, basic CMS         |
| Phase 2 | TOEIC Listening & Reading core, timing, analysis, and remediation                                                                           |
| Phase 3 | Licensed content library, Drive import, listening, transcript, shadowing, progress, and links                                               |
| Phase 4 | TOEIC Speaking, Writing, Four Skills, rubrics, submissions, AI feedback, and progress                                                       |
| Phase 5 | Full tests, simulation, adaptive learning, advanced errors, AI learning, and moderated community                                            |
| Phase 6 | Mobile, push, offline learning, premium expansion, and advanced analytics                                                                   |

## Product Scope Guard

Every product story must improve at least one of: general English, TOEIC results,
vocabulary retention, study consistency, recurring-error remediation, access to
licensed content, or product administration/security/quality measurement. A story
that serves none of these objectives requires product review.
