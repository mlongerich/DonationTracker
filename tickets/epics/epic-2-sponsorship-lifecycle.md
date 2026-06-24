---
updated: 2026-06-24
---

# Epic 2 – Sponsorship Lifecycle

**Goal:** Complete sponsorship management actions, add monthly timeline views in all three contexts, and fix all test gaps in the sponsorship domain.

**Demo signal:** Admin ends a sponsorship, a new Stripe payment creates a fresh one, admin views the monthly grid for that donor showing which months were paid and which were gaps. Timeline also visible from the child page and the sponsorship detail page.

**Status:** In progress (TICKET-055 active)

---

## Scope

**In:**
- TICKET-055: reactivate, delete, end with date, edit (manual-only lock) — in progress
- TICKET-139: show sponsorship projects in Admin Projects tab
- Monthly timeline view — all three contexts (BL-55):
  - Per sponsorship: 24-month grid on sponsorship detail
  - Per child: all donors for one child across months
  - Per donor: all children one donor sponsors across months
- Test gaps: BL-19 (ended sponsorship blocks child delete), BL-22 (different amount allowed), BL-25 (sponsorship hard-delete restriction), BL-37 (import service ended-sponsorship path), BL-52 (schema assertion)

**Out:**
- Stripe webhook trigger for new sponsorship creation (that is the Stripe Webhook epic)
- Sponsorship reporting (that is the Reports epic)

---

## Tickets

| Ticket | Scope | Status |
|---|---|---|
| TICKET-055 | Sponsorship actions: reactivate, delete, end, edit | In progress |
| TICKET-139 | Show sponsorship projects in Admin tab | Not started |
| New | Monthly timeline view: per sponsorship | Not started |
| New | Monthly timeline view: per child and per donor | Not started |
| TICKET-080 | Sponsorship management E2E tests | Not started |
| TICKET-082 | Smart sponsorship detection E2E tests | Not started |
| New | Test gaps: BL-19, BL-22, BL-25, BL-37, BL-52 | Not started |

---

## Quality requirements baked in

- TICKET-055 must pass all existing specs plus new specs for each action before closing
- Timeline view query uses GROUP BY month to avoid N+1 (single SQL aggregation)
- cy.task cleanup (TICKET-140, standalone) must be complete before any new E2E tests are written in this epic
