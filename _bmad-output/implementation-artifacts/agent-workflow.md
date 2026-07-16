# Agent Workflow

## Implementation Loop

1. Read the current story.
2. Read `AGENTS.md`.
3. Read `ai-skills/routing/skill-router.md`.
4. Load only the relevant BMAD artifacts, docs, and skills.
5. Check `allowed_paths` and `forbidden_paths`.
6. Implement only the current story scope.
7. Run verification commands.
8. Report completed or blocked status honestly.

## Blocking Rule

If the change requires a forbidden path, stop and mark the story blocked.
