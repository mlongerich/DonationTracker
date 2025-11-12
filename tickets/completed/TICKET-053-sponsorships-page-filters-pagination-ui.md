## [TICKET-053] Sponsorships Page Filters & Pagination UI

**Status:** ✅ Complete
**Priority:** 🟡 Medium
**Effort:** M (Medium - 3-4 hours)
**Created:** 2025-10-21
**Started:** 2025-10-29
**Completed:** 2025-11-12
**Blocked By:** ~~TICKET-064~~ ✅ Complete (Smart Sponsorship Detection)
**Dependencies:** TICKET-010 (Sponsorships page exists) ✅, TICKET-054 (Create form on page) ✅, TICKET-064 (Smart Sponsorship Detection) ✅

### User Story
As a user, I want to filter sponsorships by donor or child and toggle showing ended sponsorships, and navigate through pages of results, so that I can quickly find specific sponsorship relationships in a large dataset.

### Problem Statement
TICKET-010 implemented the Sponsorships page with backend pagination and filtering via Ransack, but **no UI controls** were added:
- Backend supports `?q[donor_id_eq]=123` but no donor filter dropdown
- Backend supports `?q[child_id_eq]=456` but no child filter dropdown
- Backend supports `?q[end_date_null]=true` but no "Show Ended" toggle
- Backend supports `?page=2&per_page=25` but no pagination controls

### Acceptance Criteria

#### Filters (✅ COMPLETE - Implemented as Omni-Search)
- [x] ~~Add DonorAutocomplete filter~~ **CHANGED:** Implemented as unified omni-search
  - [x] Search field accepts donor OR child name (single input)
  - [x] Sends `?q[donor_name_or_child_name_cont]=X` to API
  - [x] Debounced input (300ms) to reduce API calls
- [x] Add "Show Ended Sponsorships" checkbox
  - [x] Unchecked (default): only shows active sponsorships (`?q[end_date_null]=true`)
  - [x] Checked: shows all sponsorships (active + ended)
- [x] Filters work together (search + ended status)
- [x] Filter state persists during CRUD operations (add/end sponsorship)

#### Pagination UI (✅ COMPLETE)
- [x] Display MUI Pagination component below SponsorshipList
- [x] Show current page and total pages
- [x] Next/Previous buttons (MUI Pagination default)
- [x] Direct page number selection (MUI Pagination default)
- [x] Display "Showing X-Y of Z sponsorships" metadata
- [x] Pagination resets to page 1 when filters change

#### Testing
- [x] Jest: Filter interactions (omni-search, show ended toggle) - 10 tests passing
- [x] Jest: Pagination navigation (page select) - 3 new tests added
- [x] Jest: Combined filters + pagination behavior (reset on filter change)
- [x] Cypress E2E: Full filtering and pagination workflow - 5 tests created

### Technical Approach

#### Frontend Changes (SponsorshipsPage.tsx)

**State Management:**
```typescript
const [donorFilter, setDonorFilter] = useState<Donor | null>(null);
const [childFilter, setChildFilter] = useState<Child | null>(null);
const [showEnded, setShowEnded] = useState(false);
const [page, setPage] = useState(1);
const [totalPages, setTotalPages] = useState(0);
const [totalCount, setTotalCount] = useState(0);

useEffect(() => {
  fetchSponsorships();
}, [donorFilter, childFilter, showEnded, page]);

const fetchSponsorships = async () => {
  const params: any = { page, per_page: 25 };

  if (donorFilter) params.q = { ...params.q, donor_id_eq: donorFilter.id };
  if (childFilter) params.q = { ...params.q, child_id_eq: childFilter.id };
  if (!showEnded) params.q = { ...params.q, end_date_null: true };

  const response = await apiClient.get('/api/sponsorships', { params });
  setSponsorships(response.data.sponsorships);
  setTotalPages(response.data.meta.total_pages);
  setTotalCount(response.data.meta.total_count);
};
```

**Filter UI Layout:**
```tsx
<Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
  <DonorAutocomplete
    value={donorFilter}
    onChange={setDonorFilter}
    label="Filter by Donor"
  />
  <ChildAutocomplete
    value={childFilter}
    onChange={setChildFilter}
    label="Filter by Child"
  />
  <FormControlLabel
    control={
      <Checkbox
        checked={showEnded}
        onChange={(e) => setShowEnded(e.target.checked)}
      />
    }
    label="Show Ended Sponsorships"
  />
</Box>
```

**Pagination UI:**
```tsx
<Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
  <Typography variant="body2">
    Showing {(page - 1) * 25 + 1}-{Math.min(page * 25, totalCount)} of {totalCount} sponsorships
  </Typography>
  <Pagination
    count={totalPages}
    page={page}
    onChange={(e, value) => setPage(value)}
    color="primary"
  />
</Box>
```

### Files to Modify
- `src/pages/SponsorshipsPage.tsx` - Add filter state, UI controls, pagination
- `src/pages/SponsorshipsPage.test.tsx` - Add filter and pagination tests

