## [TICKET-021] Quick Donor Creation from Donation Page

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Started:** 2025-10-15
**Dependencies:** TICKET-017 (Autocomplete), TICKET-019 (DonationsPage)

### User Story
As a user, I want to create a new donor while recording a donation so that I don't have to navigate away from the donation page when I receive a gift from a first-time donor.

### Acceptance Criteria
- [ ] Autocomplete shows "Create new donor" option when no matches found
- [ ] Clicking "Create new donor" opens inline modal/form
- [ ] Modal contains donor name and email fields
- [ ] Successfully creating donor auto-selects them in autocomplete
- [ ] Modal can be canceled without losing donation form data
- [ ] Validation errors shown in modal
- [ ] After creation, user can immediately submit donation
- [ ] Jest tests for modal interaction
- [ ] Cypress E2E test for full donor creation + donation flow

### Technical Notes
- **Material-UI Dialog**: Use `Dialog` component for modal
- **State Management**: Maintain donation form state while modal is open
- **API Call**: Use existing `POST /api/donors` endpoint
- **UX Flow**:
  1. User types donor name in autocomplete
  2. No matches found → "Create new donor" option appears
  3. Click option → Dialog opens with DonorForm
  4. Submit → New donor created and auto-selected
  5. User continues with donation form
- **Reuse**: Consider reusing DonorForm component in modal

### UX Mockup
```
[Donation Form]
Amount: [___]
Date: [___]
Donor: [Search for donor...▼]
       → John Smith
       → Johnny Appleseed
       → ➕ Create new donor "John Doe"

[Clicks "Create new donor"]

┌─────────────────────────────┐
│ Create New Donor            │
│                             │
│ Name:  [John Doe        ]   │
│ Email: [john@example.com]   │
│                             │
│ [Cancel]  [Create Donor]    │
└─────────────────────────────┘
```

### Files Changed
- `donation_tracker_frontend/src/components/DonationForm.tsx` (add modal logic)
- `donation_tracker_frontend/src/components/QuickDonorCreate.tsx` (new modal component)
- `donation_tracker_frontend/src/components/DonationForm.test.tsx` (add modal tests)
- `donation_tracker_frontend/cypress/e2e/donation-entry.cy.ts` (test full flow)

### Related Commits
- (To be added during implementation)
