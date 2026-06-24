---
updated: 2026-06-23
archived: 2026-06-24
---

> **Archived 2026-06-24.** Test coverage is baked into every epic and ticket as a definition-of-done requirement, not a separate pass. TICKET-140 (cy.task cleanup) moved to Epic 2. This epic is dissolved.



# Epic 7 – Test Coverage

**Goal:** Comprehensive E2E and integration test coverage across all features. Ensure regression safety as the codebase grows.

**Status:** Core infrastructure and some E2E tests are complete. Most feature-area E2E suites are planned.

---

## Completed tickets

| Ticket | Description |
|---|---|
| TICKET-024 | Separate test and development database environments |
| TICKET-078 | Fix donation filter race condition |
| TICKET-079 | Project CRUD E2E tests and bug fixes |
| TICKET-108 | Fix E2E test infrastructure flakiness |
| TICKET-123 | Projects extended E2E tests |

---

## Planned tickets

| Ticket | Description | Priority |
|---|---|---|
| TICKET-140 | Replace HTTP test cleanup endpoints with cy.task (removes BL-44 contradiction) | High |
| TICKET-080 | Sponsorship management E2E tests | High |
| TICKET-081 | Donor archive and restore extended E2E tests | Low |
| TICKET-082 | Smart sponsorship detection E2E tests | Medium |
| TICKET-083 | Multi-page integration E2E tests | Low |
| TICKET-084 | Error handling and form validation E2E tests | Medium |
| TICKET-090 | Fix Cypress in Docker (Alpine ARM64 issue) | Medium |
| TICKET-121 | Children management E2E tests | Medium |
| TICKET-122 | Donations extended E2E tests | Medium |
| TICKET-124 | Cross-feature integration E2E tests | Medium |
| TICKET-125 | Accessibility E2E tests (post-MVP) | Low |
