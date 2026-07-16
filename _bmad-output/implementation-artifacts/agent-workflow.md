# Agent Workflow

## Implementation Loop

1. Read the current story.
2. Read `AGENTS.md`.
3. Read `ai-skills/routing/skill-router.md`.
4. Load only the relevant BMAD artifacts, docs, and skills.
5. Check `allowed_paths` and `forbidden_paths`.
6. Implement only the current story scope.
7. Start loops only from a clean, up-to-date local `dev` branch.
8. Keep story folder lifecycle and frontmatter status synchronized.
9. Run verification commands.
10. Merge only into `dev`; never let automation touch `main`.
11. Report completed or blocked status honestly.

## Blocking Rule

If the change requires a forbidden path, stop and mark the story blocked.
