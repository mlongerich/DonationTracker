---
author: claude
created: 2026-06-08
updated: 2026-06-08
---
# {{Project Name}}

{{One-paragraph description of what this project does and who it is for.}}

---

## Project docs

All project management and spec files live in `project/`:

| File | Purpose |
|---|---|
| `project/project.md` | Status, next action, blockers |
| `project/development-process.md` | Six-stage gate model and working agreements |
| `project/business-logic-qa.md` | Q&A rounds and resolved decisions |
| `project/super-spec.md` | Unified spec — authoritative for all code |
| `project/code-style.md` | Code patterns and anti-patterns |
| `project/dashboard-design-guide.md` | UI interaction and design tokens |
| `project/implementation-plan.md` | Epic sequence |
| `project/epics-and-tickets/` | Epic and ticket files |

## Templates

`templates/` contains starters for ADRs, epics, and tickets. Always use these rather than copying from existing files.

## Claude skills

`skills/` contains skill files that Claude loads on demand for structured workflows:

- `skills/adr/` – create and write ADRs
- `skills/epic/` – create and detail epics
- `skills/ticket/` – create and refine tickets
- `skills/writing-style/` – prose rules for all `.md` files

## Getting started

1. Fill in the `{{placeholders}}` in `CLAUDE.md` and this README.
2. Work through the stages in `project/development-process.md`.
3. Use `/epic`, `/ticket`, and `/adr` Claude skills as you build.
