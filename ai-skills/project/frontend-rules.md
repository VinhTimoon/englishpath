# EnglishPath Frontend Rules

- Read `docs/05_FRONTEND_ARCHITECTURE.md` and `docs/09_UI_DESIGN_SYSTEM.md`.
- Keep route files thin; compose widgets/features and keep business logic outside `app`.
- Respect imports: `app -> widgets -> features -> entities -> shared`.
- Prefer Server Components and isolate the smallest necessary client boundary.
- Use TanStack Query for server state, URL params for shareable state, local state for
  ephemeral interaction, and Zustand only for cross-feature client state.
- Use React Hook Form with Zod and map backend field errors into forms.
- Use shared semantic tokens and accessible UI primitives; no random colors/gradients.
- Follow the EnglishPath warm editorial green/amber direction, not purple SaaS defaults.
- Build mobile-first with visible focus and 44px touch targets.
- Every page or async section handles loading, empty, error, and success states.
- Do not expose secrets, provider details, or sensitive answer data.
- Run lint, typecheck, tests, API e2e when relevant, and build before reporting done.
