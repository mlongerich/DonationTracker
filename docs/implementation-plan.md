---
author: claude
created: 2026-06-24
updated: 2026-06-24
tags: [project, process, implementation-plan]
---

# Donation Tracker – Implementation Plan

Stage 4 artifact. Defines epic sequence, dependencies, and testing strategy for the work ahead.

---

## Status

| Stage | Status |
|---|---|
| Stage 1 – Business Logic Spec | Approved 2026-06-24. 62 rules. |
| Stage 2 – Spike | Complete. 2 ADRs decided (Prawn, Solid Queue). |
| Stage 3 – Unified Spec | Complete. See `docs/super-spec.md`. |
| Stage 4 – Scope and Sequence | This document. In progress. |
| Stage 5 – Implementation | In progress on Epic 2 (TICKET-055 active). |

---

## Dependency graph

```
Epic 1 (Donation Management)
  ├── Epic 3 (Stripe Webhook)   – needs source + stripe_fee_cents columns
  └── Epic 4 (Reports)          – needs stripe_fee_cents for net amount

Epic 2 (Sponsorship Lifecycle)  – independent
  └── Epic 5 (Dashboard)        – needs sponsorship data complete
```

Epic 2 can run in parallel with Epic 1. Epics 3 and 4 must wait for Epic 1 to close.

---

## Epic sequence

### Epic 1 – Donation Management Completion

**Goal:** Close all CRUD gaps, add source field and fee tracking, enforce read-only for Stripe records.

**Why first:** The source column and stripe_fee_cents column are foreign keys for downstream epics. Nothing in Epic 3 or Epic 4 is buildable without them.

**Required schema changes:**
- `donations.source` (string, not null, default "manual")
- `donations.stripe_fee_cents` (integer, nullable)
- Backfill: StripeInvoice-linked records → stripe_csv, others → manual
- `donors.email` index changed to case-insensitive (citext or lower() index)

**Tickets:** 8 planned (see epic file). TICKET-061, TICKET-115, TICKET-116 are carry-forwards from old epics.

**Done when:** Full CRUD works end-to-end, read-only enforced for Stripe records, all test gaps from audit closed.

---

### Epic 2 – Sponsorship Lifecycle

**Goal:** Complete sponsorship management actions, monthly timeline views, BL-44 test cleanup fix.

**Why second:** In progress. TICKET-055 is active. Running parallel to Epic 1 work.

**Tickets:** 8 planned (see epic file). TICKET-055, TICKET-140, TICKET-139 are active or written.

**Done when:** Admin can reactivate, delete, end, and edit sponsorships. Monthly timeline visible in all 3 contexts. cy.task cleanup replaces HTTP endpoints.

---

### Epic 3 – Stripe Webhook Integration

**Goal:** Replace CSV import as the live payment data path with real-time Stripe webhook events.

**Depends on:** Epic 1 complete (source column, stripe_fee_cents column).

**Required schema changes:**
- `stripe_webhook_events` table (stripe_event_id string, unique index, timestamps)

**Required infrastructure:**
- Solid Queue worker Docker service in docker-compose.prod.yml

**ADR reference:** Solid Queue background job. See `docs/adr-stripe-webhook-handler.md`.

**Tickets:** 5 planned (see epic file). TICKET-026 is carry-forward.

**Done when:** Test-mode Stripe payment creates a Donation record within seconds with correct source and fee.

---

### Epic 4 – Reports and Giving Statements

**Goal:** Monthly, quarterly, annual donation reports and per-donor giving statements as PDF and CSV.

**Depends on:** Epic 1 complete (stripe_fee_cents needed for net amount in reports).

**ADR reference:** Prawn + prawn-table for PDF. See `docs/adr-pdf-generation.md`.

**Tickets:** 6 planned (see epic file). TICKET-103, 104, 105, 133 are carry-forwards.

**Done when:** Admin downloads a monthly PDF report with gross and net columns. Donor receives a giving statement PDF.

---

### Epic 5 – Dashboard and User Preferences

**Goal:** Configurable landing page with 6 stat widgets and 2 twelve-month charts. Per-user toggle persistence.

**Depends on:** Epic 2 complete (sponsorship data needed for accuracy).

**Required schema changes:**
- `users.preferences` (jsonb, default {})

**Tickets:** 7 planned (see epic file). All new.

**Done when:** Admin sees dashboard on login. Toggles a widget off, logs out, logs back in and it is still hidden.

---

## Testing strategy

Every ticket ships with tests. Code quality is not a separate pass.

| Layer | Framework | Target |
|---|---|---|
| Model unit tests | RSpec | 90% coverage |
| Service unit tests | RSpec | All branches |
| API request specs | RSpec | All endpoints, all error paths |
| Frontend unit tests | Jest + RTL | 80% coverage |
| E2E flows | Cypress | 100% user flows |

**Ticket definition of done (test checklist):**
- New models: validation specs, relationship specs
- New endpoints: request specs for happy path + each error path
- New services: unit specs for all branches
- New frontend components: Jest unit tests for render logic
- New user flows: Cypress E2E test
- No new N+1 queries (Bullet must not fire)
- RuboCop passes on all touched files

---

## Schema changes summary

Cumulative changes required across all epics, in migration order.

| Migration | Epic | Column / Table |
|---|---|---|
| Add donations.source | Epic 1 | string, not null, default "manual" |
| Add donations.stripe_fee_cents | Epic 1 | integer, nullable |
| Backfill donations.source | Epic 1 | stripe_csv for CSV records, manual for others |
| Change donors email index | Epic 1 | Case-insensitive uniqueness |
| Add stripe_webhook_events | Epic 3 | stripe_event_id unique, timestamps |
| Add users.preferences | Epic 5 | jsonb, default {} |

---

## Ticket review rule

Before implementing any carried-forward ticket, review it against current business rules and current code design. Tickets written before the Stage 1 spec was approved may have stale assumptions. The review step is part of the ticket workflow, not a separate gate.

Epic files list all tickets. Each ticket file is the authoritative scope. When in doubt, the business rules in `docs/business-logic.md` take precedence over the ticket file.
