## [TICKET-050] Children Page: Add Search and Pagination

**Status:** 🔵 In Progress
**Priority:** 🟡 Medium
**Effort:** S (Small - 1-2 hours)
**Started:** 2025-11-03
**Completed:** TBD
**Dependencies:** TICKET-049 (Child soft delete backend) ✅ Complete

### User Story
As a user, I want to search children by name and navigate through paginated results on the Children page so that I can quickly find specific children in a large dataset, with the same consistent interface as the Donors and Donations pages.

### Already Implemented ✅

**From TICKET-049 (Child soft delete) and prior work:**
- ✅ ChildForm is always visible (conditionally shows create vs edit mode)
- ✅ Section headers "Add Child"/"Edit Child" and "List Children" (lines 164-165, 188-189)
- ✅ "Show Archived Children" checkbox toggle (lines 191-200)
- ✅ Archive/Restore buttons in ChildList based on child state (lines 99-154)
- ✅ Archive functionality (`handleArchive`) with error handling (lines 83-112)
- ✅ Restore functionality (`handleRestore`) (lines 114-133)
- ✅ Visual indicators for archived children (opacity: 0.6, "Archived" chip, tooltips) (lines 54, 66-68, 90-92 in ChildList)
- ✅ Display ALL active sponsors per child (not just first) (lines 56-58 in ChildList)
- ✅ Comma-separated sponsor list with amounts (e.g., "Sponsored by: John ($50/mo), Jane ($75/mo)")
- ✅ "Add Sponsor" button always visible (no condition on sponsor count) (lines 110-119 in ChildList)
- ✅ Comprehensive test coverage (530 lines in ChildrenPage.test.tsx + 167 lines in ChildList.test.tsx)
- ✅ Error snackbar for archive failures with 422 status codes (lines 219-228)
- ✅ Backend pagination support via `PaginationConcern` (ChildrenController line 14)
- ✅ Backend Ransack filtering support via `RansackFilterable` (ChildrenController line 13)

**Current State Analysis:**
- ChildrenPage has 80% of desired functionality already implemented
- Archive/restore workflow is fully functional
- Multi-sponsor display working correctly
- Only missing: search UI + pagination UI

### Acceptance Criteria (Remaining Work)

**ChildrenPage.tsx:**
- [ ] Remove `showForm` state (line 11) and "Add Child" button (lines 167-171)
- [ ] Import `useDebouncedValue` and `usePagination` hooks from '../hooks'
- [ ] Add `searchQuery` state and `debouncedQuery` using useDebouncedValue(searchQuery, 300)
- [ ] Add pagination state using `usePagination()` hook
- [ ] Add search TextField before ChildList (pattern: DonorsPage lines 119-126)
- [ ] Modify `fetchChildren` to include Ransack query params: `q: { name_cont: debouncedQuery }`
- [ ] Modify `fetchChildren` to include pagination params: `page`, `per_page: 10`
- [ ] Add useEffect to reset to page 1 when debouncedQuery changes
- [ ] Add Pagination component after ChildList (pattern: DonorsPage lines 157-166)
- [ ] Update fetchChildren calls in all handlers to preserve search/pagination state

**ChildrenPage.test.tsx:**
- [ ] Test: Search field updates state on change
- [ ] Test: Debounce delays search by 300ms
- [ ] Test: Search triggers API call with q[name_cont] param
- [ ] Test: Pagination appears when total_pages > 1
- [ ] Test: Page change triggers API call with new page number
- [ ] Test: Search resets page to 1

**Cypress E2E (Optional - Nice to Have):**
- [ ] Test: Search for child by name workflow
- [ ] Test: Pagination navigation

### Technical Implementation Details

#### State Management Pattern (from DonorsPage):
```tsx
import { useDebouncedValue, usePagination } from '../hooks';

// Remove line 11: const [showForm, setShowForm] = useState(false);

// Add:
const [searchQuery, setSearchQuery] = useState('');
const debouncedQuery = useDebouncedValue(searchQuery, 300);

const {
  currentPage,
  paginationMeta,
  setPaginationMeta,
  handlePageChange,
  resetToFirstPage,
} = usePagination();

// Reset to page 1 when search changes
useEffect(() => {
  resetToFirstPage();
}, [debouncedQuery, resetToFirstPage]);
```

