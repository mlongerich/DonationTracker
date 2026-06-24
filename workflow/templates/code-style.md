---
author: claude
created: {{DATE}}
updated: 2026-04-30
tags: [project, process, code-style]
---

# {{PROJECT NAME}} — Code Style Guide

Living document. Starts with universal principles and minimal tooling config. Updated whenever a new pattern emerges, an anti-pattern is identified, or a refactoring decision is made. Reference this document before writing any code in this project. Consult it when reviewing code before marking a ticket done.

---

## Universal principles

**SOLID**
Each module or class has one reason to change (Single Responsibility). Code is open for extension but closed for modification (Open/Closed). Subtypes can substitute for their base types without breaking callers (Liskov). Prefer many focused interfaces over one general one (Interface Segregation). Depend on abstractions, not concretions (Dependency Inversion).

**DRY — Don't Repeat Yourself**
Every piece of knowledge has a single, unambiguous representation in the codebase. When the same logic appears in two places, one of them is wrong. Extract it.

**KISS — Keep It Simple**
The simplest solution that works is the right solution. Complexity that the current problem does not require is not cleverness — it is future debt.

**YAGNI — You Aren't Gonna Need It**
Do not build for hypothetical future requirements. Build for what the spec says now. If a future requirement arrives, add it then with full context.

**Progressive refactoring**
When a new pattern is established, do not go out of scope to back-apply it across the codebase. Refactor a file when it is already being touched for a ticket or epic. If a refactor logically requires updating a second file, update that file too. Files outside the current scope are acceptable risk and will be addressed naturally over time as they are next touched. Most things get fixed this way. The rest are a known trade-off, not a problem.

The exception is a failing test. If a change causes a test to break in a file not originally in scope, that test has revealed an implicit dependency or coupling that the plan did not see. That file is now in scope. Fix the root cause — do not patch the test to silence it. Log what the test exposed so the coupling is visible going forward.

---

## Linter and formatter

All code must pass the linter and formatter before a ticket is marked done. Format before every commit. If the formatter and linter conflict, the formatter wins.

| Tool | Purpose | Command |
|------|---------|---------|
| {{tool}} | {{linting or formatting}} | `{{command}}` |

Configuration file: `{{path to config file, e.g. pyproject.toml, .eslintrc, etc.}}`

---

## Naming conventions

Document as the project develops. Capture decisions that are not obvious from the language defaults.

| Context | Convention | Example |
|---------|-----------|---------|
| {{e.g. module names}} | {{convention}} | {{example}} |

---

## Design patterns in use

Add entries as patterns emerge during implementation. Each entry names the pattern, shows where it appears in the codebase, and explains why it was chosen. Future code in the same area should follow the same pattern unless there is a documented reason not to.

| Pattern | Where used | Why |
|---------|-----------|-----|
| {{pattern name}} | `{{file:line}}` | {{reason}} |

---

## Code smells to watch for

Start with the general list. Add project-specific smells as they are identified during implementation or refactoring.

**General**
- Long method or large class — a single unit is doing too much
- God object — one module knows too much and does too much
- Shotgun surgery — one logical change requires many small edits across unrelated files
- Feature envy — a function uses another module's data more than its own
- Data clumps — groups of values that always travel together but have no type
- Primitive obsession — using raw strings, ints, or dicts where a named type would clarify intent
- Duplicated code — same logic in two places
- Dead code — unreachable or unused code left in the codebase
- Magic values — unexplained literal strings or numbers inline in logic

**Project-specific**
{{Add as identified. Each entry should state the smell, where it tends to appear, and the preferred alternative.}}

---

## Refactoring log

Record when a significant refactoring happens: what changed, why, and what pattern it introduced or removed. This keeps the history readable without relying on git blame alone.

| Date | What changed | Why | Commit |
|------|-------------|-----|--------|
| {{date}} | {{description}} | {{reason}} | {{hash}} |
