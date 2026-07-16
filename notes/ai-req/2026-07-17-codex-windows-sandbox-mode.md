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

## Decision Needed

Choose whether project automation may invoke implementation/debug phases with
`--sandbox danger-full-access`.

## Options

1. Keep `workspace-write`: safest OS boundary, but the outer manager must continue
   applying patches and loop phases cannot be fully autonomous on this Windows host.
2. Allow `danger-full-access` for build/debug phases: restores likely autonomous
   editing, but Codex technically receives filesystem access beyond the project even
   though prompts and post-run path verification still restrict intended changes.
3. Move loop execution to WSL/container/VM: preserves a real project boundary but
   requires environment setup outside this repository.

## Impact

Until a decision is made, stories can still be completed safely through the current
bounded loop plus outer-manager recovery, but unattended continuous implementation
is not reliable.
