---
author: both
created: {{DATE}}
updated: 2026-05-30
tags: [project, epic]
---

# Epic {{N}} — {{Name}}

**Project:** [[development-process]]
**Status:** Not started
**Depends on:** {{epic or "none"}}
**Unblocks:** {{epic or "none"}}

---

## Business context
*(PO / BA)*

**Problem**
{{What user problem or gap does this epic address?}}

**Goal**
{{What does success look like from a user perspective?}}

**Scope boundary**
Delivers: {{one sentence}}
Does not deliver: {{one sentence}}

**Acceptance criteria**
{{Specific, testable, user-facing conditions for epic completion.}}

---

## UX requirements
*(Designer / UX)*

**UX principles for this epic**
{{High-level UX goals or constraints. What must the user experience feel like? Reference `dashboard-design-guide.md` patterns where applicable.}}

**Key interactions**
{{New interaction patterns introduced by this epic. Must be documented in `dashboard-design-guide.md` before the epic closes.}}

*Omit this section if the epic has no user-facing UI.*

---

## Technical constraints
*(Tech Lead / Architect)*

**Thin slice**
{{One sentence: the end-to-end behaviour this epic delivers from input to output.}}

**Architecture decisions**
{{Design decisions made before implementation begins — library choices, data model, API contracts, major structural changes. No code samples. No implementation instructions. State what was decided, not how to write it.}}

**Dependencies**
{{Technical dependencies on other epics, libraries, or external contracts.}}

**Spike (if needed)**
{{State the unknown, the smallest test to resolve it, and the finding. Mark "none" if no epic-level unknowns exist.}}

---

## Quality requirements
*(QA)*

**Testing strategy**
{{Which test types apply. What coverage must exist before the epic closes.}}

**Testing requirements**
{{Specific automated tests that must exist and pass. Test files affected.}}

---

## Security considerations
*(Security Champion)*

{{Epic-level security requirements — input validation, trust boundaries, data exposure risks. Omit if not applicable.}}

---

## Tickets

Notify Michael that tickets are required and name them. Future tickets carry a title and one-liner only — detail is added just-in-time. The first ticket is refined to full detail immediately before work begins by reading the codebase first. Stop after each ticket completes and wait for Michael before starting the next.

Each ticket gets its own file created from `templates/ticket.md`, placed in the same `epics-and-tickets/` folder as the epic file. Name ticket files `epic-N-tM-kebab-name.md`.

| Ticket | Scope | Signal | File | Status |
|--------|-------|--------|------|--------|
| T1 | {{scope}} | {{test signal}} | [[epic-N-t1-name]] | Not started |

**Files to create or modify**
{{List every file. Confirm none are outside the epic boundary.}}

---

## Post-epic gate

- [ ] All ticket post-ticket checks complete — every ticket in this epic has all post-ticket check items ticked.
- [ ] All tests pass — full suite, not just touched files.
- [ ] Linter and formatter pass — `ruff check --fix` and `black` run across all files touched in the epic.
- [ ] **Refactor gate complete** — dead code removed; cross-ticket duplication resolved (extracted only if used twice within epic scope); no speculative abstractions; refactor commit separate from implementation commits. Before running: check `code-style.md §Code smells to watch for`. After running: update `code-style.md §Refactoring log` with any changes made. See `development-process.md §Step 6` for the full process.
- [ ] Code style guide updated — backend patterns documented in `code-style.md`; UI interaction patterns documented in `dashboard-design-guide.md`. Patterns used consistently across multiple files must be documented.
- [ ] Spec drift check — any findings contradicting or extending the spec updated in `super-spec.md` and `business-logic.md` before next epic begins. Contradictions require approval.
- [ ] **Bubble up** — Did this epic reveal anything that changes the implementation plan, future epic scope or ordering, or the overall product spec? If yes: update `implementation-plan.md` and affected epic files now. Do not carry this forward.
- [ ] **Diffuse down** — Did this epic establish new architecture decisions, API contracts, data models, or patterns that future epics depend on? If yes: update the next epic's Technical constraints section and any affected ticket stubs now, before that work begins.
- [ ] Retrospective note logged in `notes.md` §"{{DATE}} — Epic {{N}} retrospective".
