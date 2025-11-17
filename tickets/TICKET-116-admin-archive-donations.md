## [TICKET-116] Add Archive Functionality to Admin Page

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Size:** S (Small)
**Dependencies:**
- Requires decision: Should donations support soft delete (discarded_at)?
**Created:** 2025-11-17

---

### User Story
As an admin, I want to archive (soft delete) donations from the Admin Page so that I can hide invalid/duplicate/test donations from the main view without permanently deleting them.

---

### Context

**Why:** Some donations need to be hidden from normal views but retained for audit/historical purposes:
- Test donations created during development
- Duplicate donations flagged during import
- Invalid donations that shouldn't appear in reports

**Current State:** Donations have no soft delete support (no `discarded_at` column)

**Design Decision Required:** Do we want soft delete for donations?
- **Donors:** Already have soft delete (discarded_at)
- **Projects:** No soft delete (protected by restrict_with_exception)
- **Children:** Deferred soft delete (TICKET-049)
- **Donations:** Currently no soft delete

**Scope:** Add soft delete support to Donation model, add archive/restore actions to Admin Page

---

### Acceptance Criteria

**Backend (if soft delete chosen):**
- [ ] Add migration: `add_column :donations, :discarded_at, :datetime`
- [ ] Add index on `discarded_at` for query performance
- [ ] Include Discard::Model in Donation model
- [ ] Add `default_scope { kept }` OR explicit scoping in controllers
- [ ] Update cascade delete strategy (should archived donations block donor/project deletion?)
- [ ] Add archive/restore controller actions
- [ ] Add tests for soft delete behavior

**Frontend:**
- [ ] Add "Archive" button/icon to donation cards in Admin Page
- [ ] Show confirmation dialog before archiving
- [ ] Add "Archived" filter to show archived donations
- [ ] Add "Restore" button for archived donations
- [ ] Visual indicator (greyed out) for archived donations
- [ ] Add tests for archive/restore UI

**Alternative (if soft delete NOT chosen):**
- [ ] Add `hidden` boolean column instead of soft delete
- [ ] Simpler implementation, same UX

---

### Technical Approach

#### Option 1: Soft Delete with Discard Gem (Recommended)

```ruby
# Migration
class AddDiscardedAtToDonations < ActiveRecord::Migration[8.0]
  def change
    add_column :donations, :discarded_at, :datetime
    add_index :donations, :discarded_at
  end
end

# Model
class Donation < ApplicationRecord
  include Discard::Model
  # default_scope { kept }  # Auto-filter archived donations (careful with this!)
end

# Controller
def archive
  donation = Donation.find(params[:id])
  donation.discard
  render json: { donation: DonationPresenter.new(donation).as_json }
end

def restore
  donation = Donation.unscoped.find(params[:id])
  donation.undiscard
  render json: { donation: DonationPresenter.new(donation).as_json }
end
```

#### Option 2: Simple Hidden Flag

```ruby
# Migration
class AddHiddenToDonations < ActiveRecord::Migration[8.0]
  def change
    add_column :donations, :hidden, :boolean, default: false, null: false
    add_index :donations, :hidden
  end
end

# Model - no changes needed

# Controller
def hide
  donation = Donation.find(params[:id])
  donation.update!(hidden: true)
  render json: { donation: DonationPresenter.new(donation).as_json }
end

def unhide
  donation = Donation.find(params[:id])
  donation.update!(hidden: false)
  render json: { donation: DonationPresenter.new(donation).as_json }
end
```

#### Frontend

```tsx
// src/pages/AdminPage.tsx
const [showArchived, setShowArchived] = useState(false);

const handleArchive = async (donationId: number) => {
  if (confirm('Archive this donation? It will be hidden from normal views.')) {
    await apiClient.post(`/api/donations/${donationId}/archive`);
    fetchDonations(); // Refresh
  }
};

const handleRestore = async (donationId: number) => {
  await apiClient.post(`/api/donations/${donationId}/restore`);
  fetchDonations(); // Refresh
};

// Filter controls:
<FormControlLabel
  control={<Checkbox checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />}
  label="Show Archived"
/>

// Card render:
<Card sx={{ opacity: donation.discarded_at ? 0.5 : 1 }}>
  {/* ... donation content ... */}
  {donation.discarded_at ? (
    <Button onClick={() => handleRestore(donation.id)}>Restore</Button>
  ) : (
    <IconButton onClick={() => handleArchive(donation.id)}><ArchiveIcon /></IconButton>
  )}
</Card>
```

