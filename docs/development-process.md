---
author: michael
created: 2026-06-23
updated: 2026-06-23
tags: [project, process, development]
---

# Donation Tracker – Development Process

This project uses the six-stage gate model. The template is at `workflow/templates/development-process.md`.

---

## Current status

This is an existing codebase being brought into the six-stage process. Stages 1-4 are being reconstructed from existing code and ticket history rather than written upfront.

| Stage | Status | Artifact |
|---|---|---|
| Stage 1 – Business Logic Spec | Approved 2026-06-24 | `docs/business-logic.md` |
| Stage 2 – Project-level Spike | Complete. ADRs decided 2026-06-24. | `docs/adr-pdf-generation.md`, `docs/adr-stripe-webhook-handler.md` |
| Stage 3 – Unified Spec | Approved 2026-06-24 | `docs/super-spec.md` |
| Stage 4 – Scope and Sequence | Complete 2026-06-24 | `docs/implementation-plan.md`, `docs/code-style.md`, `tickets/epics/` |
| Stage 5 – Implementation | In progress (pre-process work) | `tickets/` |
| Stage 6 – Migration | Not applicable (greenfield, production already live) | n/a |

---

## Stage 1 – Business Logic Spec

**Artifact:** `docs/business-logic.md`

**Status:** Approved 2026-06-24. 59 business rules confirmed across 7 Q&A rounds.

---

## Stage 3 – Unified Spec

**Artifact:** `docs/super-spec.md`

**Status:** Approved 2026-06-24. 10 sections covering architecture, schema, API surface, UI surface, security model, error catalogue, and test scenarios. All 4 implementation questions resolved.

---

## Stage 4 – Scope and Sequence

**Artifact:** `docs/implementation-plan.md`, `docs/code-style.md`, `tickets/epics/`

**Status:** Complete 2026-06-24. Five thin vertical slice epics ordered by priority and dependency. Code quality and tests are definition of done for every ticket, not deferred.

**Active epics:** See `tickets/epics/README.md` for current structure and dependency order.

---

## Stage 5 – Implementation

**Artifact:** Code, tests, and ticket files in `tickets/`

**Status:** Active pre-process work. Epic and ticket files being created just-in-time as work begins on each epic.

**Active work:** TICKET-055 (Sponsorship management actions) is in progress.

---

## Change propagation rules

See `workflow/templates/development-process.md` for the full change propagation table.

Short version: findings that affect scope, architecture, or security require Michael's approval before implementation continues. Implementation details within the agreed design are Claude's to decide.

---

## Testing strategy

| Test type | Status |
|---|---|
| Unit (RSpec models, services) | Active. 90%+ coverage target. |
| Integration (API request specs) | Active. All endpoints covered. |
| E2E (Cypress) | Partial. Remaining coverage baked into Epic 2 (TICKET-080, TICKET-082). |
| Accessibility | Planned (TICKET-125, post-MVP). |

---

## Supporting resources

- `docs/business-logic.md` – business rules, actor model, data model
- `docs/super-spec.md` – unified spec (not started)
- `docs/implementation-plan.md` – epic plan (not started)
- `docs/code-style.md` – linting setup, naming conventions, patterns, anti-patterns
- `docs/design-guide.md` – UI stack, layout system, component patterns, interaction conventions
- `tickets/epics/` – current epic groupings
- `workflow/templates/` – epic, ticket, ADR, and code-style templates
