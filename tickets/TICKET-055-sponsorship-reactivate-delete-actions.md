## [TICKET-055] Sponsorship Management Actions (Reactivate, Delete, End with Date, Edit)

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Effort:** M (Medium - 4-5 hours with edit + date picker)
**Created:** 2025-10-22
**Updated:** 2025-10-22 (added end date picker and edit)
**Dependencies:** TICKET-010 (Sponsorship model exists) ✅, TICKET-056 (start_date field) 🔵

### User Story

As a user, I want to delete sponsorships created by mistake, edit sponsorship details, choose the end date when ending a sponsorship, and reactivate ended sponsorships, so that I can manage the complete lifecycle of sponsorship relationships.

### Problem Statement

Currently, the Sponsorships page has limited management actions:
- ❌ **Cannot delete accidentally created sponsorships** - If wrong donor/child selected before any donations made, sponsorship stays forever
- ❌ **Cannot edit sponsorship details** - Monthly amount or other details cannot be corrected
- ❌ **Cannot choose end date** - End action uses current date only, no custom date selection
- ❌ **Cannot reverse ending a sponsorship** - If user ends sponsorship but sponsor comes back, no way to reactivate
- ⚠️ **No data integrity protection** - User might try to delete sponsorship with donations (orphan donations)

### Conditional Action Logic

**3 Possible States:**

| Sponsorship State | Donations? | Action Button | Behavior |
|------------------|-----------|---------------|----------|
| Active | None | "Delete" | Hard delete (removes from DB) |
| Active | Exists | "End" | Soft delete (sets end_date) |
| Ended | Exists* | "Reactivate" | Clears end_date |

*Note: Ended sponsorships ALWAYS have donations (by definition). If no donations existed, user would have clicked "Delete" not "End", so this state is impossible to reach.

### Acceptance Criteria

#### Backend Model

- [ ] Add `has_donations?` method to Sponsorship model
  ```ruby
  def has_donations?
    project.donations.exists?
  end
  ```
- [ ] Add `donations_count` to API JSON responses
- [ ] Model tests: 2 tests (has_donations? true/false)

#### Backend API

- [ ] Modify `DELETE /api/sponsorships/:id` endpoint
  - [ ] Check `sponsorship.has_donations?`
  - [ ] If true: Return 422 with error message "Cannot delete sponsorship with donations. Use End instead."
  - [ ] If false: Hard delete (`destroy!`)
  - [ ] Request spec: 3 tests (delete without donations, blocked with donations, not found)

- [ ] Add `PATCH /api/sponsorships/:id/reactivate` endpoint
  - [ ] Clears `end_date` to `nil`
  - [ ] Returns updated sponsorship with `active: true`
  - [ ] Only works on ended sponsorships (validation)
  - [ ] Request spec: 3 tests (success, already active error, not found)

- [ ] Update `PUT /api/sponsorships/:id/end` endpoint (rename destroy)
  - [ ] Sets `end_date` to current date
  - [ ] Returns updated sponsorship
  - [ ] Request spec: 2 tests (success, not found)

#### Frontend API Client

- [ ] Add `endSponsorship(id)` method (rename from deleteSponsorship)
  - [ ] `PUT /api/sponsorships/:id/end`
  - [ ] Test: 1

- [ ] Add `deleteSponsorship(id)` method (hard delete)
  - [ ] `DELETE /api/sponsorships/:id`
  - [ ] Test: 1

- [ ] Add `reactivateSponsorship(id)` method
  - [ ] `PATCH /api/sponsorships/:id/reactivate`
  - [ ] Test: 1

#### Frontend Components

- [ ] Update `SponsorshipList.tsx`
  - [ ] Conditional button rendering based on `active` and `donations_count`:
    ```tsx
    {sponsorship.active ? (
      sponsorship.donations_count === 0 ? (
        <Button onClick={() => onDelete(sponsorship.id)}>Delete</Button>
      ) : (
        <Button onClick={() => onEnd(sponsorship.id)}>End</Button>
      )
    ) : (
      <Button onClick={() => onReactivate(sponsorship.id)}>Reactivate</Button>
    )}
    ```
  - [ ] Pass `onDelete`, `onEnd`, `onReactivate` callbacks to parent
  - [ ] Update tests: 8 total (existing + 3 new button visibility tests)

