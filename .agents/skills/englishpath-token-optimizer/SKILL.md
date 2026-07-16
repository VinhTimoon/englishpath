---
name: englishpath-token-optimizer
description: Keep EnglishPath story context focused and within the project token budget.
---

# EnglishPath Token Optimizer Skill

Use this skill before planning or implementing any story.

## Main Rule

Do not load the whole repository unless absolutely required.

## Context Loading Priority

Always load:
1. current story
2. AGENTS.md
3. skill-router.md
4. only relevant docs
5. only relevant source files

## Context Budget

Small story:
- 3 to 5 context files

Medium story:
- 5 to 8 context files

Large story:
- split into smaller stories

## Do Not Load

Avoid loading:
- node_modules
- dist
- .next
- generated build outputs
- unrelated modules
- all BMAD skills
- all project docs

## When Context Is Too Large

Do:
- summarize first
- ask for narrower scope
- split story
- inspect file tree before opening files

Do not:
- continue with unclear context
- rewrite unrelated files
- solve multiple features in one story

## Loop Engineering Rule

One story.
One branch.
One implementation scope.
One verification report.
