## [TICKET-054] Add Create Sponsorship Form to Sponsorships Page

**Status:** ✅ Moved to TICKET-010
**Priority:** 🔴 High (was 🟢 Low - corrected to be part of MVP)
**Effort:** S (Small - 1-2 hours)
**Created:** 2025-10-21
**Moved to TICKET-010:** 2025-10-22
**Dependencies:** TICKET-010 (Sponsorships page exists) ✅

**Note:** This feature was originally marked as "Low Priority" but should have been part of the initial Sponsorships page MVP. Users cannot manually test sponsorship functionality without a way to create sponsorships from the Sponsorships page. Moved to TICKET-010 as incomplete acceptance criteria.

### User Story
As a user, I want to create a new sponsorship directly from the Sponsorships page without navigating to the Children page, so that I have a consistent workflow when managing sponsorships.

### Problem Statement
Currently, sponsorships can only be created via the Children page:
1. Navigate to Children page
2. Find child in list
3. Click "Add Sponsor" button
4. Fill form in modal

For users focused on sponsorship management (viewing the Sponsorships page), this workflow requires extra navigation. Adding a create form directly on the Sponsorships page provides an alternative, more direct workflow.

### Acceptance Criteria
- [ ] Add SponsorshipForm component above SponsorshipList on Sponsorships page
- [ ] Form shows all fields: DonorAutocomplete, ChildAutocomplete, Monthly Amount
- [ ] Form uses the same SponsorshipForm component already used in SponsorshipModal (from TICKET-010)
- [ ] Submit creates sponsorship and refreshes list
- [ ] Form resets after successful creation
- [ ] Error handling displays validation messages
- [ ] Jest unit tests validate form submission and list refresh
- [ ] Cypress E2E test validates full creation workflow from Sponsorships page

### Technical Approach

#### Option 1: Inline Form (Recommended)
Display SponsorshipForm directly on the page above the list:

```tsx
<Container maxWidth="lg">
  <Typography variant="h4" component="h1" gutterBottom>
    Sponsorships
  </Typography>

  {/* Create Form */}
  <Card sx={{ mb: 3, p: 2 }}>
    <Typography variant="h6" gutterBottom>
      Create New Sponsorship
    </Typography>
    <SponsorshipForm
      childId={undefined} // Shows ChildAutocomplete
      onSubmit={handleCreateSponsorship}
      onCancel={() => {/* Optional: collapse form */}}
    />
  </Card>

  {/* Filters (TICKET-053) */}
  <Box sx={{ mb: 2 }}>
    {/* Donor filter, Child filter, Show Ended toggle */}
  </Box>

  {/* List */}
  <SponsorshipList
    sponsorships={sponsorships}
    onEndSponsorship={handleEndSponsorship}
  />
</Container>
```

**Pros:**
- Always visible (no extra click to open)
- Follows pattern of other pages (DonorsPage, ProjectsPage)
- Simple implementation

**Cons:**
- Takes up vertical space even when not in use

#### Option 2: Collapsible Form
Add "Create Sponsorship" button that expands/collapses the form:

```tsx
<Button
  variant="contained"
  onClick={() => setShowForm(!showForm)}
  sx={{ mb: 2 }}
>
  {showForm ? 'Cancel' : 'Create Sponsorship'}
</Button>

{showForm && (
  <Card sx={{ mb: 3, p: 2 }}>
    <SponsorshipForm
      childId={undefined}
      onSubmit={handleCreateSponsorship}
      onCancel={() => setShowForm(false)}
    />
  </Card>
)}
```

**Pros:**
- Saves vertical space when not creating
- User-initiated action (clearer intent)

**Cons:**
- Extra click required
- More state management

### Files to Modify
- `src/pages/SponsorshipsPage.tsx` - Add form UI and create handler
- `src/pages/SponsorshipsPage.test.tsx` - Add creation tests

### Files to Reuse
- `src/components/SponsorshipForm.tsx` - Already exists (from TICKET-010) ✅
  - Supports optional `childId` prop
  - Shows ChildAutocomplete when `childId` not provided
  - Already tested and working

### Test Plan

**Jest Unit Tests:**
1. Form renders on Sponsorships page
2. Successful submission calls API POST `/api/sponsorships`
3. Successful submission refreshes sponsorship list
4. Form resets after successful creation
5. Validation errors display correctly

**Cypress E2E Test:**
- Navigate to Sponsorships page
- Select donor from autocomplete
- Select child from autocomplete
- Enter monthly amount
- Click Submit
- Verify new sponsorship appears in list
- Verify project was auto-created

### Implementation Notes

**Code Reuse:**
- SponsorshipForm component already supports this use case (childId is optional)
- No component changes needed
- Same `createSponsorship` API call used by Children page

**UX Consideration:**
This ticket provides an **alternative workflow**, not a replacement:
- **Children page modal:** Best for "I'm looking at a child, let me add their sponsor"
- **Sponsorships page form:** Best for "I want to create a sponsorship from scratch"

Both workflows are valid and serve different user intents.

### Related Tickets
- TICKET-010: Sponsorships page + SponsorshipForm component ✅
- TICKET-053: Sponsorships page filters (will be displayed above/below this form)

### Decision: Why Low Priority?

This is marked as **Low Priority** because:
1. ✅ Sponsorship creation already works (via Children page)
2. ✅ Users can already manage all sponsorships (view, end)
3. ✅ No blocking functionality gap
4. 🟢 Nice-to-have UI enhancement for power users

**Recommend implementing only if:**
- Users specifically request this workflow
- After TICKET-053 (filters) is complete
- As part of UX polish phase