- [ ] Update `SponsorshipsPage.tsx`
  - [ ] Implement `handleDelete(id)` with confirmation dialog
  - [ ] Implement `handleEnd(id)` (rename from handleEndSponsorship)
  - [ ] Implement `handleReactivate(id)`
  - [ ] All actions refresh sponsorship list
  - [ ] Update tests: 7 total (existing + delete confirmation + reactivate)

- [ ] Update `Sponsorship` TypeScript type
  - [ ] Add `donations_count: number` field
  - [ ] Already has `active: boolean` ✅

#### **NEW: End Date Picker Modal**

- [ ] Create `EndSponsorshipDialog.tsx` component
  - [ ] MUI Dialog with DatePicker
  - [ ] Default date: Today
  - [ ] User can select custom date
  - [ ] "Cancel" and "End Sponsorship" buttons
  - [ ] Passes selected date to onConfirm callback
  - [ ] Test: 4 tests (renders, default date, custom date, cancel)

- [ ] Update backend `PUT /api/sponsorships/:id/end`
  - [ ] Accept `end_date` parameter in request body
  - [ ] If not provided, default to `Date.current`
  - [ ] Validate end_date is not in future
  - [ ] Test: end with custom date, end without date (defaults to today)

- [ ] Update `SponsorshipsPage.tsx`
  - [ ] Open EndSponsorshipDialog when "End" button clicked
  - [ ] Pass selected date to API
  - [ ] Test: shows dialog, sends date to API

#### **NEW: Edit Sponsorship**

- [ ] Add `PUT /api/sponsorships/:id` endpoint
  - [ ] Allow updating: `monthly_amount`, `start_date` (if exists)
  - [ ] Cannot update: `donor_id`, `child_id` (would be new sponsorship)
  - [ ] Return updated sponsorship
  - [ ] Test: 3 tests (update amount, update start_date, validation)

- [ ] Create `EditSponsorshipDialog.tsx` OR reuse `SponsorshipForm`
  - [ ] Show current values in form
  - [ ] Only allow editing amount and start_date
  - [ ] Donor/Child shown as read-only text
  - [ ] Test: 3 tests (renders with data, updates amount, cancel)

- [ ] Update `SponsorshipList.tsx`
  - [ ] Add "Edit" button next to Delete/End/Reactivate
  - [ ] Pass `onEdit(sponsorship)` callback
  - [ ] Test: Edit button visible and calls callback

- [ ] Update `SponsorshipsPage.tsx`
  - [ ] Add edit dialog state
  - [ ] Implement handleEdit
  - [ ] Refresh list after edit
  - [ ] Test: edit updates sponsorship

#### Backend Routes

```ruby
# config/routes.rb
resources :sponsorships, only: [:index, :create, :destroy] do
  member do
    put :end           # Soft delete (set end_date)
    patch :reactivate  # Clear end_date
  end
end
```

### Technical Implementation

#### Backend Controller (Full Code)

```ruby
# app/controllers/api/sponsorships_controller.rb
class Api::SponsorshipsController < ApplicationController
  # ... existing actions ...

  def end
    sponsorship = Sponsorship.find(params[:id])
    sponsorship.update!(end_date: Date.current)
    render json: sponsorship_json(sponsorship)
  end

  def destroy
    sponsorship = Sponsorship.find(params[:id])

    if sponsorship.has_donations?
      render json: {
        error: 'Cannot delete sponsorship with donations. Use End instead.'
      }, status: :unprocessable_entity
      return
    end

    sponsorship.destroy!
    head :no_content
  end

  def reactivate
    sponsorship = Sponsorship.find(params[:id])

    if sponsorship.active?
      render json: {
        error: 'Sponsorship is already active'
      }, status: :unprocessable_entity
      return
    end

    sponsorship.update!(end_date: nil)
    render json: sponsorship_json(sponsorship)
  end

  private

  def sponsorship_json(sponsorship)
    sponsorship.as_json(
      include: {
        donor: { only: :name },
        child: { only: :name },
        project: { only: :title }
      },
      methods: [:active]
    ).merge(
      donations_count: sponsorship.project.donations.count
    )
  end
end
```

#### Backend Model

```ruby
# app/models/sponsorship.rb
class Sponsorship < ApplicationRecord
  # ... existing code ...

  def has_donations?
    project.donations.exists?
  end
end
```

#### Frontend Page Handler

