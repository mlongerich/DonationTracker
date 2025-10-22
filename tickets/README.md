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

*Completed tickets moved to [completed/](completed/) folder.*

- [TICKET-001: Donor Soft Delete with Archive/Restore](completed/TICKET-001-donor-soft-delete-archive-restore.md) - ✅ Complete (2025-10-07)
- [TICKET-002: Stripe CSV Donor Import via CLI (Iteration 1)](completed/TICKET-002-stripe-csv-donor-import.md) - ✅ Complete (2025-10-07)
- [TICKET-003: Hide Auto-Generated Emails in Donor Display](completed/TICKET-003-hide-auto-generated-emails.md) - ✅ Complete (2025-10-07)
- [TICKET-004: Manual Donor Merge with Field Selection](completed/TICKET-004-manual-donor-merge-field-selection.md) - ✅ Complete (2025-10-15)
- [TICKET-006: Simple Donation Entry](completed/TICKET-006-simple-donation-entry.md) - ✅ Complete (2025-10-15)
- [TICKET-007: Donation List History View](completed/TICKET-007-donation-list-history-view.md) - ✅ Complete (2025-10-15)
- [TICKET-009: Project-Based Donations](completed/TICKET-009-project-based-donations.md) - ✅ Complete (2025-10-19)
- [TICKET-013: Fix Docker Frontend Infrastructure Issues](completed/TICKET-013-fix-docker-frontend-infrastructure.md) - ✅ Complete (2025-10-08)
- [TICKET-014: Refactor Donor Merge Service Pattern Consistency](completed/TICKET-014-refactor-donor-merge-service-pattern-consistency.md) - ✅ Complete (2025-10-15)
- [TICKET-015: Donation List Pagination](completed/TICKET-015-donation-list-pagination.md) - ✅ Complete (2025-10-17)
- [TICKET-016: Donation List Filtering & Date Range](completed/TICKET-016-donation-list-filtering.md) - ✅ Complete (2025-10-18)
- [TICKET-017: Replace Donor Dropdown with Autocomplete Search](completed/TICKET-017-donor-autocomplete-search.md) - ✅ Complete (2025-10-16)
- [TICKET-020: Consistent Material-UI Styling for DonationForm](completed/TICKET-020-donation-form-material-ui-styling.md) - ✅ Complete (2025-10-20)
- [TICKET-023: Donation List Donor Filter](completed/TICKET-023-donation-list-donor-filter.md) - ✅ Complete (2025-10-18)
- [TICKET-028: Extract Controller Concerns for Pagination/Filtering](completed/TICKET-028-extract-controller-concerns-pagination-filtering.md) - ✅ Complete (2025-10-18)
- [TICKET-029: Implement Presenter Pattern for API Responses](completed/TICKET-029-implement-presenter-pattern-api-responses.md) - ✅ Complete (2025-10-18)
- [TICKET-030: Refactor App.tsx into Multi-Page Architecture](completed/TICKET-030-refactor-app-multi-page-architecture.md) - ✅ Complete (2025-10-20)
- [TICKET-031: Extract DonorAutocomplete Shared Component](completed/TICKET-031-extract-donor-autocomplete-shared-component.md) - ✅ Complete (2025-10-18)
- [TICKET-044: Extract Shared TypeScript Types](completed/TICKET-044-extract-shared-typescript-types.md) - ✅ Complete (2025-10-19)
- [TICKET-047: Consistent Material-UI Card Styling for Lists](completed/TICKET-047-list-styling-standardization.md) - ✅ Complete (2025-10-20)

### 🔵 In Progress Tickets

- [TICKET-010: Children & Basic Sponsorship Tracking](TICKET-010-children-basic-sponsorship-tracking.md) - 🔵 In Progress (Started 2025-10-22)

### ⏸️ Blocked Tickets

- [TICKET-005: Auto-Reassign Donations After Donor Merge](TICKET-005-auto-reassign-donations-after-merge.md) - ⏸️ Blocked (Depends on TICKET-004 ✅, Donation model required)

