## [TICKET-089] Archived Donor Donation Visibility Policy

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Effort:** S (Small - 2-3 hours)
**Created:** 2025-11-05
**Source:** BACKLOG.md
**Dependencies:** TICKET-001 (Donor soft delete) ✅, TICKET-016 (Donation filtering) ✅

### User Story
As a user, I want clear, predictable behavior when viewing donations from archived donors so that I can make informed financial decisions and maintain accurate reports.

### Problem Statement
**Current Behavior (Undefined):**
- Donations from archived donors remain visible in donation list
- No visual indicator that donor is archived
- No filtering option to show/hide archived donor donations
- Business rule unclear: Should these donations be visible by default?

### Business Decision Required

**Option 1: Keep Visible with Indicator (RECOMMENDED)**
- Show all donations regardless of donor status
- Add "Archived Donor" badge/indicator
- Financial data always accessible
- **Pros:** Audit trail preserved, all data visible
- **Cons:** May show "deleted" entities

**Option 2: Hide by Default, Filterable**
- Hide archived donor donations by default
- Add filter toggle: "Show Archived Donor Donations"
- **Pros:** Cleaner default view
- **Cons:** Hidden data may surprise users

**Option 3: Always Visible (Current)**
- No change from current behavior
- Document as business rule
- **Pros:** No implementation needed
- **Cons:** No user awareness of donor status

### Acceptance Criteria (If Option 1 Chosen)

**Backend Changes:**
- [ ] Update DonationPresenter to include `donor_archived` boolean
  ```ruby
  def as_json(options = {})
    {
      # ...existing fields
      donor_archived: object.donor&.discarded?,
      donor_archived_at: object.donor&.discarded_at
    }
  end
  ```

**Frontend Changes:**
- [ ] Add archived donor indicator in DonationList
  - Badge/chip: "Archived Donor" (gray/muted color)
  - OR: Gray out entire row with opacity
  - Tooltip: "Donor archived on {date}"

- [ ] Update donation display logic
  ```tsx
  {donation.donor_archived && (
    <Chip
      label="Archived Donor"
      size="small"
      variant="outlined"
      sx={{ opacity: 0.6 }}
    />
  )}
  ```

- [ ] Optional: Add filter toggle
  - Checkbox: "Hide archived donor donations"
  - Filters out donations where `donor_archived === true`

**Tests:**
- [ ] RSpec: DonationPresenter includes donor_archived field
- [ ] Jest: Archived donor badge renders when donor_archived = true
- [ ] Cypress: Create donation → archive donor → verify badge appears

### Acceptance Criteria (If Option 2 Chosen)

**Backend Changes:**
- [ ] Add Ransack filter for donor status
  ```ruby
  # Allow filtering by donor archived status
  q[donor_discarded_at_null] = true  # Show only active donor donations
  ```

**Frontend Changes:**
- [ ] Hide archived donor donations by default
- [ ] Add filter toggle: "Show Archived Donor Donations"
- [ ] When enabled, show all donations (including archived donor)
- [ ] Add visual indicator when filter enabled

### Implementation (Recommended: Option 1)

**Backend:**
```ruby
# app/presenters/donation_presenter.rb
def as_json(options = {})
  {
    id: object.id,
    amount: object.amount,
    donor_id: object.donor_id,
    donor_name: object.donor&.name || 'Unknown Donor',
    donor_archived: object.donor&.discarded? || false,
    donor_archived_at: object.donor&.discarded_at,
    # ...other fields
  }
end
```

**Frontend:**
```tsx
// src/components/DonationList.tsx
<TableRow key={donation.id} sx={{ opacity: donation.donor_archived ? 0.7 : 1 }}>
  <TableCell>
    {donation.donor_name}
    {donation.donor_archived && (
      <Tooltip title={`Donor archived on ${donation.donor_archived_at}`}>
        <Chip
          label="Archived"
          size="small"
          variant="outlined"
          sx={{ ml: 1, opacity: 0.6 }}
        />
      </Tooltip>
    )}
  </TableCell>
  <TableCell>{formatCurrency(donation.amount)}</TableCell>
  <TableCell>{donation.date}</TableCell>
</TableRow>
```

### Files to Modify
**Backend:**
- `app/presenters/donation_presenter.rb` (add donor_archived fields)
- `spec/presenters/donation_presenter_spec.rb` (add 2 tests)

**Frontend:**
- `src/types/donation.ts` (add donor_archived, donor_archived_at fields)
- `src/components/DonationList.tsx` (add badge/indicator)
- `src/components/DonationList.test.tsx` (add 3 tests)

**Cypress:**
- `cypress/e2e/donor-archive.cy.ts` (extend with donation visibility test)

### Testing Strategy
1. Create donation for active donor → verify no badge
2. Archive donor → verify badge appears on donation
3. Restore donor → verify badge disappears
4. Filter donations → verify archived donor donations still included

### Estimated Time
- Backend: 1 hour (presenter + tests)
- Frontend: 1 hour (badge + tests)
- E2E: 30 minutes
- **Total:** 2.5 hours

### Related Tickets
- TICKET-001: Donor Soft Delete ✅
- TICKET-016: Donation List Filtering ✅
- TICKET-062: Donor Cascade Delete Strategy ✅

### Notes
- **Business Decision:** Requires user/stakeholder input on preferred option
- **Audit Compliance:** Recommend Option 1 (always visible with indicator)
- **Documentation:** Update CLAUDE.md with chosen policy
- **Future:** Add report filtering to include/exclude archived donor donations
