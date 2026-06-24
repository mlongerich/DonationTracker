---
updated: 2026-06-24
---

# Epic 3 – Stripe Webhook Integration

**Goal:** Replace CSV as the live payment data path with real-time Stripe webhook events. Admin no longer needs to import a CSV for day-to-day operation. CSV remains available as an emergency recovery tool.

**Demo signal:** A real Stripe test-mode payment fires, arrives at the webhook endpoint, and appears as a Donation record within seconds — tagged stripe_webhook, with stripe_fee_cents populated, with the correct sponsorship created or found.

**Status:** Not started. Depends on Epic 1 (source + stripe_fee_cents columns must exist).

---

## Depends on

Epic 1 – source column and stripe_fee_cents column must be migrated before this epic begins.

---

## Scope

**In:**
- Schema migration: `stripe_webhook_events` table (stripe_event_id unique index) for idempotency
- Docker Compose production update: add Solid Queue worker service (`bin/jobs`)
- `POST /api/webhooks/stripe` controller: CSRF exempt, HMAC signature verification, insert event ID, enqueue job, return 200
- `StripeWebhookJob`: process payment.succeeded events — find/create donor (merge chain), find/create child, find/create sponsorship (new if ended per BL-37), create Donation with source: stripe_webhook + stripe_fee_cents
- Update `StripePaymentImportService`: write stripe_fee_cents from CSV Fee column on import (small addition, backfills existing import path)
- Tests: valid signature accepted, invalid signature → 403, duplicate event_id → 200 skip, new payment → donation + sponsorship created, ended sponsorship → new sponsorship created (BL-37 at service level)
- Local testing setup: `stripe listen --forward-to localhost:3001/api/webhooks/stripe`

**Out:**
- Stripe subscription management (cancel, create links) — handled in Stripe directly
- Webhook events beyond payment.succeeded (refund, chargeback) — deferred, can be added as tickets when needed

---

## Tickets

| Ticket | Scope | Status |
|---|---|---|
| New | stripe_webhook_events migration + Solid Queue Docker service | Not started |
| TICKET-026 | Webhook controller: signature verification + enqueue | Not started |
| New | StripeWebhookJob: full payment processing logic | Not started |
| New | Update StripePaymentImportService: write stripe_fee_cents | Not started |
| New | Webhook integration tests | Not started |

---

## Quality requirements baked in

- Webhook controller returns 200 in all non-error cases (Stripe retries on non-200)
- Idempotency enforced at two levels: stripe_webhook_events table + existing stripe_invoice_id uniqueness
- StripeWebhookJob spec covers all BL-37 branching (active sponsorship, ended sponsorship, no sponsorship)
- RuboCop passes, no N+1 queries in job processing
