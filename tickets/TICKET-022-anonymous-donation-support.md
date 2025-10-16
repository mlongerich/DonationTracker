## [TICKET-022] Anonymous Donation Support

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Started:** 2025-10-15
**Dependencies:** TICKET-006 (Donation model), TICKET-017 (Autocomplete)

### User Story
As a user, I want to record anonymous donations without selecting a donor so that I can track gifts where the donor wishes to remain unnamed or is unknown.

### Acceptance Criteria
- [ ] Backend: Make `donor_id` nullable in Donation model
- [ ] Backend: Update validations to allow nil donor_id
- [ ] Backend: Database migration to change column constraint
- [ ] Frontend: Add "Anonymous" option in donor autocomplete
- [ ] Frontend: Selecting "Anonymous" clears donor_id and submits null
- [ ] DonationList displays "Anonymous" for donations without donor
- [ ] API handles null donor_id gracefully in responses
- [ ] RSpec tests for anonymous donations
- [ ] Jest tests for anonymous option selection
- [ ] Cypress E2E test for anonymous donation flow

### Technical Notes
- **Database Migration**: `change_column_null :donations, :donor_id, true`
- **Model Validation**: Remove `presence: true` from donor_id, keep association optional
- **Autocomplete**: Add special "Anonymous" option at top of results
- **Display**: Show "Anonymous" instead of donor name when donor_id is null
- **API Response**: Include `donor_name: "Anonymous"` for null donor_id donations
- **Business Logic**: Ensure anonymous donations counted in totals/reports

### Backend Changes
```ruby
# Migration
def change
  change_column_null :donations, :donor_id, true
end

# Model
belongs_to :donor, optional: true
validates :donor_id, numericality: { only_integer: true }, allow_nil: true
```

### Frontend Changes
```typescript
// Autocomplete options
const options = [
  { id: null, name: 'Anonymous', email: '' },
  ...donorOptions
];

// Display
donor_name || 'Anonymous'
```

### Files Changed
- `donation_tracker_api/db/migrate/..._allow_null_donor_id.rb` (new migration)
- `donation_tracker_api/app/models/donation.rb` (update validation)
- `donation_tracker_api/spec/models/donation_spec.rb` (add anonymous tests)
- `donation_tracker_api/spec/requests/donations_spec.rb` (test null donor_id)
- `donation_tracker_frontend/src/components/DonationForm.tsx` (add Anonymous option)
- `donation_tracker_frontend/src/components/DonationList.tsx` (display Anonymous)
- `donation_tracker_frontend/cypress/e2e/donation-entry.cy.ts` (test anonymous flow)

### Related Commits
- (To be added during implementation)
