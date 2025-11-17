## [TICKET-115] Add Edit Donation Status to Admin Page

**Status:** 📋 Planned
**Priority:** 🔴 High
**Size:** M (Medium)
**Dependencies:** None
**Created:** 2025-11-17

---

### User Story
As an admin, I want to edit the status of donations in the Admin Page so that I can manually resolve issues (e.g., mark a failed payment as succeeded after manual verification, or change needs_attention to succeeded after fixing data).

---

### Context

**Why:** Admins need to manually resolve donation status issues identified during import or webhook processing.

**Current State:** Admin Page displays donations with status badges, but no ability to edit status

**Use Cases:**
- Failed payment manually verified and resolved → change to succeeded
- Needs attention donation investigated and fixed → change to succeeded
- Incorrect status from import → correct manually

**Scope:** Add inline status editing to Admin Page cards

---

### Acceptance Criteria

**Backend:**
- [ ] Add PATCH `/api/donations/:id/status` endpoint
- [ ] Accept `{ status: 'succeeded' | 'failed' | 'refunded' | 'canceled' | 'needs_attention' }`
- [ ] Validate status enum values
- [ ] Return updated donation via DonationPresenter
- [ ] Add controller test for status update
- [ ] Add authorization (future: admin-only via TICKET-008)

**Frontend:**
- [ ] Add "Edit Status" button/icon to donation cards in Admin Page
- [ ] Show status dropdown when editing (all 5 status values)
- [ ] Save button commits change via API
- [ ] Cancel button discards changes
- [ ] Optimistic UI update on save
- [ ] Show error if API call fails
- [ ] Refresh donation list after successful update
- [ ] Add frontend test for status editing

---

### Technical Approach

#### Backend: Add Status Update Endpoint

```ruby
# app/controllers/api/donations_controller.rb
def update_status
  donation = Donation.find(params[:id])
  donation.update!(status: params[:status])
  render json: { donation: DonationPresenter.new(donation).as_json }
end

# config/routes.rb
patch '/api/donations/:id/status', to: 'api/donations#update_status'
```

#### Frontend: Inline Status Editing

```tsx
// src/pages/AdminPage.tsx or new component EditDonationStatus.tsx
const [editingId, setEditingId] = useState<number | null>(null);
const [editStatus, setEditStatus] = useState<string>('');

const handleEdit = (donation: Donation) => {
  setEditingId(donation.id);
  setEditStatus(donation.status);
};

const handleSave = async (donationId: number) => {
  await apiClient.patch(`/api/donations/${donationId}/status`, { status: editStatus });
  setEditingId(null);
  fetchDonations(); // Refresh list
};

const handleCancel = () => {
  setEditingId(null);
  setEditStatus('');
};

// In card render:
{editingId === donation.id ? (
  <>
    <Select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
      <MenuItem value="succeeded">Succeeded</MenuItem>
      <MenuItem value="failed">Failed</MenuItem>
      <MenuItem value="refunded">Refunded</MenuItem>
      <MenuItem value="canceled">Canceled</MenuItem>
      <MenuItem value="needs_attention">Needs Attention</MenuItem>
    </Select>
    <IconButton onClick={() => handleSave(donation.id)}><CheckIcon /></IconButton>
    <IconButton onClick={handleCancel}><CloseIcon /></IconButton>
  </>
) : (
  <>
    <StatusBadge status={donation.status} />
    <IconButton onClick={() => handleEdit(donation)}><EditIcon /></IconButton>
  </>
)}
```

---

### Files to Create
- Test: `spec/controllers/api/donations_controller_spec.rb` (add update_status tests)
- Test: Frontend test for status editing

### Files to Modify
- `app/controllers/api/donations_controller.rb` (add update_status action)
- `config/routes.rb` (add PATCH route)
- `src/pages/AdminPage.tsx` (add inline editing UI)
- `src/types/donation.ts` (if needed)

---

### Testing Strategy

**Backend Tests (TDD):**
```ruby
describe 'PATCH /api/donations/:id/status' do
  it 'updates donation status' do
    donation = create(:donation, status: 'failed')
    patch "/api/donations/#{donation.id}/status", params: { status: 'succeeded' }

    expect(response).to have_http_status(:ok)
    expect(donation.reload.status).to eq('succeeded')
  end

  it 'returns 422 for invalid status' do
    donation = create(:donation)
    patch "/api/donations/#{donation.id}/status", params: { status: 'invalid' }

    expect(response).to have_http_status(:unprocessable_entity)
  end
end
```

**Frontend Tests:**
```typescript
it('allows editing donation status', async () => {
  render(<AdminPage />);

  fireEvent.click(screen.getByLabelText('Edit status'));
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'succeeded' } });
  fireEvent.click(screen.getByLabelText('Save'));

  await waitFor(() => {
    expect(screen.getByText('Succeeded')).toBeInTheDocument();
  });
});
```

---

### Success Criteria

**Backend:**
- [ ] PATCH endpoint created and working
- [ ] Status validation works
- [ ] Returns updated donation
- [ ] Tests pass

**Frontend:**
- [ ] Edit icon appears on donation cards
- [ ] Click opens status dropdown
- [ ] Can save and cancel
- [ ] Optimistic UI update works
- [ ] Error handling works
- [ ] Tests pass

**UX:**
- [ ] Inline editing feels smooth
- [ ] Clear save/cancel buttons
- [ ] No layout shift when editing

---

### Notes
- **Authorization:** For now, anyone can edit. TICKET-008 will add admin-only restriction.
- **Audit Trail:** Consider adding TICKET-119 for tracking who changed status and when
- **Validation:** Backend validates enum values, frontend shows only valid options
- **Optimistic UI:** Update UI immediately, revert if API fails
- **Future:** Add notes/reason field for status changes (e.g., "Manually verified payment cleared")

---

### Related Tickets
- **TICKET-008:** Basic Authentication (will restrict to admin-only)
- **TICKET-118:** Donation Source Tracking (related audit trail feature)

---

*Created: 2025-11-17*
*Admin Page UX improvement - High priority for manual data correction*
