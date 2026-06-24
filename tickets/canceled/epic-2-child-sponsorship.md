---
updated: 2026-06-23
archived: 2026-06-24
superseded_by: epic-2-sponsorship-lifecycle.md
---

> **Archived 2026-06-24.** Category-based epics replaced by thin vertical slices. Planned tickets redistributed to [Epic 2 – Sponsorship Lifecycle](epic-2-sponsorship-lifecycle.md). Completed tickets remain as history.



# Epic 2 – Child Sponsorship

**Goal:** Manage sponsored children and their ongoing donor-child sponsorship relationships including creation, lifecycle management, and display.

**Status:** Partially complete. Core sponsorship flow is done. Lifecycle management actions (TICKET-055) are in progress.

---

## Completed tickets

| Ticket | Description |
|---|---|
| TICKET-010 | Children and basic sponsorship tracking |
| TICKET-050 | Children page search and pagination |
| TICKET-052 | Improve sponsorship donation linking UX |
| TICKET-053 | Sponsorships page filters and pagination UI |
| TICKET-056 | Sponsorship business logic and validation |
| TICKET-057 | Children page multi-sponsor display |
| TICKET-060 | Extract SponsorshipPresenter pattern |
| TICKET-061 | Fix children page N+1 query problem |
| TICKET-062 | Donor cascade delete strategy |
| TICKET-063 | Archive business logic for active sponsorships |
| TICKET-064 | Smart sponsorship detection and auto-creation |
| TICKET-065 | Move business logic to backend |
| TICKET-077 | Last donation date tracking |

---

## In progress

| Ticket | Description | Notes |
|---|---|---|
| TICKET-055 | Sponsorship management actions (reactivate, delete, end with date, edit) | Backend spec partially written. Frontend has no new code yet. |

---

## Planned tickets

| Ticket | Description | Priority |
|---|---|---|
| TICKET-048 | Stripe sponsorship and child extraction | Medium |
| TICKET-049 | Child soft delete with archive and restore | Deferred (frontend protection sufficient) |
| TICKET-058 | Donor sponsorship list endpoint | Low |
| TICKET-059 | Child info display on donation pages | Medium |
| TICKET-092 | Child name and gender uniqueness validation | Medium |
| TICKET-093 | Project icons on projects page | Low |
| TICKET-101 | Donation photo upload for check images | High |
| TICKET-102 | Child photo upload | Medium |
| TICKET-107 | Project last donation date | Low |
| TICKET-128 | Project find-or-create idempotency | Medium |
| TICKET-139 | Show sponsorship projects in Admin Projects tab | Low |
