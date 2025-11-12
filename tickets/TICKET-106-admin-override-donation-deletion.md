## [TICKET-106] Admin Override for Donation Deletion

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Effort:** M (Medium - 3-4 hours)
**Created:** 2025-11-12
**Dependencies:** TICKET-086 (24-hour delete window) ✅, TICKET-008 (Authentication - for admin role check)

### User Story
As an admin, I want to override the 24-hour deletion restriction so that I can delete any donation regardless of age when correcting data entry errors or reconciling historical records.

### Problem Statement
**Current State (TICKET-086):**
- Users can delete donations within 24 hours
- Donations older than 24 hours cannot be deleted (data integrity protection)
- No override mechanism for admins
- Admins blocked from correcting old data entry errors

**Desired State:**
- Regular users: 24-hour deletion window (existing behavior)
- Admins: Can delete any donation regardless of age
- Admin override requires explicit confirmation
- Warning dialog explains consequences
- Audit log tracks admin deletions (future enhancement)

### Business Rules

**User Roles:**
- **Regular User:** Can delete donations < 24 hours old
- **Admin:** Can delete ANY donation (bypass 24-hour rule)

**Admin Override Requirements:**
- Confirmation dialog with warning
- Explain why deletion is restricted (data integrity)
- Require explicit acknowledgment
- Log admin deletions (future: audit trail)

**Safety Checks:**
- Prevent accidental bulk deletions
- Show donation details in confirmation
- Cannot undo deletion (permanent)

### Acceptance Criteria

#### Backend Changes
- [ ] Update `Donation#can_be_deleted?` method:
  - Accept optional `admin:` parameter
  - Return true if admin=true (bypass 24-hour check)
  - Keep existing 24-hour logic for non-admins

- [ ] Update DELETE `/api/donations/:id` endpoint:
  - Check if user is admin (requires TICKET-008 authentication)
  - Pass `admin: true` to can_be_deleted? if admin
  - Return different error if non-admin tries to delete old donation

- [ ] Update DonationPresenter:
  - Add `can_be_deleted_by_admin` field (always true if user is admin)
  - Keep existing `can_be_deleted` field (24-hour check)

- [ ] RSpec tests (6 new tests):
  - Model: can_be_deleted?(admin: true) returns true for old donations
  - Model: can_be_deleted?(admin: false) follows 24-hour rule
  - Controller: Admin can delete donations > 24 hours old
  - Controller: Non-admin cannot delete donations > 24 hours old
  - Presenter: can_be_deleted_by_admin true when user is admin
  - Controller: Returns 403 when non-admin tries admin delete

#### Frontend Changes
- [ ] Update DonationList:
  - Show delete button for admins even when can_be_deleted=false
  - Visual distinction: Different color/icon for admin override delete
  - Tooltip: "Admin override: Delete any donation"

- [ ] Create AdminDeleteConfirmation dialog:
  - Warning message about data integrity
  - Show donation details (amount, date, donor, age)
  - Checkbox: "I understand this is an admin override"
  - Require checkbox before enabling Delete button
  - Red "Delete" button for emphasis

- [ ] Update TypeScript Donation interface:
  - Add `can_be_deleted_by_admin: boolean`

- [ ] Update API client:
  - Add `admin_override: true` parameter to delete request

- [ ] Jest tests (5 new tests):
  - Admin sees delete button for old donations
  - Admin delete button has different styling
  - Confirmation dialog requires checkbox
  - Checkbox enables delete button
  - API called with admin_override=true

- [ ] Cypress E2E test (1 scenario):
  - Admin creates donation → wait (mock old donation) → delete with override → verify deleted

### Technical Implementation

#### Backend Model
```ruby
# app/models/donation.rb (UPDATE)
class Donation < ApplicationRecord
  # ... existing code ...

  # 24-hour deletion window (admin can bypass)
  def can_be_deleted?(admin: false)
    return true if admin  # Admins can delete any donation
    created_at > 24.hours.ago
  end
end
```

