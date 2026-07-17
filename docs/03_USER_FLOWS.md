# EnglishPath Critical User Flows

## Flow Index

| ID       | Flow                                       | Primary actor    | Earliest phase |
| -------- | ------------------------------------------ | ---------------- | -------------- |
| `UF-001` | Guest discovery and trial                  | Guest            | 1              |
| `UF-002` | Authentication and recovery                | Guest or learner | 0-1            |
| `UF-003` | Onboarding, placement, and track selection | Learner          | 1              |
| `UF-004` | Roadmap-driven daily learning              | Learner          | 1              |
| `UF-005` | Vocabulary SRS and basic review            | Learner          | 1              |
| `UF-006` | Error Notebook remediation                 | Learner          | 1-5            |
| `UF-007` | Content inventory, review, and publish     | Editor or admin  | 0-3            |
| `UF-008` | TOEIC Listening & Reading practice/test    | TOEIC learner    | 2              |
| `UF-009` | Roadmap recalculation                      | Learner          | 1, 5           |
| `UF-010` | Licensed library and listening             | Learner          | 3              |
| `UF-011` | TOEIC Speaking/Writing/Four Skills         | TOEIC learner    | 4              |
| `UF-012` | Full mock exam finalization                | TOEIC learner    | 5              |
| `UF-013` | AI, community, and entitlement policy      | Learner or admin | 4-6            |

## `UF-001` Guest Discovery And Trial

- Trigger: A guest arrives from search, social, a shared resource, or direct traffic.
- Main path:
  1. The guest sees goal-oriented public navigation for general English and the three
     TOEIC tracks.
  2. The guest reads useful content or opens a limited sample lesson/practice.
  3. The guest completes the sample and sees a relevant next action.
  4. Registration is requested only when persistence or protected content is needed.
- Failure/alternate: Public content remains useful without forced signup; unavailable
  trials show an honest fallback rather than a dead CTA.
- Success: The guest experiences learning value and can reach registration.

## `UF-002` Authentication And Recovery

- Trigger: A user registers, signs in, signs out, or recovers access.
- Main path:
  1. The user submits credentials or a valid recovery flow.
  2. The backend verifies identity and maps the auth subject to application data.
  3. The user reaches onboarding when incomplete or the dashboard when ready.
- Failure/alternate: Invalid or expired credentials return actionable errors without
  revealing whether unrelated accounts exist.
- Success: The user reaches a backend-verified session or a safe terminal error.

## `UF-003` Onboarding, Placement, And Track Selection

- Trigger: A newly authenticated learner starts setup or changes an allowed goal.
- Main path:
  1. The learner selects general English, communication/workplace English, TOEIC L&R,
     TOEIC S&W, or TOEIC Four Skills.
  2. The learner supplies level, deadline, time budget, and learning preferences.
  3. Basic placement produces a server-approved starting level.
  4. The system creates a 30/60/90/120-day roadmap appropriate to the selected track.
- Failure/alternate: Skipped placement uses a conservative marked default and schedules
  reassessment; impossible time/goal combinations require adjustment.
- Success: Persisted inputs and placement evidence produce a visible starting roadmap.

## `UF-004` Roadmap-Driven Daily Learning

- Trigger: A learner opens the dashboard or daily-practice route.
- Main path:
  1. The system loads due roadmap, vocabulary, quiz, sentence, review, and later skill
     tasks within the learner's time budget.
  2. The learner completes one or more tasks.
  3. Server-approved outcomes update progress, streak/XP, mastery, and errors.
  4. The dashboard shows completion and the next useful action.
- Failure/alternate: Empty, offline, dependency-error, and partial-completion states
  preserve honest progress and offer a safe retry.
- Success: A daily session creates measurable progress without exceeding the plan.

## `UF-005` Vocabulary SRS And Basic Review

- Trigger: Vocabulary is due from roadmap, mindmap, or an Error Notebook link.
- Main path:
  1. The learner navigates a topic/subtopic/collocation or receives due items.
  2. Practice captures recall quality and context use.
  3. The backend updates mastery and next-review timing.
  4. Repeated errors link back to related skill/TOEIC context.
- Failure/alternate: Missing audio/example never blocks core review; invalid client
  mastery values are ignored.
- Success: Due state changes from validated practice evidence.

## `UF-006` Error Notebook Remediation

- Trigger: A learner makes a reviewable vocabulary, quiz, listening, or TOEIC error.
- Main path:
  1. The activity records the error type, source skill/Part, and context.
  2. The notebook groups repeated errors and schedules review.
  3. The learner retries focused remediation.
  4. Valid outcomes update recurrence/mastery and may influence the roadmap.
