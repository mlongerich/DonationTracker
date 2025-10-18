## [TICKET-023] Donation List Donor Filter

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Dependencies:** TICKET-016 (Date filtering exists), TICKET-017 (Donor autocomplete pattern established)

### User Story
As a user, I want to filter the donation list by donor so that I can view all donations from a specific donor.

### Acceptance Criteria
- [ ] Frontend: Add donor autocomplete filter to DonationList component (above date filters)
- [ ] Reuse TICKET-017's autocomplete pattern (debounced search, same API endpoint)
- [ ] Backend: Already supports donor_id filtering via Ransack (`q[donor_id_eq]`)
- [ ] "Clear Filters" button clears donor selection along with dates
- [ ] Responsive design: donor filter stacks vertically on mobile
- [ ] Jest tests for donor filter interaction
- [ ] Cypress E2E test for donor filtering workflow
- [ ] Selected donor persists during pagination

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

### Related Tickets
- TICKET-016: Date range filtering (completed)
- TICKET-017: Donor autocomplete in DonationForm (completed)
- TICKET-007: Original donation list with basic donor_id filtering backend support
