---
author: michael
created: 2026-06-08
updated: 2026-06-08
---
# CLAUDE.md

This file provides guidance to Claude when working with this repository.

## What this repo is

{{Fill in: describe the project, its purpose, and its users. Include the deployment model and any integration points with other systems.}}

---

## Session routing

Read `CLAUDE.md` on every session. Load skill files based on the trigger below. `skills/writing-style/SKILL.md` loads on every session where files are written or edited.

| Session trigger | Skill files to load |
|---|---|
| Any file write or edit | `skills/writing-style/SKILL.md` (always) |
| `/epic` / "create epic" / "new epic" / "create E[N]" | `skills/epic/SKILL.md` |
| `/ticket` / "create ticket" / "new ticket" / "refine ticket" / "refine T[N]" | `skills/ticket/SKILL.md` |
| `/adr` / "create ADR" / "write ADR" / "document this decision" | `skills/adr/SKILL.md` |

**Session tier – infer from first message:**

| Tier | Trigger | Load |
|---|---|---|
| **Tier 1 – Quick task** | Single scoped task ("implement this ticket", "create ADR") | `CLAUDE.md` |
| **Tier 2 – Standard** | Active epic, implementation block, code review | + `assets/docs/development-process.md` + `assets/docs/code-style.md` |
| **Tier 3 – Planning** | Spec work, epic/ticket creation, process review | + `assets/docs/super-spec.md` + `assets/docs/implementation-plan.md` |

**Announce tier on every session start.** Before doing any other work, output a single line stating the inferred tier and the files being loaded. Format: `[Tier N – Label] Loading: file1, file2, …`. No prose, no preamble.

---

## Universal invariants

### File safety

- Never delete, overwrite, or replace existing files without explicit confirmation.
- Never use `rm` or any destructive command without explicit confirmation.
- When in doubt, preserve everything and ask.

### Git

- Commit to git after each meaningful set of file operations.

**Commit message style:**
- Subject: `<type>(<scope>): <imperative summary>`. Types: `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `chore`, `build`, `ci`.
- 72-char max. Imperative mood. No trailing period.
- Body: include only when the "why" is non-obvious from the subject, for breaking changes, or migration notes.
- Never include AI attribution in the message body (the Co-Authored-By trailer is still appended normally).

### Code style

Always read `assets/docs/code-style.md` before writing any code. Read `assets/docs/dashboard-design-guide.md` before writing any UI code. Read `skills/writing-style/SKILL.md` before writing or editing any `.md` file.

### Development process

This project uses the six-stage gate model documented in `assets/docs/development-process.md`. Read it before starting any epic or ticket.

### Cavekit – spec-driven development

Cavekit provides four skills: `spec`, `build`, `check`, and `backprop`. Install it at `.agents/skills/` (copy from the lifeOS repo or the Cavekit source). When installed, SPEC.md lives at `assets/docs/SPEC.md`.

To enable Cavekit for this project, add a row to this table after installing:

| Project | SPEC.md path | Notes |
|---|---|---|
| *(none enabled yet)* | – | Install `.agents/skills/` first |

### Reading before writing

Always read the relevant file(s) before making changes. Always read `skills/writing-style/SKILL.md` before writing or editing any `.md` file.

### Templates

Always check `templates/` before creating any structured file. Never edit template files directly when using them for new notes.

---

## Directory structure

- `assets/docs/` – project management and spec documents
  - `project.md` – status tracking and next action
  - `development-process.md` – six-stage gate model and working agreements
  - `business-logic-qa.md` – Q&A rounds (Stage 1 source artifact)
  - `business-logic.md` – resolved decisions (D1-D10) and business rules (BL1-BL15)
  - `super-spec.md` – unified spec; authoritative reference for all code
  - `code-style.md` – code patterns and anti-patterns; update when new patterns are established
  - `dashboard-design-guide.md` – UI interaction patterns and design tokens; update before each UI epic closes
  - `implementation-plan.md` – epic sequence and overview (Stage 4 artifact)
  - `notes.md` – working notes, spikes, and retrospectives
  - `ideas.md` – ideas backlog for future consideration
  - `epics-and-tickets/` – one file per epic and per ticket; named `epic-N-kebab-name.md` and `epic-N-tM-kebab-name.md`
- `templates/` – copy-paste starters for ADRs, epics, and tickets; always check here first
- `skills/` – skill files for Claude-driven workflows (ADR, epic, ticket, writing-style)