- Failure/alternate: No due errors produces a meaningful completion state; deleted or
  unavailable source content retains safe historical evidence.
- Success: Recurring mistakes become visible, reviewable, and measurable.

## `UF-007` Content Inventory, Review, And Publish

- Trigger: An editor inventories a Drive asset or creates shared content in the CMS.
- Main path:
  1. The system records source ID/URL, checksum/version, type, track, skill, topic,
     level, usage scope, access tier, and rights metadata.
  2. Content is classified/segmented and remains draft.
  3. An authorized human validates license and learning quality.
  4. Approved content is imported to application storage/data and published through
     an audited transition.
- Failure/alternate: Changed checksum, blocked/unknown license, missing metadata, or
  failed review prevents publication; a Drive change never auto-publishes.
- Success: One canonical, traceable content version becomes available to permitted
  learner surfaces.

## `UF-008` TOEIC Listening And Reading Practice/Test

- Trigger: A learner selects a Part 1-7 practice, topic/difficulty set, mini test, half
  test, or timed session.
- Main path:
  1. The backend creates a session without exposing correct answers.
  2. Server timing and answer persistence govern the attempt.
  3. Finalization scores the session exactly once.
  4. Results show Part/skill accuracy, time use, weaknesses, and remediation links.
  5. Reviewable mistakes enter Error Notebook.
- Failure/alternate: Expiry, duplicate submit, interrupted media, and suspicious events
  use deterministic finalization/recovery rules and produce audit evidence.
- Success: A protected attempt produces actionable, persisted analysis.

## `UF-009` Roadmap Recalculation

- Trigger: Placement changes, a milestone completes, repeated errors emerge, or an
  allowed learner setting changes.
- Main path:
  1. The backend evaluates validated progress and constraints.
  2. Proposed changes preserve the selected track and duration limits.
  3. The system stores a new roadmap version and explains material changes.
- Failure/alternate: Insufficient evidence leaves the current plan intact; recalculation
  cannot silently remove required Four Skills coverage.
- Success: The active roadmap changes predictably without losing history.

## `UF-010` Licensed Library And Listening

- Trigger: A learner opens an approved library item or linked roadmap lesson.
- Main path:
  1. Access policy validates user, usage scope, and tier.
  2. The learner streams/opens controlled media with transcript and lesson metadata.
  3. The learner practices drills or shadowing and may bookmark/add a note.
  4. Resume/progress and related vocabulary/roadmap links are persisted.
- Failure/alternate: Expired access, unavailable media, or removed rights fails safely
  without exposing a public source URL.
- Success: The learner resumes and completes governed content.

## `UF-011` TOEIC Speaking, Writing, And Four Skills

- Trigger: A learner starts an approved speaking/writing task or Four Skills roadmap.
- Main path:
  1. The system presents the task, rubric, limits, and submission requirements.
  2. The learner records audio or submits text.
  3. The backend stores evidence and may request advisory AI feedback.
  4. Rubric results update Four Skills progress without letting AI set an official
     answer key or score.
- Failure/alternate: Invalid media/text, quota exhaustion, or provider failure preserves
  the submission and offers deterministic fallback/retry behavior.
- Success: The learner receives traceable rubric-aligned evidence and next practice.

## `UF-012` Full Mock Exam Finalization

- Trigger: A learner starts a full mock or exam-simulation session.
- Main path:
  1. The backend creates the timed attempt and keeps all answer keys server-side.
  2. Answers and suspicious events are recorded during the session.
  3. Submit or server expiry finalizes the attempt exactly once.
  4. Only finalized results reveal allowed analysis/remediation.
- Failure/alternate: Duplicate submits return the original final state; timing or
  integrity conflicts are logged and handled without client-authored scores.
- Success: A secure full attempt produces one authoritative result.

## `UF-013` AI, Community, And Entitlement Policy

- Trigger: A learner requests AI help, publishes community content, or reaches a quota
  or entitlement boundary.
- Main path:
  1. The backend checks identity, quota/entitlement, abuse policy, and content safety.
  2. AI requests use an approved gateway; community posts enter moderation policy.
  3. Usage, prompt/model version, cost estimate, moderation, and outcome are recorded.
  4. The learner receives a structured result, moderated state, or clear limit.
- Failure/alternate: Provider failure, unsafe output, exhausted quota, or report blocks
  unsafe publication while preserving free baseline access.
- Success: Advanced features remain controlled, auditable, and advisory.