### Files to Reference
- `src/pages/DonorsPage.tsx` - Pagination pattern already implemented
- `src/pages/ProjectsPage.tsx` - Similar filtering approach (TICKET-051 if completed)
- `src/components/DonorAutocomplete.tsx` - Already exists ✅
- `src/components/ChildAutocomplete.tsx` - Already exists (from TICKET-010) ✅

### Test Plan

**Jest Unit Tests:**
1. Donor filter changes trigger API call with `donor_id_eq`
2. Child filter changes trigger API call with `child_id_eq`
3. "Show Ended" checkbox toggles `end_date_null` parameter
4. Page change triggers API call with new page number
5. Filters reset page to 1
6. Multiple filters work together (donor + child + ended)

**Cypress E2E Test:**
- Navigate to Sponsorships page
- Select donor filter → verify list updates
- Select child filter → verify list updates
- Toggle "Show Ended" → verify ended sponsorships appear
- Navigate to page 2 → verify URL and list update
- Clear filters → verify all sponsorships shown

### Related Tickets
- TICKET-010: Sponsorships page implementation (backend filtering ready) ✅
- TICKET-051: Project page type filter (similar filtering pattern)
- TICKET-015: Donation list pagination (pagination UI reference) ✅

### Notes
- Backend already supports all filtering via Ransack (no API changes needed)
- Pagination metadata already returned in API responses
- DonorAutocomplete and ChildAutocomplete components already exist
- This ticket is **frontend-only** (pure UI enhancement)

### Completed Work (2025-10-29)

**✅ Omni-Search Filter:**
- Replaced separate donor/child autocompletes with single search bar
- Searches both donor name AND child name using Ransack OR predicate
- Debounced input (300ms) to reduce API calls
- Added `donor_name_or_child_name_cont` Ransack query parameter
- Backend: Added `ransackable_attributes` and `ransackable_associations` to Sponsorship, Donor, and Child models
- Tests: 10 frontend unit tests, 2 backend integration tests

**✅ Show Ended Sponsorships Checkbox:**
- Toggle between active-only and all sponsorships
- Default: unchecked (shows only active with `end_date_null: true`)
- Checked: shows all sponsorships (removes `end_date_null` filter)
- Tests: Frontend checkbox renders and toggles parameter

**✅ Backend Start Date Calculation:**
- Fixed `SponsorshipPresenter` to use `calculated_start_date` method
- `Sponsorship#calculated_start_date`: Returns earliest donation date → manual start_date → created_at
- Added `sponsorship_id` foreign key to donations table
- `Donation` belongs_to `sponsorship` (optional)
- `Sponsorship` has_many `donations` with restrict_with_exception
- Validation: Donations to sponsorship projects MUST have sponsorship_id
- Fixed sponsorship factory to allow model auto-project creation
- Tests: 7 new backend model tests (all 201 tests passing)

**✅ COMPLETED WORK - Final 5% (2025-11-12):**
- ✅ Extract pagination `meta` from API response (totalPages, totalCount)
- ✅ Add state variables: `totalPages`, `totalCount`, `setPage` handler
- ✅ Display MUI Pagination component below SponsorshipList
- ✅ Display "Showing X-Y of Z sponsorships" metadata text
- ✅ Update tests for pagination UI (3 new Jest tests)
- ✅ Pagination resets to page 1 on filter change
- ✅ Cypress E2E test suite (5 comprehensive integration tests)

**✅ UNBLOCKED (2025-11-12):** TICKET-064 completed - smart sponsorship detection now works in DonationForm. Can now create sponsorship donations and test end-to-end workflows.

### E2E Test Coverage
Created `cypress/e2e/sponsorships-pagination.cy.ts` with 5 integration tests:
1. Display pagination metadata and navigation for 30+ sponsorships
2. Navigate to page 2 and verify content changes
3. Reset to page 1 when search filter changes
4. Toggle ended sponsorships with "Show Ended" checkbox
5. Combine search and pagination correctly

### Implementation Notes (2025-10-29)

**Current Codebase Status:**
- ✅ SponsorshipsPage exists with basic pagination (`page` state on line 10)
- ✅ Create form already on page (TICKET-054 was merged into TICKET-010)
- ✅ Backend Ransack filtering fully implemented (`RansackFilterable` concern)
- ✅ Backend returns `meta` object with pagination data
- ⚠️ Frontend ignores `meta` object (line 21 doesn't extract metadata)
- ❌ No filter states (donorFilter, childFilter, showEnded) exist yet
- ❌ No filter UI components rendered
- ❌ No pagination UI component rendered

**What Needs to Be Added:**
1. Import Donor, Child types and autocomplete components
2. Add 5 state variables: donorFilter, childFilter, showEnded, totalPages, totalCount
3. Update fetchSponsorships to build Ransack query and extract metadata
4. Add useEffect to reset page when filters change
5. Add filter UI (2 autocompletes + 1 checkbox) above SponsorshipList
6. Add pagination UI (metadata text + Pagination component) below SponsorshipList
7. Update tests to cover filtering and pagination
