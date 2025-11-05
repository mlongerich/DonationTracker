## [TICKET-078] Fix Donation Filter Race Condition

**Status:** ✅ Complete
**Priority:** 🔴 High
**Created:** 2025-11-04
**Completed:** 2025-11-05
**Dependencies:** TICKET-016 (Date filtering), TICKET-023 (Donor filtering)

### User Story
As a user, I want the donor name and date filters on the donations page to work correctly so that I can filter donations reliably.

### Problem Description
The donation filters (donor name and date range) do not work properly due to a race condition in `DonationsPage.tsx`.

**Observed Issues:**

1. **Issue 1:** Typing and selecting a donor name does not filter the list. However, clicking "Clear Filters" makes the name disappear from the text field but THEN the list filters by that person. Clicking "Clear Filters" a second time actually clears the filter.

2. **Issue 2:** Typing and selecting a name AND then adding a start date filters the list by name, but shows ALL dates (not just dates after the start date). Clicking "Clear Filters" once then correctly displays the filtered results. Clicking again resets.

3. **Issue 3:** Typing and selecting a name AND then adding an end date follows the same pattern as Issue 2.

4. **Issue 4:** Typing and selecting a name, adding a start date AND an end date works correctly.

5. **Issue 5:** Clicking X on the donor name autocomplete to reset the text field does not re-filter without the name, regardless of whether dates are present or not.

**Root Cause:**
Race condition between state updates and API calls in `DonationsPage.tsx` (lines 26-34 and 60-63):

```typescript
// Lines 26-34: Update filters in separate useEffects
useEffect(() => {
  setFilter('date_gteq', dateRange.startDate);
  setFilter('date_lteq', dateRange.endDate);
}, [dateRange, setFilter]);

useEffect(() => {
  setFilter('donor_id_eq', selectedDonorId);
}, [selectedDonorId, setFilter]);

// Lines 60-63: Fetch immediately when state changes
useEffect(() => {
  fetchDonations();  // ❌ Uses OLD filter values from useRansackFilters!
}, [currentPage, dateRange, selectedDonorId]);
```

**Why "Clear Filters" click #2 works:**
- First click: Clears local state (donor, dates) → triggers fetch with OLD filters still in `useRansackFilters`
- Second click: Now the filters state has caught up → fetch with empty filters

### Acceptance Criteria
- [x] Issue 1: Selecting donor filters immediately (not after Clear Filters)
- [x] Issue 2: Donor + start date filters correctly on first selection
- [x] Issue 3: Donor + end date filters correctly on first selection
- [x] Issue 4: Donor + both dates continues to work correctly
- [x] Issue 5: Clicking X on donor autocomplete immediately re-filters
- [x] Clear filters button resets all filters on first click
- [x] Filters persist across pagination
- [x] Existing Jest tests pass (DonationsPage.test.tsx updated and passing)
- [x] Existing Cypress tests pass (all 6 tests in donation-filtering.cy.ts passing)
- [x] Manual testing confirms all filter combinations work
- [x] All 34 Cypress E2E tests pass (fixed 8 test files with various issues)

### Technical Approach

**Solution: Remove useRansackFilters and build query params directly**

The `useRansackFilters` hook adds unnecessary complexity for this simple use case. Build query params directly from component state to eliminate the race condition.

**Implementation:**

1. Remove `useRansackFilters` hook import and usage
2. Remove separate filter `useEffect` hooks (lines 26-34)
3. Update `fetchDonations()` to build query params directly from state
4. Simplify the fetch `useEffect` to depend only on the relevant state

```typescript
const fetchDonations = async () => {
  try {
    // Build query params directly from state
    const queryParams: Record<string, unknown> = {};

    if (dateRange.startDate) {
      queryParams['q[date_gteq]'] = dateRange.startDate;
    }
    if (dateRange.endDate) {
      queryParams['q[date_lteq]'] = dateRange.endDate;
    }
    if (selectedDonorId) {
      queryParams['q[donor_id_eq]'] = selectedDonorId;
    }

    const params = {
      page: currentPage,
      per_page: 10,
      ...queryParams,
    };

    const response = await apiClient.get('/api/donations', { params });
    setDonations(response.data.donations);
    setPaginationMeta(response.data.meta);
  } catch (error) {
    console.error('Failed to fetch donations:', error);
  }
};

// Single useEffect with correct dependencies
useEffect(() => {
  fetchDonations();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [currentPage, dateRange, selectedDonorId]);
```

### TDD Workflow

1. **Manual testing first** to confirm current broken behavior
2. **Implement fix** (remove useRansackFilters, build params directly)
3. **Manual testing** to verify all 5 issues are resolved
4. **Run Cypress E2E tests** to ensure no regressions
5. **Consider adding unit tests** for DonationsPage if needed

### Files to Change
- `donation_tracker_frontend/src/pages/DonationsPage.tsx` (main fix)
- Verify: `cypress/e2e/donation-filtering.cy.ts` (existing tests should still pass)

### Manual Testing Checklist
- [x] Filter by donor only → works on first selection
- [x] Filter by start date only → works immediately
- [x] Filter by end date only → works immediately
- [x] Filter by donor + start date → both filters apply immediately
- [x] Filter by donor + end date → both filters apply immediately
- [x] Filter by donor + both dates → works (already working)
- [x] Click X on donor autocomplete → immediately removes donor filter
- [x] Clear filters button → clears all filters on first click
- [x] Pagination with active filters → filters persist

### Implementation Summary

**Core Fix (DonationsPage.tsx):**
- Removed `useRansackFilters` hook to eliminate race condition
- Build query params directly in `fetchDonations()` from component state
- Single `useEffect` with correct dependencies triggers fetch
- All 5 reported issues resolved

**Cypress Test Fixes (8 files):**
1. **donation-filtering.cy.ts**: Refactored to create donations via UI instead of API
2. **children-sponsorship.cy.ts**: Fixed donor dropdown selection, amount input clearing, modal submit button scoping
3. **donation-entry.cy.ts**: Fixed donor autocomplete field selection
4. **donor-merge.cy.ts**: Fixed radio button selectors (label-based instead of legend-based)
5. **donor-search.cy.ts**: Removed non-existent UI element assertions
6. **donor-archive.cy.ts**: Fixed selectors and removed broken intercepts
7. **donor-display.cy.ts**: No changes (already passing)
8. **commands.ts**: Fixed cleanup endpoint from `/api/donors/all` to `/api/test/cleanup`

**Pre-commit Updates:**
- Added Jest and Cypress test runs to `scripts/pre-commit-frontend.sh`

**Test Results:**
- All 34 Cypress E2E tests passing (11 spec files)
- All Jest unit tests passing
- Manual testing confirmed all filter scenarios work correctly

### Related Tickets
- TICKET-016: Date range filtering implementation
- TICKET-023: Donor filter implementation
- TICKET-032: useRansackFilters hook (may need deprecation warning added)
- TICKET-046: Project filter (planned - should learn from this fix)

### Notes
- This bug has existed since TICKET-023 was implemented
- The `useRansackFilters` hook is designed for more complex scenarios with many filters
- For simple cases (3 filters), direct query param building is clearer and eliminates race conditions
- After this fix, evaluate if other pages using `useRansackFilters` have similar issues
- Consider adding warning to `useRansackFilters` documentation about race conditions
