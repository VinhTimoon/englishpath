# EnglishPath UI Design System

## Visual Direction

EnglishPath should feel like a calm, capable study companion for Vietnamese learners:
editorial clarity, warm encouragement, visible progress, and serious learning value.
It must not resemble a generic purple SaaS dashboard or a children-only gamified app.

Use off-white paper-like surfaces, ink text, fresh green progress accents, and warm
amber highlights. Gradients are rare and atmospheric, never the default section fill.

## Color Tokens

```text
canvas:        #F7F4EC
surface:       #FFFDF8
surface-muted: #EEF2E8
ink:           #17302A
ink-muted:     #61706B
brand:         #176B52
brand-strong:  #0D4F3C
accent:        #E9A23B
info:          #2563A6
success:       #2F7D4A
warning:       #B66A16
danger:        #B83A3A
border:        #D9DED4
```

Use semantic CSS variables. Do not insert arbitrary hex values inside components.
Text/background pairs must meet WCAG AA contrast.

TOEIC practice uses these tokens for its setup, progress, answer, and final
states. Filter controls are rendered only from the authenticated server catalogue;
empty and unavailable-content states remain actionable without presenting invented
parts, topics, or difficulty labels.

## Typography

- Display: a characterful serif such as `Newsreader` for major public headings.
- UI/body: a highly readable sans such as `Manrope`.
- Vietnamese diacritics must render correctly at every weight.
- Body text uses comfortable line height; learning passages target 60-72 characters.
- Use sentence case. Avoid all-caps paragraphs and excessive bold text.

## Spacing And Shape

- Base spacing rhythm: 4, 8, 12, 16, 24, 32, 48, 64, 96.
- Content width: 72rem public pages; 80rem application shells; narrower reading columns.
- Radius: 10px controls, 16px cards, 24px feature panels. Pills only for tags/status.
- Shadows are soft and sparse; hierarchy should primarily come from spacing and borders.

## Responsive Layout

- Design from 360px upward.
- Common breakpoints: 640px, 768px, 1024px, 1280px.
- Mobile keeps the primary action visible and avoids horizontal scrolling.
- Dense learning dashboards collapse progressively rather than shrinking text.
- Touch targets are at least 44x44px.

## Components And States

Every reusable component documents default, hover, focus-visible, active, disabled,
loading, error, and success states where applicable.

- Primary buttons use brand green and one clear action label.
- Secondary buttons use surface/border treatment.
- Cards group one idea or action; avoid nested card stacks.
- Inputs keep labels visible and place errors beside the affected field.
- Progress indicators show both current position and meaningful next step.
- Empty states explain why the screen is empty and offer one useful action.
- Skeletons approximate final layout; do not use spinners for whole-page loading.

## Public And Learning Surfaces

Public pages use stronger editorial typography, proof, learner outcomes, and a clear
conversion path. Avoid interchangeable hero/stat/logo-section templates.

Learning surfaces reduce decoration, prioritize the current task, and keep progress,
feedback, and navigation predictable. Correctness feedback must use text/icon cues in
addition to color.

## Motion

- Use motion to explain entry, progress, and state change.
- Prefer one page-load reveal and purposeful staggered groups.
- Typical duration: 160-320ms with natural easing.
- Respect `prefers-reduced-motion`; never gate information behind animation.
- Avoid perpetual motion, bouncing CTAs, and decorative parallax in study flows.

## Accessibility

- Visible focus is mandatory.
- Do not communicate status by color alone.
- Preserve zoom to 200%, reduced motion, screen-reader labels, and logical tab order.
- Icons that carry meaning require accessible names; decorative icons are hidden.

## Timed TOEIC test

The timed-test shell uses the approved canvas, surface, green brand, amber focus,
ink, muted text, border, and semantic danger tokens. The question flow is
mobile-first from 360px, uses visible focus and 44px controls, and exposes text
progress alongside the native progress indicator. Server time is displayed as
`MM:SS`; it is not a client authorization mechanism. Status feedback uses live
regions without a page-wide `role="alert"`, preventing collisions with the Next
route announcer. Reduced motion disables the loading animation.

Timed-test analysis uses the existing result panel tokens and stays readable at
360px without horizontal scrolling. The learner sees aggregate score, accuracy,
Part/skill summaries, weakest areas, and server-derived time use only after
finalization. Analysis errors preserve the result card and expose a keyboard
operable retry; no official TOEIC conversion or per-question correctness is
shown in this surface.

The Error Notebook uses the same learning-surface tokens and has explicit loading,
empty, error, and success states. TOEIC entries carry a text source label and a
keyboard-operable remediation link; bounded previous/next controls remain usable
at 360px and status is never communicated by color alone.

TOEIC remediation packs use the same panel surface and semantic link treatment.
Each pack exposes its purpose and related Part/skill as text, with visible focus
and no color-only meaning. A missing pack is an explicit empty state;
unavailability does not hide the score or analysis. Pack links may deep-link the
existing practice page, which accepts only server-approved catalogue filters.

## EP3-ST007 learner player

The library item view is mobile-first and exposes loading, unavailable,
error/retry, empty-transcript, and success states. Resume and completion are
server-confirmed; browser state is limited to transient draft UI. Media
controls are not rendered as playable unless the API supplies an authorized
safe delivery reference. Transcript timestamp controls are labelled,
keyboard-operable, visibly focused, and usable at narrow widths.

## EP3-ST008 listening drill

The drill uses explicit loading, unavailable/empty, retryable error, active,
and submitted-result states. Options are labelled buttons with visible focus;
the result is expressed as text and score, not color alone. Once submitted,
choices are disabled and the UI renders only the server result.
