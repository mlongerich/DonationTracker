---
tags: [skills, adr, decision, architecture]
author: claude
created: 2026-06-08
updated: 2026-06-08
---

# Skill: ADR

Create an Architectural Decision Record (ADR) for any project-level decision. Research is mandatory. An ADR without research and sources is incomplete.

---

## Trigger

- **Slash command:** `/adr`
- **Phrase triggers:** "create ADR", "write ADR", "new ADR", "document this decision", "decision record"

---

## Step 1 – Read the template (MANDATORY, FIRST)

```
Read: templates/adr.md
```

Do this before anything else. The template is the source of truth for structure.

**Em dash warning:** The template may contain em dash placeholders. Replace all em dashes (—) with en dashes (–) when filling in the ADR, per writing-style rules.

---

## Step 2 – Read context

Read the files that define the decision space:

```
Read: project/project.md
Read: project/super-spec.md          (relevant sections, if it exists)
Read: project/business-logic-qa.md   (relevant sections, if it exists)
Read: project/notes.md               (relevant sections)
```

Look for any prior ADRs in the project root or `project/` folder that are related – scan for `adr-*.md` files:

```bash
find . -name "adr-*.md" | sort
```

Read related ADRs to understand what has already been decided and avoid contradictions.

---

## Step 3 – Research (MANDATORY for every ADR)

Every ADR requires web research. No exceptions. Research is what separates a documented opinion from a documented decision.

**Minimum research requirement:**
- Two searches for each major option considered
- At least one search for known failure modes or trade-offs
- At least one search for industry-standard comparisons or best practices

**For technology and architecture ADRs:** search for:
- Best practices for each approach
- Real-world evidence from production uses
- Known trade-offs and failure modes
- Official documentation for any library or tool named

**For process and workflow ADRs:** search for:
- Industry frameworks and established models
- Retrospectives or post-mortems from similar decisions
- Expert opinion from recognised practitioners

**Record research findings inline** in the relevant Options section immediately after researching.

---

## Step 4 – Write the ADR

Fill ALL sections from the template. No `{{placeholder}}` text may remain.

**Frontmatter:**
- `tags`: always include `adr` plus topic tags
- `status: proposed`

**Context section:** what problem prompted this decision, constraints, and cost of deferring.

**Options section:** two or more options with Pros and Cons. Add a `### Research basis` subsection inside the recommended option.

**Mermaid diagrams:** required for any ADR with a system architecture, flow, or dependency graph.

**Suggested decision date:** realistic based on urgency, complexity, and deadlines.

**Recommendation section:** state clearly which option is recommended, with specific evidence-backed rationale.

**Post-Decision sections:** leave all four sub-sections blank.

**Writing style check before saving:**
- No em dashes (—) anywhere
- No semicolons in prose
- No colons in prose sentences
- En dashes (–) only in heading labels and ranges
- Time format: 9.00, not 9:00

---

## Step 5 – Add Sources section

Add a `## Sources` section at the end, immediately before the Post-Decision section:

```markdown
## Sources

- [Title](URL) – one-line note on how this source was used
```

This section is mandatory.

---

## Step 6 – Determine location and write

**Location:** ADRs live in the project root alongside `CLAUDE.md` or inside `project/`. Use the filename convention `adr-<kebab-case-topic>.md`.

After writing, verify no placeholders remain:

```bash
grep -c "{{" path/to/adr.md
```

Result must be `0`.

---

## Step 7 – Stop

After writing the ADR:
1. Notify: "ADR written at [path]. Suggested decision date: [date]."
2. Do NOT act on the recommendation.
3. Do NOT fill in Post-Decision sections.
4. Wait for the decision to be recorded.

---

## Invariants

- Template read in Step 1 is non-negotiable.
- Research in Step 3 is mandatory. No exceptions.
- Sources section is mandatory.
- Mermaid diagram required for architecture, flow, or system content.
- Post-Decision sections are always blank when ADR is first created.
- Writing style checked before every save.
