## [TICKET-016] Donation List Filtering & Date Range

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Dependencies:** TICKET-006+007 (Basic donation list must exist)

### User Story
As a user, I want to filter donations by donor and date range so that I can find specific donations and analyze giving patterns.

### Acceptance Criteria
- [ ] Backend: Add donor_id filter parameter to GET /api/donations
- [ ] Backend: Add start_date and end_date filter parameters
- [ ] Backend: Use Ransack or custom scopes for filtering
- [ ] Frontend: Donor dropdown filter (shows all donors)
- [ ] Frontend: Date range picker (start date and end date inputs)
- [ ] Frontend: "Clear Filters" button
- [ ] Frontend: Show active filter count indicator
- [ ] RSpec tests for filtering logic
- [ ] Jest tests for filter controls
- [ ] Cypress E2E test for filtering workflow

### Technical Notes
- **Ransack**: Consider using for complex queries
- **Custom scopes**: `scope :by_donor, scope :by_date_range`
- **Date range**: Use HTML5 date inputs initially, Material-UI DatePicker later
- **Filter persistence**: Store in URL query params (optional enhancement)
- **Donor filter**: Reuse donor list from DonorForm
- **Empty state**: Show message when no donations match filters

### Files Changed
- Backend: `app/controllers/api/donations_controller.rb` (add filtering)
- Backend: `app/models/donation.rb` (add scopes if not using Ransack)
- Backend: `spec/requests/donations_spec.rb` (add filter tests)
- Frontend: `src/components/DonationList.tsx` (add filter UI)
- Frontend: `src/components/DonationList.test.tsx` (add filter tests)
- Frontend: `cypress/e2e/donation-list.cy.ts` (update)

### Related Commits
- (To be added during commit)
