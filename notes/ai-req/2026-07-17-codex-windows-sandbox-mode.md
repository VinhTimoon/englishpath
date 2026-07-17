# AI Request: Codex Windows Sandbox Mode

## Category

security / environment

## Summary

Codex CLI `workspace-write` phases can read and execute inside the EnglishPath
repository, but their `apply_patch` tool cannot initialize under the configured
Windows `unelevated` sandbox.

## Evidence

```text
windows unelevated restricted-token sandbox cannot enforce split writable root
sets directly; refusing to run unsandboxed
```

- Codex CLI version: `0.144.5` (latest reported by `codex doctor`).
- `codex doctor`: 17 checks passed, no failures.
- The failure reproduced in EP0-ST006 build, EP0-ST007 plan, and review fixes.
- Outer project-scoped commands and patches work normally.

## Attempts

- Retried single-file and multi-file `apply_patch`.
- Retried project-relative and absolute paths.
- Verified project ACL grants the current user modify access.
- Verified project is trusted and Codex installation is healthy.
- Kept `--sandbox workspace-write`; no global/admin configuration was changed.

## Decision Recorded

On 2026-07-17, the project owner approved `--sandbox danger-full-access` for
implementation/debug phases after reviewing the risks. Planning and review remain
`read-only`; `workspace-write` is no longer used by the loop on this Windows host.

## Options

1. Keep `workspace-write`: safest OS boundary, but the outer manager must continue
   applying patches and loop phases cannot be fully autonomous on this Windows host.
2. Allow `danger-full-access` for build/debug phases: restores likely autonomous
   editing, but Codex technically receives filesystem access beyond the project even
   though prompts and post-run path verification still restrict intended changes.
3. Move loop execution to WSL/container/VM: preserves a real project boundary but
   requires environment setup outside this repository.

## Applied Controls

- Sandbox mode is explicitly allowlisted by phase: `plan/review` are `read-only` and
  `build/debug` are `danger-full-access`.
- A full-access phase is rejected unless it runs from the repository root whose
  package name is `englishpath`.
- A full-access phase is rejected unless its prompt includes a story ID plus
  non-empty `allowed_paths` and `forbidden_paths`.
- Existing story path verification, quality gates, review gates, and `dev`-only
  integration remain mandatory. The loop must never merge directly to `main`.
- No administrator, operating-system, or global Codex configuration is changed.

## Residual Risk

`danger-full-access` is not an operating-system boundary. A malfunctioning or
misdirected implementation/debug agent technically can read or modify files outside
the repository using the current user's permissions, and Git checks cannot detect
such external writes. WSL, a container, or a VM remains the recommended future
option when hard filesystem isolation is required.

## Outcome

The Windows sandbox blocker is resolved for the project loop under the controls
above. If any guard fails, the phase must stop before Codex CLI is invoked.
