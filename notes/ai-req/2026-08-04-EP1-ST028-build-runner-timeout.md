# AI Request: EP1-ST028 Codex Build Execution Cap

Date: 2026-08-04
Story: EP1-ST028
Category: infrastructure / high-risk security delivery
Status: awaiting owner or harness decision

## Decision Needed

Approve a Codex execution path that permits the high-risk EP1-ST028 build to return
a terminal result beyond the observed 240-second model/CLI window, or approve a
different supervised execution path that preserves the mandatory full review and
security gates.

## Reason

The local harness passes `1200000ms` to the build child process and a direct
repository subprocess survived `245006ms`. The EP1-ST028 Codex build nevertheless
returned no fresh terminal artifact at about `237.1s`, after generating partial
RBAC/audit/Prisma changes. The loop correctly stopped before checks, review, or merge.

## Impact

- Admin/editor authorization, privileged audit, and additive Prisma work remain
  unmerged and unverified.
- The high-risk story cannot be treated as done without full quality/security gates.
- WIP commit `7a5c909` is preserved only on `story/ep1-st028` and must not be merged.
- `main`, credentials, shared data, and production deployment were not changed.

## Options

1. Recommended: remove/raise the external Codex model/CLI cap for this high-risk
   build, then rerun from clean synchronized `dev` with mandatory review and gates.
2. Approve a supervised local implementation/review route that does not bypass the
   story lifecycle, security checks, migration validation, or owner approval policy.
3. Defer EP1-ST028 until the harness owner supplies a supported execution path.

## Continue After Approval

1. Confirm the supported execution path and its effective timeout evidence.
2. Start from clean, synchronized `dev`; do not resume or merge `7a5c909` directly.
3. Run planning/build/checks/full review/checks/story verification.
4. Merge only a fully passing branch fast-forward into `dev`; never touch `main`.
