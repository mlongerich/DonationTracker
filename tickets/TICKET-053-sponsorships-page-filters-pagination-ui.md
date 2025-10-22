## [TICKET-053] Sponsorships Page Filters & Pagination UI

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Effort:** M (Medium - 3-4 hours)
**Created:** 2025-10-21
**Dependencies:** TICKET-010 (Sponsorships page exists) ✅

### User Story
As a user, I want to filter sponsorships by donor or child and toggle showing ended sponsorships, and navigate through pages of results, so that I can quickly find specific sponsorship relationships in a large dataset.

### Problem Statement
TICKET-010 implemented the Sponsorships page with backend pagination and filtering via Ransack, but **no UI controls** were added:
- Backend supports `?q[donor_id_eq]=123` but no donor filter dropdown
- Backend supports `?q[child_id_eq]=456` but no child filter dropdown
- Backend supports `?q[end_date_null]=true` but no "Show Ended" toggle
- Backend supports `?page=2&per_page=25` but no pagination controls

### Acceptance Criteria

#### Filters
- [ ] Add DonorAutocomplete filter above SponsorshipList
  - [ ] Label: "Filter by Donor"
  - [ ] Sends `?q[donor_id_eq]=X` to API when donor selected
  - [ ] Shows all sponsorships when cleared
- [ ] Add ChildAutocomplete filter above SponsorshipList
  - [ ] Label: "Filter by Child"
  - [ ] Sends `?q[child_id_eq]=Y` to API when child selected
  - [ ] Shows all sponsorships when cleared
- [ ] Add "Show Ended Sponsorships" checkbox
  - [ ] Unchecked (default): only shows active sponsorships (`?q[end_date_null]=true`)
  - [ ] Checked: shows all sponsorships (active + ended)
- [ ] Filters work together (donor + child + ended status)
- [ ] Filter state persists during CRUD operations (add/end sponsorship)

#### Pagination UI
- [ ] Display MUI Pagination component below SponsorshipList
- [ ] Show current page and total pages
- [ ] Next/Previous buttons
- [ ] Direct page number selection
- [ ] Display "Showing X-Y of Z sponsorships" metadata
- [ ] Pagination resets to page 1 when filters change

#### Testing
- [ ] Jest: Filter interactions (donor filter, child filter, show ended toggle)
- [ ] Jest: Pagination navigation (next, prev, page select)
- [ ] Jest: Combined filters + pagination behavior
- [ ] Cypress E2E: Full filtering and pagination workflow

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
