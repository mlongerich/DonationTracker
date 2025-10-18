## [TICKET-023] Donation List Donor Filter

**Status:** ✅ Complete
**Priority:** 🟡 Medium
**Dependencies:** TICKET-016 (Date filtering exists), TICKET-017 (Donor autocomplete pattern established)
**Completed:** 2025-10-18

### User Story
As a user, I want to filter the donation list by donor so that I can view all donations from a specific donor.

### Acceptance Criteria
- [x] Frontend: Add donor autocomplete filter to DonationList component (above date filters)
- [x] Reuse TICKET-017's autocomplete pattern (debounced search, same API endpoint)
- [x] Backend: Already supports donor_id filtering via Ransack (`q[donor_id_eq]`)
- [x] "Clear Filters" button clears donor selection along with dates
- [x] Responsive design: donor filter stacks vertically on mobile
- [x] Jest tests for donor filter interaction
- [x] Cypress E2E test for donor filtering workflow
- [x] Selected donor persists during pagination

### Technical Notes
- **API Endpoint**: `/api/donors?q[name_or_email_cont]=search&per_page=10` (existing)
- **Filtering**: `/api/donations?q[donor_id_eq]=123` (already supported by Ransack)
- **Pattern Reuse**: Copy autocomplete logic from DonationForm (TICKET-017)
- **Clear Filters**: Update existing handler to also clear donor selection
- **Layout**: Add donor autocomplete above existing date range filters in Stack

### Implementation Plan
1. Add donor autocomplete state to DonationList component
2. Copy autocomplete component from DonationForm
3. Add `onDonorChange` callback prop to DonationList
4. Update App.tsx to pass donor filter to API
5. Update "Clear Filters" to reset donor selection
6. Add Jest tests (similar to TICKET-017)
7. Add Cypress E2E test for donor filtering

### Files to Change
- `src/components/DonationList.tsx`
- `src/components/DonationList.test.tsx`
- `src/App.tsx` (add donor_id to donation query params)
- `cypress/e2e/donation-filtering.cy.ts` (add donor filter test)

### Implementation Summary
- Added donor autocomplete filter to DonationList component (src/components/DonationList.tsx:158-195)
- Reused debounced search pattern from TICKET-017 with 300ms delay
- Integrated with App.tsx state management (selectedDonorId state, handleDonorFilterChange handler)
- Backend Ransack filtering works correctly with `q[donor_id_eq]` parameter
- Clear Filters button resets donor selection along with date filters
- Added 3 Jest unit tests (DonationList.test.tsx) - all passing
- Added Cypress E2E test for donor filtering workflow - **6/6 tests passing**

### Cypress E2E Test Challenge Solved
Initial E2E test failed because Cypress was interacting with the WRONG autocomplete:
- **Issue**: Two "Donor" autocompletes exist (DonationForm at top + DonationList filter)
- **Solution**: Scoped selector to "Recent Donations" section using `cy.contains('h2', 'Recent Donations').parent()`
- **Selection Method**: Keyboard navigation (`{downarrow}{enter}`) more reliable than clicking for MUI Autocomplete
- **Test Strategy**: Verify UI state rather than intercepted API responses (timing more reliable)

### Related Tickets
- TICKET-016: Date range filtering (completed)
- TICKET-017: Donor autocomplete in DonationForm (completed)
- TICKET-007: Original donation list with basic donor_id filtering backend support
- TICKET-024: Separate test/dev environments (planned - to prevent E2E test data pollution)
