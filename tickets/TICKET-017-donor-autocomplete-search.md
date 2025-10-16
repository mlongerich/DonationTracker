## [TICKET-017] Replace Donor Dropdown with Autocomplete Search

**Status:** ✅ Complete
**Priority:** 🔴 High
**Started:** 2025-10-15
**Completed:** 2025-10-16
**Dependencies:** TICKET-006 (DonationForm exists)

### User Story
As a user, I want to search for donors by typing their name when recording a donation so that I can quickly find donors in a large database without scrolling through a long dropdown list.

### Acceptance Criteria
- [x] Replace `<select>` dropdown with Material-UI `Autocomplete` component in DonationForm
- [x] Implement debounced search with 300ms delay
- [x] API endpoint queries: `/api/donors?q[name_or_email_cont]=searchterm&per_page=10`
- [x] Display donor name and email in autocomplete options
- [x] Fetch only matching donors (not all 1000)
- [x] Handle loading state during search
- [x] Handle empty search results gracefully
- [x] Maintain selected donor after form submission
- [x] Jest tests for autocomplete component behavior (7 tests passing)
- [x] Cypress E2E test for donor search and selection (2 tests passing)
- [x] Hide mailinator emails consistently with donor list UX

### Technical Notes
- **Material-UI Autocomplete**: Similar to existing donor search pattern in App.tsx
- **Debouncing**: Prevent excessive API calls while typing
- **Performance**: Only fetch 10 results at a time instead of loading all donors
- **Mobile-friendly**: Autocomplete works better on mobile than long dropdowns
- **Consistency**: Matches existing donor search UX pattern

### Design Pattern
```typescript
<Autocomplete
  options={donorOptions}
  loading={loading}
  onInputChange={handleSearch} // Debounced
  getOptionLabel={(option) => `${option.name} (${option.email})`}
  renderInput={(params) => <TextField {...params} label="Donor" />}
/>
```

### Implementation Details

**Frontend Changes:**
- Replaced `<select>` with Material-UI `Autocomplete` component
- Implemented 300ms debounced search using `useEffect` with cleanup
- Dynamic API calls to `/api/donors?q[name_or_email_cont]=term&per_page=10`
- Loading spinner during search (CircularProgress in endAdornment)
- Empty state messages: "Start typing to search donors" / "No donors found"
- Email display uses `shouldDisplayEmail()` utility to hide mailinator addresses
- Format: `"Donor Name (email@example.com)"` or `"Donor Name (No email provided)"`

**Removed:**
- `allDonors` state from App.tsx (no longer pre-loading 1000+ donors)
- `fetchAllDonors()` function
- Dropdown-specific logic and props

**Tests:**
- 7 Jest unit tests (all passing)
- 2 Cypress E2E tests (all passing)
- New test for mailinator email hiding in autocomplete options

### Files Changed
- `donation_tracker_frontend/src/components/DonationForm.tsx` (replaced dropdown with autocomplete)
- `donation_tracker_frontend/src/components/DonationForm.test.tsx` (added 2 new tests)
- `donation_tracker_frontend/src/App.tsx` (removed allDonors state)
- `donation_tracker_frontend/cypress/e2e/donation-entry.cy.ts` (updated for autocomplete interaction)

### Performance Impact
- **Before**: Loaded 1000+ donors on page load
- **After**: Loads max 10 donors per search query
- **Improvement**: ~100x reduction in initial data transfer

### Related Commits
- frontend: implement donor autocomplete search with debouncing (TICKET-017)
