## [TICKET-017] Replace Donor Dropdown with Autocomplete Search

**Status:** 📋 Planned
**Priority:** 🔴 High
**Started:** 2025-10-15
**Dependencies:** TICKET-006 (DonationForm exists)

### User Story
As a user, I want to search for donors by typing their name when recording a donation so that I can quickly find donors in a large database without scrolling through a long dropdown list.

### Acceptance Criteria
- [ ] Replace `<select>` dropdown with Material-UI `Autocomplete` component in DonationForm
- [ ] Implement debounced search with 300ms delay
- [ ] API endpoint queries: `/api/donors?q[name_or_email_cont]=searchterm&per_page=10`
- [ ] Display donor name and email in autocomplete options
- [ ] Fetch only matching donors (not all 1000)
- [ ] Handle loading state during search
- [ ] Handle empty search results gracefully
- [ ] Maintain selected donor after form submission
- [ ] Jest tests for autocomplete component behavior
- [ ] Cypress E2E test for donor search and selection

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

### Files Changed
- `donation_tracker_frontend/src/components/DonationForm.tsx` (update dropdown to autocomplete)
- `donation_tracker_frontend/src/components/DonationForm.test.tsx` (update tests)
- `donation_tracker_frontend/cypress/e2e/donation-entry.cy.ts` (update E2E tests)

### Related Commits
- (To be added during implementation)
