# Deployment And Migration Safety Plan

## Scope

This project does not permit CI or autonomous story loops to deploy production code,
promote `main`, or run schema-changing database commands. Delivery automation is
limited to validation and build evidence until an owner explicitly approves a release.

## Expand Migrate Contract Policy

1. Expand
   - Add backward-compatible schema first.
   - New tables, nullable columns, additive indexes, and dual-write code paths must be
     safe to ship before application cutover.
   - Expand steps must not remove or rename production fields relied on by the current
     application version.
2. Migrate
   - Backfill or data-copy steps must run only through reviewed, owner-approved
     procedures.
   - Large migrations require batching, observability, and a written stop condition.
   - Application rollout must tolerate partial backfill while the migration is in
     progress.
3. Contract
   - Destructive cleanup happens only after the new application path is stable and the
     old path is no longer serving traffic.
   - Dropping columns, tables, constraints, or historical compatibility paths requires
     explicit owner approval and a rollback assessment.

## Review Requirements

- Every migration plan requires code review plus architecture/database review when the
  change affects persistence shape, data ownership, or operational recovery.
- Review must confirm the exact command surface: validate-only in CI, no reset, no
  seed, no introspection, no production or shared database access.
- Review must verify that application changes remain compatible with the expand phase
  before any contract phase is considered.

## Rollback Expectations

- Each migration proposal must define how to stop rollout, disable new writes, and
  restore the previous application path.
- Rollback instructions must identify which steps are reversible and which require data
  restoration from backup.
- If rollback depends on manual data repair, that risk must be stated before approval.

## Backup Prerequisites

- Destructive or irreversible migrations require a fresh verified backup before
  execution.
- Backup verification must confirm the restore path, ownership of the backup artifact,
  and the recovery point objective accepted by the owner.
- No destructive migration may start without a named operator and confirmed recovery
  window.

## Owner Approval Policy

- Destructive migrations are owner-controlled changes.
- Required owner approval includes dropping or renaming schema objects, irreversible
  data rewrites, bulk deletes, and any action that could affect shared or production
  data availability.
- CI, local validation, and autonomous story execution may validate Prisma schema
  syntax only; they must never migrate, reset, seed, connect to shared databases, or
  promote a release.
