## [TICKET-056] Sponsorship Business Logic & Validation

**Status:** 📋 Planned
**Priority:** 🔴 High (blocks duplicate sponsorships - data integrity)
**Effort:** M (Medium - 3-4 hours)
**Created:** 2025-10-22
**Dependencies:** TICKET-010 (Sponsorship model exists) ✅

### User Story

As a user, I want the system to prevent duplicate active sponsorships and reuse existing projects per child, so that data remains consistent and I don't accidentally create duplicate records.

### Problem Statement

Current implementation allows data integrity issues:
1. **Duplicate Active Sponsorships:** Can create multiple active sponsorships with same donor + child + amount
2. **Multiple Projects Per Child:** Each sponsorship creates a new project, should reuse existing
3. **No Start Date Tracking:** Cannot see when sponsorship actually began (first donation date)

### Acceptance Criteria

#### 1. Prevent Duplicate Active Sponsorships

**Backend Validation:**
- [ ] Add uniqueness validation to Sponsorship model:
  ```ruby
  validates :donor_id, uniqueness: {
    scope: [:child_id, :monthly_amount],
    conditions: -> { where(end_date: nil) },
    message: "already has an active sponsorship for this child with this amount"
  }
  ```
- [ ] Return 422 error with message: "This sponsorship already exists"
- [ ] Allow creating if:
  - Different donor/child/amount
  - Previous sponsorship with same details is ended (`end_date` not nil)
- [ ] Model tests: 4 tests
  - Cannot create duplicate active sponsorship
  - Can create if different donor
  - Can create if different child
  - Can create if previous sponsorship ended

**Frontend Handling:**
- [ ] Update `SponsorshipsPage` to show error message from API
- [ ] Display: Alert/Snackbar with "This sponsorship already exists"
- [ ] Test: shows error when API returns 422

#### 2. One Project Per Child (Reuse Existing)

**Backend Logic:**
- [ ] Update `Sponsorship#create_sponsorship_project` callback:
  ```ruby
  def create_sponsorship_project
    return if project_id.present?
    return unless child

    # Find existing project for child or create new one
    existing_project = child.sponsorships.joins(:project)
                           .where.not(project_id: nil)
                           .first&.project

    if existing_project
      self.project_id = existing_project.id
    else
      new_project = Project.create!(
        project_type: :sponsorship,
        title: "Sponsor #{child.name}",
        system: false
      )
      self.project_id = new_project.id
    end
  end
  ```
- [ ] Model tests: 3 tests
  - First sponsorship creates new project
  - Second sponsorship reuses existing project
  - Multiple sponsorships share same project

**Impact:**
- All donations for a child go to one project
- Project title reflects child name
- Simpler donation tracking

#### 3. Add Start Date Field

**Migration:**
- [ ] Create migration: `add_start_date_to_sponsorships`
  ```ruby
  add_column :sponsorships, :start_date, :date
  ```
- [ ] No default value (can be null if no donations yet)
- [ ] Run migration

**Backend Updates:**
- [ ] Add `start_date` to permitted params in controller
- [ ] Include in JSON responses
- [ ] Optional: Add callback to set start_date when first donation created
  - Alternative: Compute on-demand (slower but simpler for MVP)
- [ ] For now: Display as computed value in frontend
  - `sponsorship.project.donations.minimum(:date)`

**Frontend Updates:**
- [ ] Add `start_date?: string` to Sponsorship TypeScript type
- [ ] Display start_date in SponsorshipList table
- [ ] Column: "Start Date" shows date or "No donations yet"
- [ ] Edit form allows updating start_date (TICKET-055)

### Technical Approach

#### Validation Order (Backend)
1. Check uniqueness (donor + child + amount + active)
2. If validation fails → return 422
3. If validation passes → check for existing project
4. Create or reuse project
5. Save sponsorship

#### Frontend Error Handling
```tsx
try {
  await createSponsorship(data);
  fetchSponsorships();
} catch (error: any) {
  if (error.response?.status === 422) {
    setErrorMessage(error.response.data.errors?.donor_id?.[0] ||
                    "Failed to create sponsorship");
  }
}
```

### Files to Modify

**Backend:**
- `app/models/sponsorship.rb` - Add validation, update project callback
- `app/controllers/api/sponsorships_controller.rb` - Add start_date to permitted params
- `app/presenters/sponsorship_presenter.rb` - Add start_date and project_title to JSON
- `db/migrate/YYYYMMDD_add_start_date_to_sponsorships.rb` - New migration
- `spec/models/sponsorship_spec.rb` - Add 7 validation tests

**Frontend:**
- `src/components/SponsorshipList.tsx` - Display start_date column
- `src/pages/SponsorshipsPage.tsx` - Handle 422 errors, show message
- `src/pages/SponsorshipsPage.test.tsx` - Test error handling (create if needed)

**Already Complete:**
- ✅ `src/types/sponsorship.ts` - start_date field already exists
- ✅ Database index for uniqueness - completed in TICKET-035

### Test Plan

**Backend (7 new RSpec tests):**
1. Cannot create duplicate active sponsorship (same donor + child + amount)
2. Can create sponsorship if previous one ended
3. Can create sponsorship with different donor
4. Can create sponsorship with different child
5. First sponsorship for child creates new project
6. Second sponsorship for child reuses existing project
7. Multiple sponsorships share same project_id

**Frontend (2 new Jest tests):**
1. Shows error message when 422 returned
2. Displays "No donations yet" when start_date is null

### Related Tickets
- TICKET-010: Sponsorships page ✅
- TICKET-055: Edit sponsorship (can update start_date)
- TICKET-057: Multi-sponsor display (uses shared project)

### Notes

**Why High Priority:**
- Data integrity issue - users can create duplicate records
- Should have been in original TICKET-010
- Blocks proper testing of sponsorship features

**Start Date Implementation Choice:**
- **Option 1 (MVP):** Compute on-demand from `project.donations.minimum(:date)`
  - Pros: No background jobs, simpler
  - Cons: Slower queries
- **Option 2 (Future):** Background job updates start_date when donation created
  - Requires: ActiveJob, more complexity
  - Defer to post-MVP

**Recommendation:** Use Option 1 (computed) for now

---

### Implementation Notes (2025-10-22)

**Current Codebase Status:**
- ✅ Composite index already exists: `index ["donor_id", "child_id", "monthly_amount", "end_date"]` (TICKET-035)
- ✅ TypeScript type already has `start_date?: string` field
- ✅ SponsorshipPresenter exists (TICKET-060) - needs start_date and project_title added
- ⚠️ start_date will be stored as database column (not computed) for simplicity

**Implementation Strategy:**
- Store start_date as database column with migration
- Add to permitted params and presenter
- Display in SponsorshipList table UI
- Can compute from donations later if needed for backfill
