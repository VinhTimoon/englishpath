# Backend Architecture

## Health Module

- Location: `apps/api/src/modules/health`
- Structure: controller, service, repository, and DTO files follow the backend N-layer rule.
- Route: `GET /api/v1/health`
- Database probe: `HealthRepository` checks connectivity through `PrismaService` with a minimal query and does not expose connection details.
- Response shape: `status`, `api`, `database`, and `timestamp`
