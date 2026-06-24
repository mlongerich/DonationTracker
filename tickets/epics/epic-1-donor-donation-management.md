---
updated: 2026-06-23
archived: 2026-06-24
superseded_by: epic-1-donation-management-completion.md
---

> **Archived 2026-06-24.** Category-based epics replaced by thin vertical slices. Planned tickets redistributed to [Epic 1 – Donation Management Completion](epic-1-donation-management-completion.md). Completed tickets remain as history.



# Epic 1 – Donor and Donation Management

**Goal:** Core CRUD for donors, donations, and projects. Foundation layer that all other epics depend on.

**Status:** Mostly complete. A small number of planned enhancements remain.

---

## Completed tickets

| Ticket | Description |
|---|---|
| TICKET-001 | Donor soft delete with archive and restore |
| TICKET-002 | Stripe CSV donor import via CLI (iteration 1) |
| TICKET-003 | Hide auto-generated emails in donor display |
| TICKET-004 | Manual donor merge with field selection |
| TICKET-005 | Auto-reassign donations after donor merge |
| TICKET-006 | Simple donation entry |
| TICKET-007 | Donation list history view |
| TICKET-009 | Project-based donations |
| TICKET-013 | Fix Docker frontend infrastructure |
| TICKET-014 | Refactor donor merge service pattern consistency |
| TICKET-015 | Donation list pagination |
| TICKET-016 | Donation list filtering and date range |
| TICKET-017 | Replace donor dropdown with autocomplete search |
| TICKET-020 | Consistent Material UI styling for DonationForm |
| TICKET-021 | Quick entity creation (Donor, Project, Child) from Donation page |
| TICKET-022 | Anonymous donation support |
| TICKET-023 | Donation list donor filter |
| TICKET-025 | Standardise form input sizing across application |
| TICKET-028 | Extract controller concerns for pagination and filtering |
| TICKET-029 | Implement presenter pattern for API responses |
| TICKET-030 | Refactor App.tsx into multi-page architecture |
| TICKET-031 | Extract DonorAutocomplete shared component |
| TICKET-032 | Create custom hooks library |
| TICKET-035 | Add database indexes for query performance |
| TICKET-038 | Define cascade delete strategy for donations |
| TICKET-044 | Extract shared TypeScript types |
| TICKET-047 | Consistent Material UI card styling for lists |
| TICKET-085 | Donation source and payment method tracking |
| TICKET-100 | Add physical address to donor records |

---

## Planned tickets

| Ticket | Description | Priority |
|---|---|---|
| TICKET-018 | Fix donation amount decimal formatting | Low |
| TICKET-046 | Add project filter to donations page | Low |
| TICKET-086 | Delete donation within 24-hour window | Medium |
| TICKET-087 | Donor bulk operations (archive, restore, export) | Medium |
| TICKET-089 | Archived donor donation visibility policy | Medium |