#### Backend Controller
```ruby
# app/controllers/api/donations_controller.rb (UPDATE)
def destroy
  donation = Donation.find(params[:id])

  # Check if user is admin (requires TICKET-008)
  is_admin = current_user&.admin? || false  # TODO: Implement after TICKET-008

  # Check if delete allowed
  unless donation.can_be_deleted?(admin: is_admin)
    error_message = is_admin ?
      'Cannot delete donation' :  # Should never happen for admin
      'Cannot delete donation older than 24 hours. Contact an administrator if you need to delete this record.'

    render json: { error: error_message }, status: :forbidden
    return
  end

  # Additional check: If admin override requested, verify user is actually admin
  if params[:admin_override] == 'true' && !is_admin
    render json: {
      error: 'Admin privileges required to override deletion restrictions'
    }, status: :forbidden
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
    can_be_deleted: object.can_be_deleted?,                      # 24-hour check
    can_be_deleted_by_admin: object.can_be_deleted?(admin: true), # NEW (always true for admins)
    created_at: object.created_at,
    # ... other fields
  }
end
```

#### Frontend - AdminDeleteConfirmation Dialog
```tsx
// src/components/AdminDeleteConfirmation.tsx (NEW)
import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Checkbox,
  FormControlLabel,
  Box,
  Alert
} from '@mui/material';
import { Warning } from '@mui/icons-material';
import { Donation } from '../types';
import { formatCurrency } from '../utils/currency';

interface AdminDeleteConfirmationProps {
  open: boolean;
  donation: Donation;
  onClose: () => void;
  onConfirm: () => void;
}

const AdminDeleteConfirmation = ({
  open,
  donation,
  onClose,
  onConfirm
}: AdminDeleteConfirmationProps) => {
  const [acknowledged, setAcknowledged] = useState(false);

  const handleConfirm = () => {
    if (acknowledged) {
      onConfirm();
      setAcknowledged(false);  // Reset for next time
    }
  };

  const donationAge = Math.floor(
    (new Date().getTime() - new Date(donation.created_at).getTime()) /
    (1000 * 60 * 60 * 24)
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Warning color="error" />
        Admin Override: Delete Donation
      </DialogTitle>

      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          <strong>Warning:</strong> You are about to delete a donation that is older than 24 hours.
          This requires admin privileges and bypasses normal data protection rules.
        </Alert>

        <Typography variant="body1" gutterBottom>
          <strong>Donation Details:</strong>
        </Typography>
        <Box sx={{ pl: 2, mb: 2 }}>
          <Typography variant="body2">
            <strong>Amount:</strong> {formatCurrency(donation.amount)}
          </Typography>
          <Typography variant="body2">
            <strong>Donor:</strong> {donation.donor_name}
          </Typography>
          <Typography variant="body2">
            <strong>Date:</strong> {donation.date}
          </Typography>
          <Typography variant="body2">
            <strong>Age:</strong> {donationAge} days old
          </Typography>
        </Box>

        <Alert severity="error" sx={{ mb: 2 }}>
          This action is <strong>permanent</strong> and cannot be undone.
        </Alert>

        <FormControlLabel
          control={
            <Checkbox
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
            />
          }
          label="I understand this is an admin override and I acknowledge the consequences"
        />
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleConfirm}
          color="error"
          variant="contained"
          disabled={!acknowledged}
        >
          Delete Donation
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AdminDeleteConfirmation;
```