---

### Design Decisions Required

**1. Soft Delete vs Hidden Flag?**
- **Soft Delete (discarded_at):** Industry standard, consistent with Donor model, supports audit trail
- **Hidden Flag:** Simpler, doesn't affect scoping, easier to query

**Recommendation:** Soft delete (consistent with Donor pattern)

**2. Default Scope?**
- **Option A:** `default_scope { kept }` - Auto-filters archived, requires `.unscoped` for admin views
- **Option B:** Manual scoping - More explicit, no surprises

**Recommendation:** Manual scoping (less magic, explicit filtering)

**3. Cascade Delete Impact?**
- Should archived donations block donor/project deletion?
- Current: `has_many :donations, dependent: :restrict_with_exception`
- Options:
  - Only count non-archived donations for restriction
  - Count all donations (current behavior)

**Recommendation:** Count all donations (don't allow deleting donor/project with archived donations)

---

### Files to Create
- Migration: `db/migrate/YYYYMMDDHHMMSS_add_discarded_at_to_donations.rb`
- Tests for archive/restore actions

### Files to Modify
- `app/models/donation.rb` (include Discard::Model)
- `app/controllers/api/donations_controller.rb` (add archive/restore actions)
- `app/presenters/donation_presenter.rb` (include discarded_at)
- `config/routes.rb` (add archive/restore routes)
- `src/types/donation.ts` (add discarded_at field)
- `src/pages/AdminPage.tsx` (add archive UI)

---

### Testing Strategy

**Backend Tests:**
```ruby
describe 'POST /api/donations/:id/archive' do
  it 'soft deletes donation' do
    donation = create(:donation)
    post "/api/donations/#{donation.id}/archive"

    expect(response).to have_http_status(:ok)
    expect(donation.reload.discarded?).to be true
  end
end

describe 'POST /api/donations/:id/restore' do
  it 'restores archived donation' do
    donation = create(:donation, discarded_at: Time.current)
    post "/api/donations/#{donation.id}/restore"

    expect(response).to have_http_status(:ok)
    expect(donation.reload.discarded?).to be false
  end
end
```

**Frontend Tests:**
```typescript
it('archives donation when archive button clicked', async () => {
  render(<AdminPage />);

  fireEvent.click(screen.getByLabelText('Archive'));
  fireEvent.click(screen.getByText('OK')); // Confirm dialog

  await waitFor(() => {
    expect(screen.queryByText('Donation #123')).not.toBeInTheDocument();
  });
});
```

---

### Success Criteria

- [ ] Donations can be archived (soft deleted or hidden)
- [ ] Archived donations hidden from normal views
- [ ] "Show Archived" filter displays archived donations
- [ ] Archived donations can be restored
- [ ] Visual indicator (greyed out) for archived donations
- [ ] Confirmation dialog prevents accidental archiving
- [ ] Tests pass
- [ ] Cascade delete behavior documented

---

### Notes
- **Naming:** "Archive" is more user-friendly than "Delete" or "Hide"
- **Reversible:** Must be able to restore archived donations
- **Audit Trail:** Soft delete preserves data for auditing
- **Reports:** Archived donations should be excluded from financial reports
- **Future:** Consider adding `archived_by` and `archived_reason` fields (requires TICKET-008 for user context)

---

### Related Tickets
- **TICKET-001:** Donor Soft Delete (pattern to follow)
- **TICKET-049:** Child Soft Delete (deferred)
- **TICKET-008:** Authentication (needed for tracking who archived)

---

*Created: 2025-11-17*
*Admin Page UX improvement - Data management*
