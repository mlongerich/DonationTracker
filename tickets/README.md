# Active Tickets

Current work items and user stories being actively developed.

**How to use:**
- Each ticket is stored in its own file: `TICKET-XXX-descriptive-title.md`
- Use `/memory` to access during Claude Code sessions
- Update ticket status as work progresses
- Link commits to tickets for traceability

---

## Ticket Index

### ✅ Completed Tickets

- [TICKET-001: Donor Soft Delete with Archive/Restore](TICKET-001-donor-soft-delete-archive-restore.md) - ✅ Complete (2025-10-07)
- [TICKET-002: Stripe CSV Donor Import via CLI (Iteration 1)](TICKET-002-stripe-csv-donor-import.md) - ✅ Complete (2025-10-07)
- [TICKET-003: Hide Auto-Generated Emails in Donor Display](TICKET-003-hide-auto-generated-emails.md) - ✅ Complete (2025-10-07)
- [TICKET-006: Simple Donation Entry](TICKET-006-simple-donation-entry.md) - ✅ Complete (2025-10-15)
- [TICKET-007: Donation List History View](TICKET-007-donation-list-history-view.md) - ✅ Complete (2025-10-15)
- [TICKET-009: Project-Based Donations](TICKET-009-project-based-donations.md) - ✅ Complete (2025-10-19)
- [TICKET-014: Refactor Donor Merge Service Pattern Consistency](TICKET-014-refactor-donor-merge-service-pattern-consistency.md) - ✅ Complete (2025-10-15)
- [TICKET-015: Donation List Pagination](TICKET-015-donation-list-pagination.md) - ✅ Complete (2025-10-17)
- [TICKET-016: Donation List Filtering & Date Range](TICKET-016-donation-list-filtering.md) - ✅ Complete (2025-10-18)
- [TICKET-017: Replace Donor Dropdown with Autocomplete Search](TICKET-017-donor-autocomplete-search.md) - ✅ Complete (2025-10-16)
- [TICKET-028: Extract Controller Concerns for Pagination/Filtering](TICKET-028-extract-controller-concerns-pagination-filtering.md) - ✅ Complete (2025-10-18)
- [TICKET-029: Implement Presenter Pattern for API Responses](TICKET-029-implement-presenter-pattern-api-responses.md) - ✅ Complete (2025-10-18)
- [TICKET-031: Extract DonorAutocomplete Shared Component](TICKET-031-extract-donor-autocomplete-shared-component.md) - ✅ Complete (2025-10-16)
- [TICKET-044: Extract Shared TypeScript Types](TICKET-044-extract-shared-typescript-types.md) - ✅ Complete (2025-10-19)

### 📋 Planned Tickets

#### Feature Development
- [TICKET-004: Manual Donor Merge with Field Selection](TICKET-004-manual-donor-merge-field-selection.md) - 📋 Planned
- [TICKET-005: Auto-Reassign Donations After Donor Merge](TICKET-005-auto-reassign-donations-after-merge.md) - ⏸️ Blocked (needs TICKET-004)
- [TICKET-008: Basic Authentication with Google OAuth](TICKET-008-basic-authentication-google-oauth.md) - 📋 Planned
- [TICKET-010: Children & Basic Sponsorship Tracking](TICKET-010-children-basic-sponsorship-tracking.md) - 📋 Planned
- [TICKET-011: Recurring Donation Tracking](TICKET-011-recurring-donation-tracking.md) - 📋 Planned
- [TICKET-012: Stripe Webhook Integration](TICKET-012-stripe-webhook-integration.md) - 📋 Planned
- [TICKET-018: Fix Donation Amount Decimal Formatting](TICKET-018-donation-amount-decimal-formatting.md) - 📋 Planned
- [TICKET-020: Consistent Material-UI Styling for DonationForm](TICKET-020-donation-form-material-ui-styling.md) - 📋 Planned
- [TICKET-021: Quick Donor Creation from Donation Page](TICKET-021-quick-donor-creation-from-donation-page.md) - 📋 Planned
- [TICKET-022: Anonymous Donation Support](TICKET-022-anonymous-donation-support.md) - 📋 Planned
- [TICKET-023: Donation List Donor Filter](TICKET-023-donation-list-donor-filter.md) - 📋 Planned (🟡 Medium)

#### Infrastructure & Technical Debt
- [TICKET-013: Fix Docker Frontend Infrastructure Issues](TICKET-013-fix-docker-frontend-infrastructure.md) - 📋 Planned

#### Code Quality & Architecture Improvements
- [TICKET-030: Refactor App.tsx into Multi-Page Architecture](TICKET-030-refactor-app-multi-page-architecture.md) - 📋 Planned (🔴 High, L)
- [TICKET-032: Create Custom Hooks Library](TICKET-032-create-custom-hooks-library.md) - 📋 Planned (🟡 Medium, M)
- [TICKET-033: Implement Policy Objects for Authorization](TICKET-033-implement-policy-objects-authorization.md) - 📋 Planned (🟡 Medium, M)
- [TICKET-034: Create Query Objects for Complex Database Queries](TICKET-034-create-query-objects-complex-database-queries.md) - 📋 Planned (🟢 Low, M)
- [TICKET-035: Add Database Indexes for Query Performance](TICKET-035-add-database-indexes-query-performance.md) - 📋 Planned (🟡 Medium, S)
- [TICKET-036: Implement React Error Boundary](TICKET-036-implement-react-error-boundary.md) - 📋 Planned (🟡 Medium, S)
- [TICKET-037: Standardize Service Object Patterns](TICKET-037-standardize-service-object-patterns.md) - 📋 Planned (🟢 Low, S)
- [TICKET-038: Define Cascade Delete Strategy for Donations](TICKET-038-define-cascade-delete-strategy-donations.md) - 📋 Planned (🟢 Low, S)
- [TICKET-039: Add Donation Status Enum Validation](TICKET-039-add-donation-status-enum-validation.md) - 📋 Planned (🟢 Low, S)
- [TICKET-040: Implement Context API for Donor/Donation State](TICKET-040-implement-context-api-donor-donation-state.md) - 📋 Planned (🟢 Low, L)
- [TICKET-041: Add Test Coverage for API Client Methods](TICKET-041-api-client-test-coverage.md) - 📋 Planned (🟡 Medium, M)
- [TICKET-042: Add Class-Level Documentation Comments](TICKET-042-add-class-documentation-comments.md) - 📋 Planned (🟡 Medium, S)
- [TICKET-043: Refine Controller Concerns Implementation](TICKET-043-refine-controller-concerns-implementation.md) - 📋 Planned (🟢 Low, S)
- [TICKET-045: Refactor DonorImportService Complexity](TICKET-045-refactor-donor-import-service-complexity.md) - 📋 Planned (🟢 Low, M)

---

## Quick Stats

- **Total Tickets:** 45
- **Completed:** 14
- **In Progress:** 0
- **Planned:** 30
- **Blocked:** 1

### By Category
- **Feature Development:** 10 planned
- **Infrastructure:** 1 planned
- **Code Quality & Architecture:** 16 planned
- **Completed:** 14

---

*For ticket template and conventions, see [CLAUDE.md](../CLAUDE.md)*
