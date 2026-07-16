# API Contract

## GET `/api/v1/health`

Checks whether the API is running and whether the database is reachable through Prisma.

### 200 OK

```json
{
  "status": "ok",
  "api": "running",
  "database": "connected",
  "timestamp": "2026-07-16T00:00:00.000Z"
}
```

### 503 Service Unavailable

```json
{
  "status": "error",
  "api": "running",
  "database": "disconnected",
  "timestamp": "2026-07-16T00:00:00.000Z"
}
```