#### Frontend - DonationList Integration
```tsx
// src/components/DonationList.tsx (UPDATE)
import AdminDeleteConfirmation from './AdminDeleteConfirmation';
import { useAuth } from '../hooks/useAuth';  // TODO: Implement after TICKET-008

const DonationList = ({ donations, onDelete }: DonationListProps) => {
  const { user } = useAuth();  // TODO: Implement after TICKET-008
  const isAdmin = user?.role === 'admin' || false;

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [adminDeleteDialogOpen, setAdminDeleteDialogOpen] = useState(false);
  const [donationToDelete, setDonationToDelete] = useState<Donation | null>(null);

  const handleDeleteClick = (donation: Donation) => {
    setDonationToDelete(donation);

    // Regular delete (< 24 hours)
    if (donation.can_be_deleted) {
      setDeleteDialogOpen(true);
    }
    // Admin override delete (> 24 hours)
    else if (isAdmin) {
      setAdminDeleteDialogOpen(true);
    }
  };

  const handleAdminDeleteConfirm = async () => {
    if (!donationToDelete) return;

    try {
      await apiClient.delete(`/api/donations/${donationToDelete.id}`, {
        params: { admin_override: 'true' }
      });
      setAdminDeleteDialogOpen(false);
      onDelete(donationToDelete.id);
    } catch (error: any) {
      if (error.response?.status === 403) {
        alert('Admin privileges required');
      } else {
        alert('Failed to delete donation');
      }
    }
  };

  return (
    <>
      <Table>
        <TableBody>
          {donations.map((donation) => (
            <TableRow key={donation.id}>
              <TableCell>{donation.donor_name}</TableCell>
              <TableCell>{formatCurrency(donation.amount)}</TableCell>
              <TableCell>{donation.date}</TableCell>
              <TableCell align="right">
                {/* Show delete button if within 24 hours OR admin */}
                {(donation.can_be_deleted || isAdmin) && (
                  <Tooltip
                    title={
                      donation.can_be_deleted
                        ? 'Delete donation (within 24 hours)'
                        : 'Admin override: Delete any donation'
                    }
                  >
                    <IconButton
                      aria-label="delete"
                      size="small"
                      onClick={() => handleDeleteClick(donation)}
                      color={donation.can_be_deleted ? 'default' : 'error'}  // Red for admin override
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

      {/* Regular Delete Dialog (existing) */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        {/* ... existing regular delete dialog ... */}
      </Dialog>

      {/* Admin Override Delete Dialog */}
      {donationToDelete && (
        <AdminDeleteConfirmation
          open={adminDeleteDialogOpen}
          donation={donationToDelete}
          onClose={() => setAdminDeleteDialogOpen(false)}
          onConfirm={handleAdminDeleteConfirm}
        />
      )}
    </>
  );
};
```

### UX Design

**DonationList - Admin View:**
```
Recent Donations (Admin View)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Donor          Amount      Date         Actions
────────────────────────────────────────────────
John Smith     $100.00     2025-11-12   [🗑️]      ← Normal delete (< 24hr)
Jane Doe       $50.00      2025-11-10   [🗑️]      ← Admin override (red icon)
Bob Johnson    $200.00     2025-10-01   [🗑️]      ← Admin override (red icon)
```

**Admin Override Confirmation Dialog:**
```
┌──────────────────────────────────────┐
│ ⚠️  Admin Override: Delete Donation  │
├──────────────────────────────────────┤
│ ⚠️  Warning: You are about to delete │
│     a donation that is older than    │
│     24 hours. This requires admin    │
│     privileges.                      │
│                                      │
│ Donation Details:                    │
│   Amount: $100.00                    │
│   Donor: John Doe                    │
│   Date: 2025-10-01                   │
│   Age: 42 days old                   │
│                                      │
│ ❌  This action is permanent and     │
│     cannot be undone.                │
│                                      │
│ ☐ I understand this is an admin      │
│   override and I acknowledge the     │
│   consequences                       │
│                                      │
│ [Cancel]  [Delete Donation] (red)    │
└──────────────────────────────────────┘
```

### Files to Create

**Frontend:**
- `src/components/AdminDeleteConfirmation.tsx` (NEW - ~120 lines)
- `src/components/AdminDeleteConfirmation.test.tsx` (NEW - 5 tests)

### Files to Modify

**Backend:**
- `app/models/donation.rb` (update can_be_deleted? to accept admin param)
- `app/controllers/api/donations_controller.rb` (check admin, handle override)
- `app/presenters/donation_presenter.rb` (add can_be_deleted_by_admin field)
- `spec/models/donation_spec.rb` (add 2 tests)
- `spec/requests/api/donations_spec.rb` (add 4 tests)

