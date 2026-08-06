# EnglishPath Frontend Architecture

## Principles

- Next.js App Router owns routing, metadata, layouts, and server composition.
- Route files are thin. They do not contain reusable UI, business rules, form logic,
  API clients, or cross-page state.
- Organize domain behavior with FSD-style layers: `app`, `widgets`, `features`,
  `entities`, and `shared`.
- Prefer Server Components. Add `"use client"` only at the smallest interactive boundary.
- Build mobile-first and make loading, empty, error, and success states explicit.

## Target Structure

```text
src/
  app/                 routes, layouts, metadata, route loading/error boundaries
  widgets/             page sections composed from features/entities/shared UI
  features/            user actions and use cases
  entities/            domain models and domain-facing UI
  shared/
    api/               transport client, errors, request helpers
    config/            public runtime configuration
    lib/               framework-agnostic utilities
    ui/                reusable accessible primitives
```

Layers may import only downward: `app -> widgets -> features -> entities -> shared`.
Avoid feature-to-feature imports. Extract genuinely shared behavior instead.

## Route And Composition Rules

- `page.tsx` selects data and composes widgets; target roughly one screen of readable code.
- `layout.tsx` provides stable chrome and providers, not page-specific business logic.
- Use `loading.tsx`, `error.tsx`, and `not-found.tsx` where route-level states matter.
- Public landing sections belong in widgets. Learning actions belong in features.
- Shared UI must not import entities or features.

### Landing Page Widget Stack

The first landing page should compose these widgets in order:

1. `PublicHeader`: brand, learning paths, blog, sign-in, primary start CTA.
2. `Hero`: Vietnamese learner problem, concrete daily-learning promise, primary and
   secondary actions, and a product-learning preview rather than a fake dashboard.
3. `LearningLoop`: vocabulary, quiz, sentence, and progress as one repeatable day.
4. `PathPreview`: example 30/60/90/120-day routes by learner goal.
5. `OutcomeProof`: transparent free-first value, sample content, and measurable progress.
6. `HowItWorks`: choose goal, receive daily path, practice, review mistakes.
7. `ContentPreview`: useful blog/news or learning resources for SEO and trust.
8. `FinalCallToAction`: one clear next step with no pricing pressure.
9. `PublicFooter`: product, resources, policies, and contact links.

Each widget owns its section composition and may use shared UI primitives. The route
only assembles the widgets and page metadata.

## Server And Client Boundaries

- Fetch initial public/SEO data in Server Components.
- Keep secrets and privileged API calls on the server.
- Use Client Components for browser APIs, forms, animation, and interactive state.
- Pass serializable data across the server/client boundary.
- Do not turn an entire route into a Client Component for one interactive control.

## Public SEO Boundary

- `shared/seo` owns the canonical origin and site-wide metadata constants. The local
  origin is `http://localhost:4173`; deployment configuration must be a bare HTTP(S)
  origin without whitespace, credentials, path, query, hash, or trailing slash.
- App Router route modules own route-specific canonical, Open Graph, and Twitter
  metadata. SEO data renders on the server and must not require hydration.
- `sitemap.ts` and `robots.ts` use the same origin resolver. The sitemap includes only
  the landing page, blog index, and entries from the published article collection.
- Public article collections are read-only. Draft filtering and CMS publication states
  will extend this boundary rather than introducing a second route inventory.

## Data And State

- TanStack Query owns asynchronous client-side server state, caching, and mutations.
- URL search params own shareable filters, pagination, and tabs.
- Local React state owns ephemeral component interaction.
- Zustand is reserved for cross-feature client state that is not server state.
- Do not duplicate the same value in Query cache, Zustand, and local state.
- API access goes through `shared/api`; components do not scatter raw `fetch` calls.

The public vocabulary explorer follows this boundary directly: `shared/api` validates
the local/runtime `/api/v1` origin, applies a finite timeout, and normalizes transport
failures; the vocabulary feature owns strict envelope parsing, query keys, and
URL-search-parameter filters. The widget owns composition and operational states, while
the `/vocabulary` route remains a metadata and server-content boundary.

## Forms And Validation

- Use React Hook Form for form state and submission lifecycle.
- Use Zod schemas for client validation and inferred input types.
- Backend validation remains authoritative; map field errors back to the form.
- Disable duplicate submissions and provide clear pending, success, and failure feedback.

## Error Handling

- Normalize transport errors in `shared/api`.
- User messages explain the next action and never expose stack traces or provider details.
- Error boundaries handle render failures; inline states handle expected request failures.
- Authentication and authorization failures are distinct from empty data.

## Performance And Accessibility

- Use semantic HTML before custom roles.
- All controls require keyboard access, visible focus, labels, and adequate target size.
- Preserve heading order and meaningful link text.
- Optimize images with Next.js and avoid layout shift.
- Lazy-load expensive client-only experiences; do not defer primary learning content.

The TOEIC practice route loads a server-owned catalogue before rendering filters,
keeps the active question index tied to the acknowledged server count, and sends
start/answer/submit requests through `shared/api`. It exposes explicit loading,
empty, error, active, pending, and final states without browser-side filtering,
reordering, or skipping of the question snapshot.

## Testing

Follow `docs/10_TEST_STRATEGY.md`. Test domain behavior at feature/entity boundaries,
and reserve browser e2e for critical learner journeys.

## Timed TOEIC test UI

`/toeic/test` is a thin route that composes the `toeic-timed-test` widget. The
feature API maps only the approved EP2-ST007 routes, while the entity parser
projects safe session and question fields from `unknown` responses. The widget
uses the server's acknowledged answer count and `remainingSeconds`; local
storage contains only the client session ID and active session ID. A local
interval is presentation-only and expiry always reconciles through the result
endpoint. Setup, resume, active, retryable error, insufficient-content,
expired, submitted, and final states are explicit and keyboard accessible.
