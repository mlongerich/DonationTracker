## [TICKET-007] Donation List & History View

**Status:** ✅ Complete
**Priority:** 🔴 High
**Started:** 2025-10-15
**Completed:** 2025-10-15
**Dependencies:** TICKET-006 (Donation model)

### User Story
As a user, I want to view all donations with filtering options so that I can see giving history and patterns.

### Acceptance Criteria
- [x] Backend: GET /api/donations with pagination (Kaminari)
- [x] Backend: Filter by donor_id query parameter (Ransack)
- [x] Backend: Filter by date range (date_gteq, date_lteq params via Ransack)
- [x] Backend: Sort by date descending (newest first)
- [x] Backend: Include donor name in response (eager load)
- [x] Backend: RSpec tests for filtering and pagination (7 tests)
- [x] Frontend: DonationList component displaying all donations
- [x] Frontend: Show amount, date, donor name for each donation
- [x] Frontend: Pagination controls (Material-UI Pagination component)
- [x] Frontend: Jest tests for pagination rendering (4 tests)
- [x] Filter by donor dropdown ✅ **COMPLETED in TICKET-023** (autocomplete donor filter)
- [x] Date range picker for filtering ✅ **COMPLETED in TICKET-016** (MUI X DatePicker)
- [x] Cypress E2E test for filtering ✅ **COMPLETED in TICKET-016** (donation-filtering.cy.ts)

### Technical Notes
- **TDD approach**: Red-Green-Refactor cycle followed for all tests (one test at a time)
- **Factory Bot**: All tests use factories instead of direct model creation
- **Pagination**: Kaminari, 25 per page default
- **Ransack Security**: Added `ransackable_attributes` to Donation model (required for Ransack filtering)
- **API Response Format**: `{donations: [...], meta: {total_count, total_pages, current_page, per_page}}`
- **Filtering**: Ransack predicates - `donor_id_eq`, `date_gteq`, `date_lteq`
- **Eager loading**: `Donation.includes(:donor)` to avoid N+1
- **Date filtering**: Use ransack or custom scopes
- **Frontend**: Material-UI DataGrid or custom table
- **Display format**: "$25.00 - 2025-01-15 - John Doe"

### Files Changed
- Backend: `app/controllers/api/donations_controller.rb` (added index with pagination/filtering)
- Backend: `app/models/donation.rb` (added `ransackable_attributes` method)
- Backend: `spec/requests/donations_spec.rb` (added 5 index tests: basic, sorting, pagination, donor filter, date range)
- Backend: `spec/factories/donations.rb` (updated with associations and Faker)
- Frontend: `src/components/DonationList.tsx` (created with pagination support)
- Frontend: `src/components/DonationList.test.tsx` (created, 4 tests)
- Frontend: `src/App.tsx` (updated fetchDonations to handle meta, pass pagination to DonationList)
- Frontend: `src/App.test.tsx` (fixed API mocks for new response format, fixed act() warnings)

### Key Implementation Details
- **Ransack Security Discovery**: Required `ransackable_attributes` class method for filtering
- **API Response Format Change**: From array to `{donations: [...], meta: {...}}` structure
- **Breaking Change Fix**: Updated frontend to handle `response.data.donations`
- **Pagination**: Kaminari with 25 per page default, Material-UI Pagination component
- **Filtering**: Ransack predicates `donor_id_eq`, `date_gteq`, `date_lteq`
- **TDD Methodology**: Strict one-test-at-a-time, Factory Bot for all tests
- **Jest Act() Warning Fix**: Added `waitFor` to wait for initial async effects

### Related Commits
- (To be added during commit)
