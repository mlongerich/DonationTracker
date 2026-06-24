---
updated: 2026-06-24
---

# Epics

Restructured 2026-06-24. Epics are now thin vertical slices ordered by priority and dependency. Code quality and tests are part of every epic, not a separate pass. Old category-based epics (1-7) are archived below.

---

## Active epics

| Epic | Goal | Status |
|---|---|---|
| [Epic 1 – Donation Management Completion](epic-1-donation-management-completion.md) | Close CRUD gaps, source field, read-only enforcement, BL-2 email fix | Not started |
| [Epic 2 – Sponsorship Lifecycle](epic-2-sponsorship-lifecycle.md) | Finish sponsorship actions, timeline views, test gaps | In progress (TICKET-055) |
| [Epic 3 – Stripe Webhook](epic-3-stripe-webhook.md) | Real-time payment sync via webhook, retire CSV as live path | Not started |
| [Epic 4 – Reports](epic-4-reports.md) | Monthly/quarterly/annual reports and giving statements in PDF and CSV | Not started |
| [Epic 5 – Dashboard](epic-5-dashboard.md) | Configurable landing page with live stats and 12-month charts | Not started |

**Dependency order:** Epic 1 unblocks Epic 3 and Epic 4 (source column and stripe_fee_cents must exist first). Epic 2 is independent. Epic 5 can begin after Epic 2.

---

## Archived epics (category-based, superseded 2026-06-24)

Original category-based structure preserved for reference. Completed tickets remain as history. Planned tickets redistributed into the active epics above.

| File | Was | Redistributed to |
|---|---|---|
| [epic-1-donor-donation-management.md](epic-1-donor-donation-management.md) | Donor and donation CRUD | Epic 1 |
| [epic-2-child-sponsorship.md](epic-2-child-sponsorship.md) | Child and sponsorship management | Epic 2 |
| [epic-3-stripe-integration.md](epic-3-stripe-integration.md) | Stripe CSV and webhook | Epic 3 |
| [epic-4-admin-reporting.md](epic-4-admin-reporting.md) | Admin tools and reports | Epic 4 |
| [epic-5-auth-deployment.md](epic-5-auth-deployment.md) | Auth and deployment | Complete — no active work remaining |
| [epic-6-code-quality.md](epic-6-code-quality.md) | Code quality patterns | Baked into every epic |
| [epic-7-test-coverage.md](epic-7-test-coverage.md) | Test coverage | Baked into every epic (TICKET-140 moved to Epic 2) |
