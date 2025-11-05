## [TICKET-086] Delete Donation Within 24-Hour Window

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Effort:** S (Small - 1-2 hours)
**Created:** 2025-11-05
**Dependencies:** None

### User Story
As a user, I want to delete donations that were accidentally created within the last 24 hours so that I can quickly correct mistakes without affecting historical financial records.

### Problem Statement
**Current State:**
- No UI for deleting donations
- Users cannot easily fix accidentally created donations
- Must contact admin or manually edit database

**Desired State:**
- Delete icon appears on donations < 24 hours old
- User can delete recent donations with confirmation
- Historical donations (>24 hours) cannot be deleted via UI
- Preserves financial data integrity

### Business Rules
**24-Hour Window Policy:**
- **Why 24 hours:** Balance between error correction and data integrity
- **After 24 hours:** Donation is considered "locked" financial record
- **Rationale:** Same day/next day corrections allowed, prevents historical tampering

**Data Integrity:**
- DELETE endpoint validates 24-hour window in backend (not just frontend)
- Donations linked to sponsorships may have additional restrictions
- Audit log recommendation: Track deletions (future enhancement)

### Acceptance Criteria

#### Backend Changes
- [ ] Update DELETE `/api/donations/:id` endpoint
  - Verify donation `created_at` is within 24 hours of current time
  - Return 422 Unprocessable Entity if >24 hours old
  - Error message: "Cannot delete donation older than 24 hours"
  - Cascade check: Prevent delete if donation is only payment for sponsorship (business decision)

- [ ] Add `can_be_deleted?` method to Donation model
  ```ruby
  def can_be_deleted?
    created_at > 24.hours.ago
  end
  ```

- [ ] Update DonationPresenter to include `can_be_deleted` field

- [ ] RSpec tests (6 new tests)
  - Model: can_be_deleted? returns true when < 24 hours
  - Model: can_be_deleted? returns false when > 24 hours
  - Request: DELETE succeeds when < 24 hours
  - Request: DELETE returns 422 when > 24 hours
  - Request: DELETE returns 404 when donation not found
  - Request: Presenter includes can_be_deleted field

#### Frontend Changes
- [ ] Add delete icon button to DonationList
  - Only show when `donation.can_be_deleted === true`
  - IconButton with DeleteIcon
  - Tooltip: "Delete donation (within 24 hours only)"

- [ ] Add confirmation dialog
  - "Are you sure you want to delete this donation?"
  - Show amount, date, donor name
  - "Cancel" and "Delete" buttons

- [ ] Handle delete operation
  - Call DELETE `/api/donations/:id`
  - Show success message on delete
  - Show error message if deletion fails (>24 hours)
  - Refresh donation list after successful delete

- [ ] Update TypeScript Donation interface
  - Add `can_be_deleted: boolean`

- [ ] Jest tests (5 new tests)
  - Delete button visible when can_be_deleted = true
  - Delete button hidden when can_be_deleted = false
  - Delete button triggers confirmation dialog
  - Confirmation dialog calls API on confirm
  - Error message shown when API returns 422

- [ ] Cypress E2E tests (2 scenarios)
  - Create donation → delete within 24 hours → verify removed from list
  - Attempt to delete old donation (mocked) → verify error message

### Technical Implementation

#### Backend Model
```ruby
# app/models/donation.rb (UPDATE)
class Donation < ApplicationRecord
  # ... existing code ...

  # 24-hour deletion window
  def can_be_deleted?
    created_at > 24.hours.ago
  end

  # Optional: Additional business rule
  def safe_to_delete?
    can_be_deleted? && !sole_sponsorship_payment?
  end

  private

  def sole_sponsorship_payment?
    sponsorship.present? && sponsorship.donations.count == 1
  end
end
```

#### Backend Controller
```ruby
# app/controllers/api/donations_controller.rb (UPDATE)
def destroy
  donation = Donation.find(params[:id])

  unless donation.can_be_deleted?
    render json: {
      error: 'Cannot delete donation older than 24 hours'
    }, status: :unprocessable_entity
    return
  end

  donation.destroy!
  head :no_content
rescue ActiveRecord::RecordNotFound
  render json: { error: 'Donation not found' }, status: :not_found
end
```

#### Backend Presenter
```ruby
# app/presenters/donation_presenter.rb (UPDATE)
def as_json(options = {})
  {
    id: object.id,
    amount: object.amount,
    date: object.date,
    donor_name: object.donor&.name,
    project_title: object.project&.title,
    can_be_deleted: object.can_be_deleted?, # NEW
    created_at: object.created_at,
    # ... other fields
  }
end
```

#### Frontend DonationList
```tsx
// src/components/DonationList.tsx (UPDATE)
import DeleteIcon from '@mui/icons-material/Delete';

const DonationList = ({ donations, onDelete }: DonationListProps) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [donationToDelete, setDonationToDelete] = useState<Donation | null>(null);

  const handleDeleteClick = (donation: Donation) => {
    setDonationToDelete(donation);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!donationToDelete) return;

    try {
      await apiClient.delete(`/api/donations/${donationToDelete.id}`);
      setDeleteDialogOpen(false);
      onDelete(donationToDelete.id); // Callback to refresh list
    } catch (error: any) {
      if (error.response?.status === 422) {
        alert(error.response.data.error); // Show 24-hour error
      } else {
        alert('Failed to delete donation');
      }
    }
  };

  return (
    <>
      <TableContainer>
        <Table>
          <TableBody>
            {donations.map((donation) => (
              <TableRow key={donation.id}>
                <TableCell>{donation.donor_name}</TableCell>
                <TableCell>{formatCurrency(donation.amount)}</TableCell>
                <TableCell>{donation.date}</TableCell>
                <TableCell align="right">
                  {donation.can_be_deleted && (
                    <Tooltip title="Delete donation (within 24 hours only)">
                      <IconButton
                        aria-label="delete"
                        size="small"
                        onClick={() => handleDeleteClick(donation)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Donation?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this donation?
          </Typography>
          {donationToDelete && (
            <Box sx={{ mt: 2 }}>
              <Typography><strong>Amount:</strong> {formatCurrency(donationToDelete.amount)}</Typography>
              <Typography><strong>Donor:</strong> {donationToDelete.donor_name}</Typography>
              <Typography><strong>Date:</strong> {donationToDelete.date}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
```

