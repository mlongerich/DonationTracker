---
tags: [skills, epic, development-process]
author: claude
created: 2026-06-08
updated: 2026-06-08
---

# Skill: Epic

Create a new epic for this project. The template is the source of truth – never synthesise an epic from existing epic files.

---

## Trigger

- **Slash command:** `/epic`
- **Phrase triggers:** "create epic", "new epic", "write the epic", "create E[N]", "draft the epic"

---

## Step 1 – Read the template (MANDATORY, FIRST)

```
Read: templates/epic.md
```

Do this before anything else. Do not reconstruct the template from memory. Do not copy the structure from an existing epic file.

---

## Step 2 – Read planning context

```
Read: project/implementation-plan.md
Read: project/super-spec.md   (relevant sections only, if it exists)
```

Identify:
- The epic's number (next in sequence from `implementation-plan.md`)
- Where this epic fits in the implementation sequence
- What prior epics it builds on (depends-on)
- What future epics it enables (unblocks)
- Whether any spec sections directly govern this epic's domain

Also read any prior epic that this epic directly extends:

```
Read: project/epics-and-tickets/epic-N-name.md
```

---

## Step 3 – Read design and style guides

```
Read: project/dashboard-design-guide.md   (if it exists)
Read: project/code-style.md               (if it exists)
```

Reference these when filling UX requirements and Technical constraints – cite existing patterns by name rather than describing them from scratch.

---

## Step 4 – Fill every section

Fill ALL sections of the template. No `{{placeholder}}` text may remain in the output file.

**Frontmatter:**
- `tags`: `[project, epic]` plus topic tags matching scope
- `created`: today's date
- `updated`: today's date

**Header block:**
- `Status: Not started`
- `Depends on:` – prior epics this builds on
- `Unblocks:` – future epics enabled by this one

**Business context:**
- Problem: one paragraph on the user-visible gap
- Goal: what success looks like from the user's perspective
- Scope boundary: explicit "Delivers:" and "Does not deliver:" sentences
- Acceptance criteria: epic-level conditions (not ticket-level detail)

**UX requirements:**
- Reference patterns from `project/dashboard-design-guide.md` by name
- State which new interaction patterns will need to be added to the guide before the epic closes
- Omit the section with a note if the epic has no user-facing UI

**Technical constraints:**
- Architecture decisions: major choices made before ticket work begins
- Dependencies: technical dependencies on prior epics or external contracts
- Spike: state the unknown and the smallest test to resolve it. Write "none" if no unknowns exist.

**Quality requirements:**
- Testing strategy: which test types apply
- Testing requirements: which test files will be affected

**Security considerations:**
- Epic-level trust boundaries and input validation requirements
- Omit with a note if not applicable

**Tickets table:**
- List all tickets with scope (one sentence) and test signal (one sentence)
- Status: "Not started" for all
- File links: `[[epic-N-tM-kebab-name]]` – files do not need to exist yet
- Do NOT fill ticket detail here – that happens via the `/ticket` skill just-in-time

**Files to create or modify:**
- List every file expected to change, one per row

**Post-epic gate:**
- Copy verbatim from template – do not abbreviate or rephrase
- Leave all checkboxes unchecked

---

## Step 5 – Derive filename and write

Filename convention: `epic-N-kebab-name.md`
- N = epic number (no leading zero)
- kebab-name = 3-6 word kebab-case summary of the epic goal

Write to: `project/epics-and-tickets/`

After writing, verify no placeholders remain:

```bash
grep -c "{{" project/epics-and-tickets/epic-N-name.md
```

Result must be `0`.

Update `project/implementation-plan.md` to add the epic if it is not already listed.

---

## Step 6 – Stop

After writing the epic:
1. Notify: "Epic [N] written at [path]. To begin work, use `/ticket` to create and refine T1 before writing any code."
2. Do NOT create ticket files yet.
3. Do NOT begin implementation.
4. Wait.

The first ticket is created via `/ticket` immediately before work begins – not at epic creation time.

---

## Invariants

- **Just-in-time only.** A full epic is written only when that epic is about to become the active one. If the epic being requested is not the next to start, write a stub (title, one-sentence goal, depends-on, unblocks) and stop. Do not fill any other section. The full template is filled when the epic activates.
- Template read in Step 1 is non-negotiable.
- Planning context read (Step 2) happens before filling any section. Epic number and sequencing come from `docs/implementation-plan.md`, not from counting existing files.
- The post-epic gate is always the last section – copy it verbatim, leave all boxes unchecked.
- Do not create ticket files during epic creation. Tickets are created just-in-time via `/ticket`.
- **No code in epics.** Epics contain no code samples, no function signatures, no pseudocode, no file diffs. Technical constraints describes architecture decisions, data model choices, and API contracts at a conceptual level.
- **No implementation instructions.** Describe what behaviour must be delivered and what architectural decisions constrain it. Do not describe how to implement it.
