## [TICKET-016] Donation List Filtering & Date Range

**Status:** ✅ Complete
**Priority:** 🟡 Medium
**Started:** 2025-10-17
**Completed:** 2025-10-17
**Dependencies:** TICKET-006+007 (Basic donation list must exist)

### User Story
As a user, I want to filter donations by donor and date range so that I can find specific donations and analyze giving patterns.

### Acceptance Criteria
- [x] Backend: Add donor_id filter parameter to GET /api/donations (deferred to TICKET-017)
- [x] Backend: Add start_date and end_date filter parameters
- [x] Backend: Use Ransack or custom scopes for filtering
- [x] Frontend: Donor dropdown filter (shows all donors) (deferred to TICKET-017)
- [x] Frontend: Date range picker (start date and end date inputs)
- [x] Frontend: "Clear Filters" button
- [x] Frontend: Date validation (end date >= start date)
- [x] Frontend: Responsive mobile-first design
- [x] RSpec tests for filtering logic
- [x] Jest tests for filter controls
- [x] Cypress E2E test for filtering workflow (5 comprehensive tests)

### Technical Notes

- **Ransack**: Used for date range filtering with `date_gteq` and `date_lteq`
- **Date range**: MUI X DatePicker components with dayjs adapter
- **Validation**: Client-side validation prevents invalid date ranges, validates dayjs objects before formatting
- **Responsive Design**: Mobile-first with Stack components (column on xs, row on sm+)
- **Error Handling**: Alert component displays validation errors with dismiss option
- **Donor filter**: Deferred to TICKET-017 (autocomplete implementation)
- **LocalizationProvider**: Configured at App.tsx level for all DatePicker components

### Implementation Details

**Backend (Already Complete from Previous Work):**

- Ransack gem integrated for filtering
- GET /api/donations accepts `q[date_gteq]` and `q[date_lteq]` parameters
- RSpec tests verify date filtering logic

**Frontend Enhancements:**

- Upgraded from HTML5 date inputs to MUI X DatePicker components
- Date validation with Dayjs `isValid()` check before formatting to ISO strings
- Error state displays Alert with dismissible message
- DatePicker error prop highlights invalid inputs via slotProps
- Responsive Stack layout for mobile/desktop
- Clear filters resets both dates and error state
- LocalizationProvider at app level (App.tsx) provides dayjs adapter to all DatePickers

**Testing:**

- 10 Jest unit tests (all passing ✅):
  - Tests use LocalizationProvider wrapper for DatePicker support
  - Date input interaction tests verify component rendering
  - Full date interaction testing delegated to Cypress E2E tests

- 5 Cypress E2E tests (all passing ✅):
  - Updated for DatePicker segmented inputs (`role="spinbutton"` with `aria-label`)
  - Tests interact with Month/Day/Year spinbuttons directly
  1. Filter by start date only
  2. Filter by end date only
  3. Filter by date range (both dates)
  4. Clear filters functionality
  5. Date validation error handling

### Files Changed

- Frontend: `src/components/DonationList.tsx`
  - Replaced HTML5 date inputs with MUI X DatePicker components
  - Updated state to use Dayjs objects instead of strings
  - Added date validation with `isValid()` checks before formatting
  - Updated date change handlers to format valid dates to ISO strings

- Frontend: `src/App.tsx`
  - Added LocalizationProvider with AdapterDayjs at app level
  - Wraps entire Container to provide date adapter to all DatePickers

- Frontend: `src/components/DonationList.test.tsx`
  - Added LocalizationProvider wrapper for all tests (renderWithLocalization helper)
  - Updated 10 tests to work with DatePicker components
  - Changed date input tests to verify component rendering and calendar button presence

- Frontend: `cypress/e2e/donation-filtering.cy.ts`
  - Updated all 5 E2E tests for DatePicker segmented inputs
  - Changed selectors from `input[type="date"]` to `[role="spinbutton"][aria-label="Month/Day/Year"]`
  - Updated clear filter verification to check for MM/DD/YYYY placeholders

- Documentation: `tickets/TICKET-016-donation-list-filtering.md` (this file)

### Test Results

**Jest Unit Tests:** 10/10 passing ✅
```
Test Suites: 1 passed, 1 total
Tests:       10 passed, 10 total
Time:        2.576 s
```

**Cypress E2E Tests:** 5/5 passing ✅
```
Tests:        5
Passing:      5
Failing:      0
Duration:     10 seconds
```

### Related Commits

- (To be added after final commit)