### UX Design

**Donation List with Delete Icon:**
```
Recent Donations
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Donor          Amount      Date         Actions
────────────────────────────────────────────────
John Smith     $100.00     2025-11-05   [🗑️] ← Shows only for <24hr
Jane Doe       $50.00      2025-11-04   [🗑️]
Bob Johnson    $200.00     2025-11-03   (no icon, >24hr)
```

**Confirmation Dialog:**
```
┌────────────────────────────┐
│ Delete Donation?           │
│                            │
│ Are you sure you want to   │
│ delete this donation?      │
│                            │
│ Amount: $100.00            │
│ Donor: John Smith          │
│ Date: 2025-11-05           │
│                            │
│ [Cancel]  [Delete]         │
└────────────────────────────┘
```

### Edge Cases

**1. Time Zone Handling:**
- Use server time (UTC) for `created_at`
- 24-hour calculation done on backend
- Frontend only shows/hides button based on `can_be_deleted` flag

**2. Concurrent Deletion:**
- If user leaves page open >24 hours, delete button should disappear
- Backend validation ensures 24-hour rule enforced

**3. Sponsorship Donations:**
- Optional: Prevent delete if only donation for sponsorship
- Business decision: Allow delete but warn user
- See `sole_sponsorship_payment?` method

**4. Stripe Imported Donations:**
- Should Stripe donations be deletable?
- **Recommendation:** Yes, but log for reconciliation
- Future: Add audit trail for deleted donations

### Files to Modify

**Backend:**
- `app/models/donation.rb` (add can_be_deleted? method)
- `app/controllers/api/donations_controller.rb` (update destroy action)
- `app/presenters/donation_presenter.rb` (add can_be_deleted field)
- `spec/models/donation_spec.rb` (add 2 tests)
- `spec/requests/api/donations_spec.rb` (add 4 tests)

**Frontend:**
- `src/types/donation.ts` (add can_be_deleted field)
- `src/components/DonationList.tsx` (add delete button + dialog)
- `src/api/client.ts` (add deleteDonation method if missing)
- `src/components/DonationList.test.tsx` (add 5 tests)
- `cypress/e2e/donation-entry.cy.ts` (add 2 tests)

### Testing Strategy

**Backend RSpec (6 tests):**
1. `can_be_deleted?` returns true for donation created 1 hour ago
2. `can_be_deleted?` returns false for donation created 25 hours ago
3. DELETE succeeds for donation < 24 hours old
4. DELETE returns 422 for donation > 24 hours old
5. DELETE returns 404 for non-existent donation
6. DonationPresenter includes can_be_deleted field

**Frontend Jest (5 tests):**
1. Delete button visible when can_be_deleted = true
2. Delete button hidden when can_be_deleted = false
3. Clicking delete button opens confirmation dialog
4. Confirming deletion calls API and refreshes list
5. Error message shown when API returns 422

**Cypress E2E (2 tests):**
1. Create donation → click delete → confirm → verify removed from list
2. Verify delete icon not shown for donations > 24 hours (use test endpoint to create old donation)

### Time Calculation Example

**Backend (Ruby):**
```ruby
# 24 hours ago
24.hours.ago # => 2025-11-04 12:00:00 UTC

# Check if donation is recent
donation.created_at > 24.hours.ago # => true/false
```

**Frontend (TypeScript):**
```typescript
// Backend provides can_be_deleted flag
// No frontend calculation needed (trust backend)
{donation.can_be_deleted && <DeleteIcon />}
```

### Estimated Time
- Backend model + controller: 1 hour
- Backend tests: 30 minutes
- Frontend delete button + dialog: 1 hour
- Frontend tests: 30 minutes
- E2E tests: 30 minutes
- **Total:** ~3.5 hours

### Success Criteria
- [ ] Delete icon appears only on donations < 24 hours old
- [ ] Confirmation dialog shows before deletion
- [ ] DELETE endpoint validates 24-hour window
- [ ] Error message shown when deletion fails
- [ ] Donation list refreshes after successful delete
- [ ] All tests passing (RSpec + Jest + Cypress)
- [ ] Backend validation prevents historical data changes

### Related Tickets
- TICKET-038: Cascade Delete Strategy ✅ (defines deletion policies)
- TICKET-068: Global Error Handling ✅ (422 error handling pattern)

### Notes
- **Data Integrity:** 24-hour window prevents accidental historical changes
- **User Experience:** Quick error correction without affecting audit trail
- **Future Enhancement:** Add audit log for deleted donations (soft delete alternative)
- **Business Decision Needed:** Should Stripe donations be deletable? (Recommendation: Yes)
