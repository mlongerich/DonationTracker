## [TICKET-015] Donation List Pagination

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Dependencies:** TICKET-006+007 (Basic donation list must exist)

### User Story
As a user, I want to paginate through donations so that I can view large numbers of donations efficiently without performance issues.

### Acceptance Criteria
- [ ] Backend: Add pagination to GET /api/donations (Kaminari)
- [ ] Backend: Return pagination metadata (total_count, total_pages, current_page, per_page)
- [ ] Backend: Default 25 donations per page
- [ ] Frontend: Add Pagination component below donation list
- [ ] Frontend: Pass page parameter to API
- [ ] Frontend: Display "Showing X-Y of Z donations"
- [ ] RSpec tests for pagination logic
- [ ] Jest tests for pagination controls
- [ ] Cypress E2E test for pagination navigation

### Technical Notes
- **Kaminari**: Already installed and used in DonorList
- **Response format**: Match donor pagination structure
- **Sort order**: Most recent first (created_at DESC)
- **Page size**: 25 per page (configurable)

### Files Changed
- Backend: `app/controllers/api/donations_controller.rb` (update index)
- Backend: `spec/requests/donations_spec.rb` (add pagination tests)
- Frontend: `src/components/DonationList.tsx` (add Pagination component)
- Frontend: `src/components/DonationList.test.tsx` (add pagination tests)
- Frontend: `cypress/e2e/donation-list.cy.ts` (update)

### Related Commits
- (To be added during commit)
