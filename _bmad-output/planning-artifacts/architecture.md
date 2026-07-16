# Architecture Governance Spine

## Decision Model

- BMAD creates planning and implementation guidance.
- Stories define executable scope.
- Codex implements only within the active story boundary.

## Control Points

- `AGENTS.md` defines global operating rules.
- `ai-skills/routing/skill-router.md` defines context-loading rules.
- `_bmad-output/planning-artifacts/**` defines planning baseline.
- `_bmad-output/implementation-artifacts/**` defines execution quality gates.

## Invariants

- One story at a time
- Minimum required context only
- No forbidden-path changes
- Honest verification reporting
