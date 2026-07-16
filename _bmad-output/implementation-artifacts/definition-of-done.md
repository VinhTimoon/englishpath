# Definition of Done

A story is done only if:

## Product

- Acceptance criteria are satisfied.
- Out-of-scope items are not implemented.

## Frontend

- Uses FSD-style structure.
- Uses shared UI components.
- Has loading, empty, error, and success states.
- Is mobile responsive.
- Follows the UI design system.

## Backend

- Uses NestJS modular N-layer.
- Controller has no business logic.
- DTO validation exists.
- Swagger/OpenAPI is updated if API changes.
- Protected endpoints have guards where needed.

## Database

- Prisma schema changes are intentional.
- Migration is generated if schema changed.
- Database docs are updated if schema changed.

## Security

- No secrets in frontend.
- No API keys committed.
- TOEIC answer keys are not exposed before submission.
- Users can access only their own data.

## Quality

Run:
- pnpm lint
- pnpm typecheck
- pnpm test
- pnpm build

If any command is missing or failing, the story is not done.