```tsx
// src/pages/SponsorshipsPage.tsx
const handleDelete = async (id: number) => {
  const confirmed = window.confirm(
    'Are you sure you want to delete this sponsorship? This action cannot be undone.'
  );
  if (!confirmed) return;

  try {
    await deleteSponsorship(id);
    fetchSponsorships();
  } catch (error: any) {
    if (error.response?.status === 422) {
      alert(error.response.data.error);
    }
  }
};

const handleEnd = async (id: number) => {
  await endSponsorship(id);
  fetchSponsorships();
};

const handleReactivate = async (id: number) => {
  await reactivateSponsorship(id);
  fetchSponsorships();
};
```

### Files to Modify

**Backend:**
- `app/models/sponsorship.rb` - Add `has_donations?` method
- `app/controllers/api/sponsorships_controller.rb` - Add end/reactivate actions, modify destroy
- `config/routes.rb` - Add end/reactivate routes
- `spec/models/sponsorship_spec.rb` - Add 2 tests for has_donations?
- `spec/requests/api/sponsorships_spec.rb` - Add 8 tests (3 delete, 3 reactivate, 2 end)

**Frontend:**
- `src/types/sponsorship.ts` - Add `donations_count: number`
- `src/api/client.ts` - Add endSponsorship, deleteSponsorship, reactivateSponsorship
- `src/api/client.test.ts` - Add 3 tests
- `src/components/SponsorshipList.tsx` - Conditional button rendering
- `src/components/SponsorshipList.test.tsx` - Add 3 button visibility tests
- `src/pages/SponsorshipsPage.tsx` - Add handlers
- `src/pages/SponsorshipsPage.test.tsx` - Add 2 tests

### Test Plan

#### Backend RSpec Tests (10 new)

**Sponsorship Model:**
1. `has_donations?` returns true when donations exist
2. `has_donations?` returns false when no donations

**Delete Action:**
3. Successfully deletes sponsorship without donations
4. Returns 422 when donations exist (with error message)
5. Returns 404 when sponsorship not found

**End Action:**
6. Successfully sets end_date
7. Returns 404 when sponsorship not found

**Reactivate Action:**
8. Successfully clears end_date for ended sponsorship
9. Returns 422 when sponsorship already active
10. Returns 404 when sponsorship not found

#### Frontend Jest Tests (8 new)

**API Client:**
1. `endSponsorship(id)` calls PUT /api/sponsorships/:id/end
2. `deleteSponsorship(id)` calls DELETE /api/sponsorships/:id
3. `reactivateSponsorship(id)` calls PATCH /api/sponsorships/:id/reactivate

**SponsorshipList:**
4. Shows "Delete" button when active + donations_count = 0
5. Shows "End" button when active + donations_count > 0
6. Shows "Reactivate" button when not active

**SponsorshipsPage:**
7. Delete with confirmation calls API and refreshes list
8. Reactivate calls API and refreshes list

#### Cypress E2E Test (1 scenario)

- Navigate to Sponsorships page
- Create new sponsorship (no donations yet)
- Verify "Delete" button appears
- Click delete → Confirm → Verify removed from list
- Create sponsorship again
- Create donation for sponsorship
- Verify "End" button appears (not "Delete")
- Click end → Verify status changes to ended
- Verify "Reactivate" button appears
- Click reactivate → Verify status changes to active

### UX Considerations

#### Why This Design?

**Delete vs End:**
- Delete = "I made a mistake, remove this completely" (no financial history)
- End = "This sponsorship relationship concluded" (preserve donation history)

**Automatic Choice:**
- User doesn't need to understand difference
- System automatically shows correct action based on donations
- Prevents data integrity issues (orphaned donations)

**Confirmation Required:**
- Delete: Yes (irreversible, removes from database)
- End: No (reversible via Reactivate, just changes status)
- Reactivate: No (reversible via End, simple state toggle)

#### Error Handling

If user somehow triggers DELETE with donations (shouldn't happen via UI):
- Backend returns 422 with clear message
- Frontend shows alert: "Cannot delete sponsorship with donations. Use End instead."
- User sees "End" button after alert dismissal

### Related Tickets

- TICKET-010: Sponsorships page + original End functionality ✅
- TICKET-054: Create sponsorship (moved to TICKET-010) - needed to test delete before donations
- TICKET-053: Sponsorships page filters (complementary feature)

### Migration Notes

**Backward Compatibility:**
- Existing "End" functionality preserved (just renamed endpoint)
- DELETE endpoint changes behavior (now conditional)
- Frontend must update to use new endpoints

**Data Migration:**
- No database schema changes required
- Existing ended sponsorships will show "Reactivate" button (safe, reversible)
