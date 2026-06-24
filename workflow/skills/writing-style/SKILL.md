---
tags: [skills, writing-style, prose-rules]
author: claude
created: 2026-06-08
updated: 2026-06-08
---

# Skill: Writing Style

These rules apply to all prose written in any `.md` file. Violations must be caught before saving.

---

## Forbidden – never use under any circumstances

- Em dashes (—) anywhere: sentences, headings, titles, list items, code labels, everywhere
- Semicolons (;)
- Colons (:) in prose sentences (not inline labels or table cells)
- En dashes as sentence connectors mid-prose
- Hyphens in compound adjectives before nouns (use a space instead: "a well rested mind")
- Colons in time references (use dots: 9.00 not 9:00)

## Allowed

- En dashes (–) in heading labels and titles (e.g. "Status – Active")
- En dashes (–) in ranges, with a space on each side (e.g. "9.00 - 10.00")
- Dashes for bullet point list items (standard markdown)
- Hyphens in common compound nouns (e.g. "follow-up", "check-in")
- Colons in frontmatter values
- Colons in table cells
- Colons in inline body labels (e.g. "Status: Active", "Owner: Michael")

## How to rewrite without forbidden characters

Break the sentence in two. Use "and", "but", "so", "because", "which", or "that" to connect ideas. If a colon was introducing a list, start a new line or use "including" or "such as" instead.

**Example rewrites**

| Original (violates rules) | Corrected |
|---|---|
| The feature ships — finally. | The feature ships. Finally. |
| The goal is simple: finish by Friday. | The goal is simple. Finish by Friday. |
| Write the note; then commit. | Write the note, then commit. |
| Status — Active (heading) | Status – Active |
| a well-rested component | a well rested component |
| Meeting at 9:00–10:30 | Meeting at 9.00 - 10.30 |

---

## Visuals, diagrams, and citations

When adding content from research to any file (ADR, resource note, project notes):

- Use Mermaid.js diagrams whenever content can be visualised as a flow, dependency, timeline, or comparison.
- Cite all sources at the end of any research section. Include a sources list with URLs or references.

---

## Scope

These rules cover all prose in `.md` files. They do not apply to:
- Frontmatter values
- Code blocks
- Table cell values that are single words or symbols
- Filenames or paths
