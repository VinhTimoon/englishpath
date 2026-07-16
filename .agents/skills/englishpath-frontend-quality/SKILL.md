# EnglishPath Frontend Quality Skill

Use this skill when working on:
- Next.js pages
- learning dashboard
- vocabulary UI
- quiz card UI
- TOEIC exam shell
- admin screens
- shared UI components

## Goals

Frontend must feel:
- clean
- friendly
- modern
- lightly gamified
- not childish
- not corporate-heavy

## Required UI States

Every page or feature must handle:
- loading
- empty
- error
- success

## Layout Rules

- Mobile-first responsive layout.
- Use clear visual hierarchy.
- Use consistent spacing.
- Avoid dense screens.
- Use cards for learning units.
- Use progress indicators in learning flows.
- Use one primary action per screen section.

## Design Rules

- Do not invent random colors.
- Do not use inline styles.
- Do not create random gradients.
- Use existing shared UI components before creating new ones.
- Use Tailwind utility classes consistently.
- Keep route files thin.

## Component Rules

Good component structure:
- shared/ui for reusable atomic components
- entities for domain display blocks
- features for user actions
- widgets for larger sections
- views for page composition

## Review Checklist

Before marking done:
- Is the layout responsive?
- Are loading/empty/error states implemented?
- Is the page readable on mobile?
- Are colors consistent with EnglishPath design?
- Is business logic outside route files?