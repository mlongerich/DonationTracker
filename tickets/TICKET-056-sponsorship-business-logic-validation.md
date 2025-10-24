## [TICKET-056] Sponsorship Business Logic & Validation

**Status:** ✅ Complete
**Priority:** 🔴 High (blocks duplicate sponsorships - data integrity)
**Effort:** M (Medium - 3-4 hours)
**Created:** 2025-10-22
**Completed:** 2025-10-23
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
- [x] Add uniqueness validation to Sponsorship model (custom validation `no_duplicate_active_sponsorships`)
- [x] Return 422 error with message: "#{child.name} is already actively sponsored by #{donor.name}"
- [x] Allow creating if:
  - Different donor/child/amount
  - Previous sponsorship with same details is ended (`end_date` not nil)
- [x] Model tests: 4 tests
  - Cannot create duplicate active sponsorship
  - Can create if different donor
  - Can create if different child
  - Can create if previous sponsorship ended

**Frontend Handling:**
- [x] Update `SponsorshipsPage` to show error message from API
- [x] Display: Alert/Snackbar with error message from `errors.base[0]`
- [x] Test: shows error when API returns 422

#### 2. One Project Per Child (Reuse Existing)

**Backend Logic:**
- [x] Update `Sponsorship#create_sponsorship_project` callback (implemented project reuse logic)
- [x] Model tests: 3 tests
  - First sponsorship creates new project
  - Second sponsorship reuses existing project
  - Multiple sponsorships share same project

**Impact:**
- All donations for a child go to one project
- Project title reflects child name
- Simpler donation tracking

#### 3. Add Start Date Field

**Migration:**
- [x] Create migration: `20251022180001_add_start_date_to_sponsorships.rb`
- [x] No default value (can be null if no donations yet)
- [x] Run migration

**Backend Updates:**
- [x] Add `start_date` to permitted params in controller
- [x] Include in JSON responses (SponsorshipPresenter)
- [x] Stored as database column (not computed)

**Frontend Updates:**
- [x] Add `start_date?: string` to Sponsorship TypeScript type
- [x] Display start_date in SponsorshipList table
- [x] Column: "Start Date" shows date or "Not set"
- [ ] Edit form allows updating start_date (TICKET-055 - future work)

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