**Frontend:**
- `src/types/donation.ts` (add can_be_deleted_by_admin field)
- `src/components/DonationList.tsx` (add admin delete logic, +40 lines)
- `src/components/DonationList.test.tsx` (add 5 tests)
- `cypress/e2e/donation-entry.cy.ts` (add 1 test)

### Testing Strategy

**Backend RSpec (6 tests):**
1. can_be_deleted?(admin: true) returns true for donations > 24 hours
2. can_be_deleted?(admin: false) follows existing 24-hour rule
3. DELETE succeeds when admin deletes old donation with admin_override=true
4. DELETE returns 403 when non-admin tries admin_override=true
5. DELETE returns 403 when non-admin tries to delete old donation
6. DonationPresenter includes can_be_deleted_by_admin field

**Frontend Jest (5 tests):**
1. Admin sees delete button for donations > 24 hours
2. Non-admin does not see delete button for donations > 24 hours
3. Admin delete button has red color (error color)
4. AdminDeleteConfirmation requires checkbox before enabling delete
5. AdminDeleteConfirmation calls API with admin_override=true

**Cypress E2E (1 test):**
1. Login as admin → view old donation → click delete → check acknowledgment → confirm → verify deleted

### Authentication Integration (TICKET-008)

**Current State:**
- No authentication system (TICKET-008 not yet implemented)
- Cannot distinguish admin vs regular users

**Implementation Strategy:**
1. **Phase 1 (This Ticket):** Build UI and backend logic assuming admin check
2. **Phase 2 (After TICKET-008):** Integrate with authentication system
3. **Fallback:** If no auth, default to `isAdmin = false` (safe default)

**Code Stubs:**
```ruby
# Backend (temporary)
def is_admin
  # TODO: Replace with current_user.admin? after TICKET-008
  false  # Safe default: no admin privileges
end
```

```tsx
// Frontend (temporary)
const isAdmin = false;  // TODO: Replace with useAuth() after TICKET-008
```

### Audit Trail (Future Enhancement)

**Recommendation:** Log admin deletions for compliance/auditing

**Implementation (Future):**
```ruby
# app/models/audit_log.rb
class AuditLog < ApplicationRecord
  belongs_to :user
  belongs_to :auditable, polymorphic: true

  # Log admin deletion
  def self.log_admin_deletion(user, donation)
    create!(
      user: user,
      auditable: donation,
      action: 'admin_delete',
      metadata: {
        amount: donation.amount,
        donor_name: donation.donor.name,
        date: donation.date,
        age_in_days: (Time.current - donation.created_at) / 1.day
      }
    )
  end
end
```

### Estimated Time
- Backend model + controller: 1.5 hours
- Backend tests: 1 hour
- Frontend AdminDeleteConfirmation: 1.5 hours
- Frontend DonationList integration: 1 hour
- Frontend tests: 1 hour
- E2E test: 30 minutes
- **Total:** 6.5 hours

### Success Criteria
- [ ] Admins can delete donations older than 24 hours
- [ ] Non-admins still restricted to 24-hour window
- [ ] Admin delete button visually distinct (red color)
- [ ] Confirmation dialog requires explicit acknowledgment
- [ ] Warning explains consequences of admin override
- [ ] API validates admin privileges before allowing delete
- [ ] All tests passing (RSpec + Jest + Cypress)

### Related Tickets
- TICKET-086: Delete Donation Within 24-Hour Window ✅ (base feature)
- TICKET-008: Authentication with Google OAuth (required for admin role check)
- Future: Audit Log System (track admin deletions)

### Notes
- **Safety First:** Multiple confirmation steps prevent accidental admin deletions
- **Visual Distinction:** Red delete button signals "danger zone" for admins
- **Audit Trail:** Consider logging admin deletions for compliance (future enhancement)
- **Graceful Degradation:** Works without authentication (defaults to no admin access)
- **Data Integrity:** Admin override is intentionally difficult to use (requires acknowledgment)
- **Business Logic:** Admin override for correcting data entry errors, not routine use
