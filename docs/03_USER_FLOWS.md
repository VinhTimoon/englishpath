# EnglishPath Critical User Flows

## Flow Index

| ID       | Flow                        | Primary actor           |
| -------- | --------------------------- | ----------------------- |
| `UF-001` | Guest discovery             | Guest                   |
| `UF-002` | Authentication and recovery | Guest or learner        |
| `UF-003` | Onboarding and placement    | Learner                 |
| `UF-004` | Daily learning session      | Learner                 |
| `UF-005` | Quiz submission             | Learner                 |
| `UF-006` | Error review loop           | Learner                 |
| `UF-007` | Content publishing          | Content editor or admin |
| `UF-008` | TOEIC secure submission     | Learner                 |
| `UF-009` | AI quota handling           | Learner or admin        |

## `UF-001` Guest Discovery

- Trigger: A guest lands on the site from search, social, or direct traffic.
- Steps:
  1. The guest views landing or blog content with SEO metadata.
  2. The guest explores roadmap value, free-first positioning, and sample learning content.
  3. The guest follows a CTA into signup or sign-in.
- Alternate path: If the guest only wants content, they remain on blog pages without forced signup.
- Success: The guest can discover value and reach an auth entry point without blocked navigation.

## `UF-002` Authentication And Recovery

- Trigger: A guest chooses to create an account, sign in, or recover access.
- Steps:
  1. The user enters registration, login, or recovery details.
  2. Backend auth APIs validate the request through Supabase Auth.
  3. The system establishes or restores an authenticated session.
  4. The learner is routed to onboarding if profile setup is incomplete, otherwise to the dashboard.
- Alternate path: Invalid credentials or expired recovery tokens return actionable errors without revealing sensitive data.
- Success: The learner reaches an authenticated session or receives a safe recovery error.

## `UF-003` Onboarding And Placement

- Trigger: A newly authenticated learner starts initial setup.
- Steps:
  1. The learner submits goals, time budget, deadline, and preferred skills.
  2. The learner completes placement intake or assessment prompts.
  3. The system determines an initial level and selects a 30/60/90/120-day roadmap template.
  4. The learner receives a starting roadmap and next-step tasks.
- Alternate path: If the learner skips placement, the system falls back to a conservative default level and marks reassessment due.
- Success: A learner profile and starting roadmap exist with traceable placement inputs.

## `UF-004` Daily Learning Session

- Trigger: A learner opens the dashboard or daily practice entry.
- Steps:
  1. The system loads due roadmap tasks, daily vocabulary, quizzes, daily sentences, and later listening tasks.
  2. The learner completes one or more tasks.
  3. The system records completion, progress, and review-due mistakes.
  4. The dashboard refreshes progress, XP, streak, and next tasks.
- Alternate path: If there are no due tasks, the system shows a meaningful empty state and suggested next actions.
- Success: A learner can complete a useful daily session and see updated progress.

## `UF-005` Quiz Submission

- Trigger: A learner starts a quiz or practice session.
- Steps:
  1. The system creates a session and serves questions without exposing future answers.
  2. The learner submits answers question by question or at session end.
  3. The system scores the submission, updates progress, and logs mistakes for review.
  4. The learner receives a result summary and suggested next actions.
- Alternate path: Interrupted sessions may save resumable state where the relevant story explicitly supports it.
- Success: Quiz results are persisted and learner progress is updated safely.

## `UF-006` Error Review Loop

- Trigger: A learner opens the Error Notebook or a review-due reminder.
- Steps:
  1. The system loads learner-specific mistakes due for review.
  2. The learner retries questions, vocabulary, or listening fragments tied to those mistakes.
  3. The system updates review counts, mastery state, and next review date.
  4. The roadmap can increase review emphasis when mistakes repeat.
- Alternate path: If no errors are due, the system shows completion and offers normal practice tasks.
- Success: The learner can revisit mistakes and push them toward mastery.

## `UF-007` Content Publishing

- Trigger: A content editor or admin creates or updates learning content.
- Steps:
  1. The editor enters content, metadata, and source or license details in the CMS.
  2. The system validates role access, required fields, and content status.
  3. Draft content may be reviewed, then published to public or learner surfaces as appropriate.
  4. The action is auditable when performed through privileged admin flows.
- Alternate path: AI-assisted draft content remains unpublished until a human review step approves it.
- Success: Content becomes available through approved channels with traceable metadata.

## `UF-008` TOEIC Secure Submission

- Trigger: A learner starts a TOEIC practice, mini test, or full test session.
- Steps:
  1. The system creates a timed session and keeps answer keys server-side.
  2. The learner answers questions while server-side timing and suspicious-event capture remain active.
  3. The learner submits the session or the timer expires.
  4. The system validates timing, scores the attempt, and reveals results only after finalization.
- Alternate path: Suspicious behavior may be logged for later review without blocking every attempt.
- Success: TOEIC results are produced from a server-validated session with protected answers.

## `UF-009` AI Quota Handling

- Trigger: A learner requests AI writing, AI speaking, or AI explanation assistance.
- Steps:
  1. The backend AI Gateway validates entitlement, daily quota, and abuse rules.
  2. The gateway selects the correct provider or model path and records usage metadata.
  3. The system returns a structured result or a quota-exceeded response.
  4. Admin reporting can inspect quota consumption and cost trends.
- Alternate path: If quota is exhausted, the learner receives a clear limit response and optional upgrade messaging without bypassing policy.
- Success: AI access is policy-controlled, auditable, and never called directly from the frontend.