#### fetchChildren Update:
```tsx
const loadChildren = async () => {
  // Build query params
  const queryParams: Record<string, unknown> = {};
  if (debouncedQuery) {
    queryParams.q = { name_cont: debouncedQuery };
  }

  const params: {
    include_sponsorships: boolean;
    include_discarded?: string;
    page?: number;
    per_page?: number;
    q?: { name_cont: string };
  } = {
    include_sponsorships: true,
    page: currentPage,
    per_page: 10,
    ...queryParams,
  };

  if (showArchived) {
    params.include_discarded = 'true';
  }

  const response = await apiClient.get('/api/children', { params });
  setChildren(response.data.children);
  setPaginationMeta(response.data.meta); // NEW: Extract pagination metadata

  // Build sponsorship map from nested data (existing logic)
  const sponsorshipMap = new Map<number, Sponsorship[]>();
  response.data.children.forEach((child: Child & { sponsorships?: Sponsorship[] }) => {
    if (child.sponsorships) {
      sponsorshipMap.set(child.id, child.sponsorships);
    }
  });
  setSponsorships(sponsorshipMap);
};
```

#### UI Changes:
```tsx
// Remove lines 167-171 (Add Child button)

// Add search field before ChildList (after line 190):
<TextField
  fullWidth
  placeholder="Search by name..."
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  sx={{ mb: 2 }}
  size="small"
/>

// Add pagination after ChildList (after line 209):
{paginationMeta && paginationMeta.total_pages > 1 && (
  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
    <Pagination
      count={paginationMeta.total_pages}
      page={currentPage}
      onChange={handlePageChange}
      color="primary"
    />
  </Box>
)}
```

### Testing Strategy

**Jest Unit Tests (6 new tests):**
1. Search field updates searchQuery state on change
2. Debounced search delays API call by 300ms
3. Search triggers fetchChildren with `q[name_cont]` param
4. Pagination component appears when total_pages > 1
5. Pagination component hidden when total_pages = 1
6. Page change triggers fetchChildren with new page number

**Pattern Reference:** DonorsPage.test.tsx (search/pagination tests)

### Files to Change
- `donation_tracker_frontend/src/pages/ChildrenPage.tsx` (add search + pagination)
- `donation_tracker_frontend/src/pages/ChildrenPage.test.tsx` (add 6 tests)
- `donation_tracker_frontend/cypress/e2e/children-page.cy.ts` (optional - search E2E test)

### Reference Files
- ✅ `donation_tracker_frontend/src/pages/DonorsPage.tsx` (lines 1-192) - Search + pagination pattern
- ✅ `donation_tracker_api/app/controllers/api/children_controller.rb` (line 13) - Ransack support confirmed
- ✅ `donation_tracker_frontend/src/hooks/useDebouncedValue.ts` - Debounce hook exists
- ✅ `donation_tracker_frontend/src/hooks/usePagination.ts` - Pagination hook exists

### Effort Justification

**Original Estimate:** 3-4 hours (Medium)
**Revised Estimate:** 1-2 hours (Small)

**Rationale:**
- 80% of ticket already complete (archive/restore/multi-sponsor/error handling)
- Only 4 simple changes needed (remove button, add search field, add pagination, update tests)
- All hooks and patterns already exist (copy-paste from DonorsPage)
- Backend already supports all required APIs (no API changes needed)
- Comprehensive test suite already exists (only need 6 additional tests)

### Related Commits
- TBD

### Related Tickets
- ✅ TICKET-049: Child soft delete backend (complete - provided archive/restore foundation)
- ✅ TICKET-030: Multi-page architecture refactoring (complete - provided page structure)
- 📋 TICKET-059: Child info display on donation pages (benefits from search/pagination here)

---

## Change Log

**2025-11-03: Ticket Scope Reduction**
- Removed already-implemented acceptance criteria (archive/restore/multi-sponsor/UI standardization)
- Focused scope on remaining work: search + pagination only
- Reduced effort estimate from 3-4 hours to 1-2 hours
- Added "Already Implemented" section documenting TICKET-049 completion
- Updated title to "Add Search and Pagination" (more accurate)
- Documented current state: 80% complete

**2025-10-24: Original Creation**
- Full UI standardization scope (included archive/restore/multi-sponsor features)
- Estimated 3-4 hours (Medium effort)