### 📋 Planned Tickets

#### Feature Development
- [TICKET-008: Basic Authentication with Google OAuth](TICKET-008-basic-authentication-google-oauth.md) - 📋 Planned
- [TICKET-011: Recurring Donation Tracking](TICKET-011-recurring-donation-tracking.md) - 📋 Planned
- [TICKET-012: Stripe Webhook Integration](TICKET-012-stripe-webhook-integration.md) - 📋 Planned
- [TICKET-018: Fix Donation Amount Decimal Formatting](TICKET-018-donation-amount-decimal-formatting.md) - 📋 Planned
- [TICKET-019: Multi-Page Architecture with React Router](TICKET-019-multi-page-architecture-react-router.md) - 📋 Planned
- [TICKET-021: Quick Donor Creation from Donation Page](TICKET-021-quick-donor-creation-from-donation-page.md) - 📋 Planned
- [TICKET-022: Anonymous Donation Support](TICKET-022-anonymous-donation-support.md) - 📋 Planned
- [TICKET-024: Separate Test and Development Database Environments](TICKET-024-separate-test-dev-environments.md) - 📋 Planned
- [TICKET-025: Standardize Form Input Sizing Across Application](TICKET-025-standardize-form-input-sizing.md) - 📋 Planned
- [TICKET-026: Stripe Import & Webhook Integration](TICKET-026-stripe-import-webhook-integration.md) - 📋 Planned
- [TICKET-027: Stripe Description Mapping Management](TICKET-027-stripe-description-mapping-management.md) - 📋 Planned
- [TICKET-046: Add Project Filter to Donations Page](TICKET-046-donation-list-project-filter.md) - 📋 Planned

#### Sponsorship & Children Features
- [TICKET-048: Stripe Sponsorship & Child Extraction](TICKET-048-stripe-sponsorship-child-extraction.md) - 📋 Planned (🟡 Medium, M)
- [TICKET-049: Child Model Soft Delete with Archive/Restore](TICKET-049-child-soft-delete-archive-restore.md) - 📋 Planned (🟡 Medium, S)
- [TICKET-050: Children Page UI Standardization](TICKET-050-children-page-ui-standardization.md) - 📋 Planned (🟡 Medium, M) - Blocked by TICKET-049
- [TICKET-051: Add Project Type Sort/Filter to Projects Page](TICKET-051-project-page-type-sort-filter.md) - 📋 Planned (🟡 Medium, S)
- [TICKET-052: Improve Sponsorship Donation Linking](TICKET-052-improve-sponsorship-donation-linking.md) - 📋 Planned (🟡 Medium, M)
- [TICKET-053: Sponsorships Page Filters & Pagination UI](TICKET-053-sponsorships-page-filters-pagination-ui.md) - 📋 Planned (🟡 Medium, M)
- [TICKET-055: Sponsorship Management Actions](TICKET-055-sponsorship-reactivate-delete-actions.md) - 📋 Planned (🟡 Medium, S) - Depends on TICKET-056
- [TICKET-056: Sponsorship Business Logic & Validation](TICKET-056-sponsorship-business-logic-validation.md) - 📋 Planned (🔴 High, M)
- [TICKET-057: Children Page Multi-Sponsor Display](TICKET-057-children-page-multi-sponsor-display.md) - 📋 Planned (🟡 Medium, S)

#### Code Quality & Architecture Improvements
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

- **Total Tickets:** 57
- **Completed:** 20
- **In Progress:** 1
- **Planned:** 35
- **Blocked:** 1

### By Category
- **Feature Development:** 12 planned
- **Sponsorship & Children Features:** 8 planned
- **Code Quality & Architecture:** 15 planned
- **Completed:** 20
- **In Progress:** 1 (TICKET-010)
- **Blocked:** 1 (TICKET-005)

---

*For ticket template and conventions, see [CLAUDE.md](../CLAUDE.md)*
