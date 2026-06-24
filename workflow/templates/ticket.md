---
author: both
created: {{DATE}}
updated: 2026-05-14
tags: [project, ticket]
---

# Epic {{N}} — T{{M}}: {{Name}}

**Parent epic:** [[epic-N-name]]
**Status:** Not started
**Depends on:** {{ticket or epic, or "none"}}
**Unblocks:** {{ticket or epic, or "none"}}

---

## Business context
*(PO / BA)*

**Problem / user story**
{{What user need does this ticket address? One or two sentences.}}

**Scope boundary**
Delivers: {{one sentence}}
Does not deliver: {{one sentence}}

**Acceptance criteria**
{{Specific, testable, user-facing conditions. No code. Each criterion is independently verifiable.}}

---

## UX requirements
*(Designer / UX)*

**Interaction pattern**
{{Which named pattern from `dashboard-design-guide.md` applies? If no pattern exists, describe the expected interaction in plain language. New patterns must be added to the guide before the ticket closes.}}

**Visual requirements**
{{Layout, colour, or feedback requirements. Reference existing design tokens and CSS classes where possible — introduce new ones only when existing ones genuinely don't fit.}}

*Omit this section if the ticket has no user-facing UI.*

---

## Technical constraints
*(Tech Lead / Architect)*

**API / data contracts**
{{Which endpoints are used. Expected request/response shape. New endpoints require justification.}}

**Patterns to follow**
{{Established codebase patterns this ticket must respect.}}

**Architecture decisions**
{{Design choices resolved at the TL level. Silence means developer discretion.}}

*Omit this section if there are no meaningful constraints beyond "follow existing patterns."*

---

## Quality requirements
*(QA)*

**Test scenarios**
{{What must be tested. Describe in plain language — not function names or test file paths.}}

**Edge cases**
{{Known edge cases the implementation must handle.}}

---

## Security considerations
*(Security Champion)*

{{Input validation requirements, trust boundaries, injection risks. Omit section if not applicable.}}

---

## Implementation notes
*(Developer — filled during work)*

{{Decisions made, surprises encountered, shortcuts taken under pressure. Leave blank before work starts.}}

---

## Post-ticket check

- [ ] Acceptance criteria met — verify each criterion.
- [ ] All automated tests for this ticket pass.
- [ ] If this ticket touched the dashboard UI: every interaction verified against `dashboard-design-guide.md`. New patterns added to the guide before committing.
- [ ] If any test broke during this ticket: root cause fixed (not the test). Finding logged.
- [ ] **Bubble up** — Did this ticket reveal anything that changes the epic scope, spec, business logic, or future ticket scope? If yes: update the epic file, `super-spec.md`, or affected ticket files now. Do not carry this forward.
- [ ] **Diffuse down** — Did this ticket establish new patterns, API contracts, or architectural decisions that the next ticket depends on? If yes: update the next ticket's Technical constraints section now, before work on it begins.
- [ ] `notes.md` updated with anything unexpected.
- [ ] Work committed.
- **Notify Michael: state which ticket is done, what was delivered, and what the next ticket is. Stop here.**
