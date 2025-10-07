## [TICKET-007] Donation List & History View

**Status:** 📋 Planned
**Priority:** 🔴 High
**Dependencies:** TICKET-006 (Donation model)

### User Story
As a user, I want to view all donations with filtering options so that I can see giving history and patterns.

### Acceptance Criteria
- [ ] Backend: GET /api/donations with pagination (Kaminari)
- [ ] Backend: Filter by donor_id query parameter
- [ ] Backend: Filter by date range (start_date, end_date params)
- [ ] Backend: Sort by date descending (newest first)
- [ ] Backend: Include donor name in response (eager load)
- [ ] Frontend: DonationList component displaying all donations
- [ ] Frontend: Show amount, date, donor name for each donation
- [ ] Frontend: Pagination controls
- [ ] Frontend: Filter by donor dropdown
- [ ] Frontend: Date range picker for filtering
- [ ] RSpec tests for filtering and pagination
- [ ] Cypress E2E test for list view and filters

### Technical Notes
- **TDD approach**: Red-Green-Refactor cycle followed for all tests
- **Pagination**: Use Kaminari (already installed), 25 per page
- **Eager loading**: `Donation.includes(:donor)` to avoid N+1
- **Date filtering**: Use ransack or custom scopes
- **Frontend**: Material-UI DataGrid or custom table
- **Display format**: "$25.00 - 2025-01-15 - John Doe"

### Files Changed
- Backend: `app/controllers/api/donations_controller.rb` (add index)
- Backend: `spec/requests/donations_spec.rb` (update)
- Frontend: `src/components/DonationList.tsx` (new)
- Frontend: `src/api/client.ts` (add getDonations method)
- Frontend: `cypress/e2e/donation-list.cy.ts` (new)

### Related Commits
- (To be added during commit)
