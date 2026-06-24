---
updated: 2026-06-23
archived: 2026-06-24
superseded_by: epic-3-stripe-webhook.md
---

> **Archived 2026-06-24.** Category-based epics replaced by thin vertical slices. Planned tickets redistributed to [Epic 3 – Stripe Webhook](epic-3-stripe-webhook.md). Completed tickets remain as history.



# Epic 3 – Stripe Integration

**Goal:** Import historical and ongoing Stripe payment data into the donation tracker. MVP uses CSV import. Long-term target is real-time webhook sync.

**Status:** MVP CSV import complete and validated in production. Webhook integration is planned post-MVP.

---

## Completed tickets

| Ticket | Description |
|---|---|
| TICKET-070 | Stripe CSV import foundation (core import service) |
| TICKET-071 | Stripe CSV batch import task (CLI rake task) |
| TICKET-109 | Donation status infrastructure (status enum and fields) |
| TICKET-110 | Import service with status and metadata support |
| TICKET-111 | Pending review admin UI |
| TICKET-112 | Validation and merge to main |
| TICKET-113 | Cleanup old failed payments system |
| TICKET-134 | Stripe CSV email fallback handling |

---

## Superseded tickets

| Ticket | Description | Superseded by |
|---|---|---|
| TICKET-076 | Failed Stripe payments tracking | TICKET-109, TICKET-110, TICKET-111 |

---

## Planned tickets

| Ticket | Description | Priority |
|---|---|---|
| TICKET-012 | Stripe webhook integration | Medium |
| TICKET-026 | Stripe webhook integration (updated for redesign) | Medium |
| TICKET-027 | Stripe description mapping management (admin UI for rules) | Low |
| TICKET-048 | Stripe sponsorship and child extraction enhancements | Medium |
| TICKET-072 | Import error recovery UI (optional, skip if fewer than 10 failures) | Low |
| TICKET-118 | Add source tracking to donations (CSV vs webhook vs manual) | Medium |
| TICKET-129 | Internationalisation i18n test resilience | Low |

---

## Implementation order note

The temporary code (StripeCsvBatchImporter, rake task) is marked for deletion after TICKET-026 (webhooks) is stable and the historical import is confirmed complete.
