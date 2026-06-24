---
updated: 2026-06-24
---

# Epic 1 – Donation Management Completion

**Goal:** Close all gaps in the donation feature so it is complete end-to-end: correct data model, full CRUD API, read-only enforcement for Stripe-sourced records, and all BL rules covered by tests.

**Demo signal:** Admin creates a donation, edits its status, deletes it within 24 hours, imports a CSV row and sees it locked as read-only in the UI. All paths covered by unit and request specs.

**Status:** Not started

---

## Why this is first

Donation management is the core feature everything else depends on. The source field (BL-53) and fee tracking (BL-49) are required by the Stripe webhook epic. The edit lock (BL-60) unblocks sponsorship management. Completing this epic first removes blockers downstream.

---

## Scope

**In:**
- Schema migrations: add `source` (string, not null, default "manual") and `stripe_fee_cents` (integer, nullable) to donations
- Backfill migration: existing StripeInvoice-linked records → `stripe_csv`, all others → `manual`
- `PATCH /api/donations/:id` – edit `status` and `needs_attention_reason` only
- `DELETE /api/donations/:id` – enforce 24-hour creation window (BL-42)
- Read-only enforcement in API and frontend for stripe_csv and stripe_webhook sources (BL-60)
- BL-2 fix: case-insensitive email uniqueness (DB index change + model validation)
- BL-2 fix: un-archive donor when a non-mailinator email is presented that matches an archived record
- Mailinator email generation audit: verify priority order (phone > address > name) and edge cases
- Pending Review UI: edit status and needs_attention_reason from the admin tab (TICKET-115, TICKET-116)
- Test gaps from audit: BL-9, BL-10, BL-11, BL-15, BL-41

**Out:**
- Stripe fee display in reports (that is the Reports epic)
- Admin deletion override after 24 hours (TICKET-106, low priority, deferred)

---

## Tickets

| Ticket | Scope | Status |
|---|---|---|
| New | Schema migration: source + stripe_fee_cents + backfill | Not started |
| TICKET-061 | PATCH /api/donations – update status and needs_attention_reason | Not started |
| New | DELETE /api/donations – 24-hour window enforcement | Not started |
| New | Frontend: donation edit, delete, read-only for Stripe records | Not started |
| TICKET-115 | Pending Review tab: edit status action | Not started |
| TICKET-116 | Pending Review tab: edit needs_attention_reason and archive action | Not started |
| New | BL-2 fix: case-insensitive email + mailinator audit + un-archive on email match | Not started |
| New | Test gaps: BL-9, BL-10, BL-11, BL-15, BL-41 | Not started |

---

## Quality requirements baked in

- Every new endpoint gets a request spec
- Every new migration gets a model spec update
- RuboCop passes on all touched files
- No N+1 queries introduced (Bullet gem will flag)
