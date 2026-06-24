---
tags: [skills, ticket, development-process]
author: claude
created: 2026-06-08
updated: 2026-06-08
---

# Skill: Ticket

Create or refine a ticket for this project. The template is the source of truth – never synthesise a ticket from existing ticket files.

---

## Trigger

- **Slash command:** `/ticket`
- **Phrase triggers:** "create ticket", "new ticket", "create T[N]", "refine ticket", "refine T[N]", "refine next ticket", "write the ticket", "build the ticket"
- **Context trigger:** any epic file that says "ticket must be created and refined before starting"

---

## Step 1 – Read the template (MANDATORY, FIRST)

```
Read: templates/ticket.md
```

Do this before anything else. Do not reconstruct the template from memory. Do not copy the structure from an existing ticket file.

---

## Step 2 – Read the parent epic

```
Read: project/epics-and-tickets/epic-N-name.md
```

Identify:
- Which ticket number this is (T1, T2, T3...)
- What the ticket scope is (one sentence from the Tickets table)
- What the acceptance signal is
- What this ticket depends on and what it unblocks
- What files are listed in the "Files to create or modify" table

---

## Step 3 – Read codebase state

Read the relevant files before filling any technical section. What to read depends on the ticket scope:

**Backend (read selectively based on ticket scope):**
- The project's main route handler(s)
- Business logic helpers the ticket will touch or extend
- Writer/parser files if the ticket modifies data write-back

**Frontend (read selectively):**
- The project's JS component files relevant to this ticket
- API call helpers and state management files

**Specs (always read for any ticket):**
- `project/super-spec.md` – business rules; this is "the spec" for this project
- `project/dashboard-design-guide.md` – UX patterns (if it exists)
- `project/code-style.md` – backend/frontend patterns (if it exists)

**Tests (check current count before writing quality requirements):**

```bash
# Run the project's test suite; record the passing count as the baseline
pytest tests/ -q --tb=no  # adapt path/command to project
```

---

## Step 4 – Fill every section

Fill ALL sections of the template. No `{{placeholder}}` text may remain in the output file.

**Frontmatter:**
- `tags`: include `[project, ticket]` plus topic tags matching the ticket scope
- `created`: today's date
- `updated`: today's date

**Header block:**
- `Parent epic:` – wikilink or reference to the epic file
- `Status: Not started`
- `Depends on:` – list tickets/epics this depends on, or "none"
- `Unblocks:` – list tickets/epics this unblocks, or "none"

**Business context:**
- Problem/user story: one or two sentences describing the user-visible gap
- Scope boundary: explicit "Delivers:" and "Does not deliver:" lines
- Acceptance criteria: numbered list, each independently verifiable, no code references

**UX requirements:**
- Reference specific named patterns from `project/dashboard-design-guide.md` where applicable
- If this ticket has no user-facing UI, omit the section with that note

**Technical constraints:**
- API/data contracts: exact endpoint path, request/response shape
- Patterns to follow: cite specific function names and file paths from the codebase read in Step 3
- Architecture decisions: any choice that constrains implementation discretion

**Quality requirements:**
- Test scenarios: plain-language description of what must be tested (not function names)
- State the current passing test count from the Step 3 bash command
- Edge cases: list known edge cases explicitly

**Security considerations:**
- Input validation requirements specific to this ticket
- Omit the section with a note if not applicable

**Implementation notes:**
- Leave blank. This section is filled during work.

**Post-ticket check:**
- Copy verbatim from template – do not abbreviate or rephrase
- Leave all checkboxes unchecked

---

## Step 5 – Derive filename and write

Filename convention: `epic-N-tM-kebab-name.md`
- N = epic number (no leading zero)
- M = ticket number
- kebab-name = 2-5 word kebab-case summary of the ticket scope

Write to: `project/epics-and-tickets/`

After writing, verify the file contains no `{{placeholder}}` lines:

```bash
grep -c "{{" project/epics-and-tickets/epic-N-tM-name.md
```

Result must be `0`.

---

## Step 6 – Stop

After writing the ticket:
1. Notify: "T[N] ticket written at [path]. Ready for review before work starts."
2. Do NOT begin implementing the ticket.
3. Do NOT refine the next ticket.
4. Wait.

---

## Invariants

- **Just-in-time only.** A full ticket is written only when that ticket is about to be implemented — meaning the previous ticket in the epic is complete and Michael has confirmed to proceed. If asked to write tickets for future work in bulk, write stubs (title + one-liner) only and stop. Full detail comes from reading the actual codebase at implementation time, not from speculation.
- Template read in Step 1 is non-negotiable. If `templates/ticket.md` cannot be read, stop and report.
- Codebase read (Step 3) happens before filling technical sections. No section may be filled from memory alone.
- The post-ticket check is always the last section – copy it verbatim, leave all boxes unchecked.
