## [TICKET-049] Child Model Soft Delete with Archive/Restore + Cascade Delete Protection

**Status:** ⏸️ Deferred - Accepted Risk
**Priority:** 🟢 Low (downgraded from High - frontend protection sufficient)
**Started:** N/A
**Completed:** N/A
**Dependencies:** None
**Blocked by:** None
**Decision Date:** 2025-10-31

### Risk Acceptance Decision

**Frontend mitigation implemented:** UI prevents deletion of children with sponsorships (can_be_deleted flag).

**Remaining risk:** Direct API endpoint calls could still trigger 500 errors.

**Risk assessment:** Acceptable because:
- No public API access (internal tool only)
- Frontend protection covers normal user workflows
- Low likelihood of direct endpoint usage
- Backend implementation effort not justified for edge case

**Future consideration:** If API becomes public or multi-client, implement backend cascade delete protection (Phase 1 from original plan).

### User Story
As an admin, I want to archive children instead of permanently deleting them so that I can restore them if needed and maintain historical records, consistent with how donor archiving works. Additionally, I want graceful error handling when attempting to delete a child with sponsorships (currently shows HTTP 500 error).

### Current Bug
**Issue:** Deleting a child with sponsorships causes HTTP 500 error and ugly frontend exception
**Location:** ChildrenPage.tsx:55-58 (handleDelete function)
**Root Cause:** Child model has `has_many :sponsorships` but no `dependent:` strategy, causing unhandled `ActiveRecord::DeleteRestrictionError`
**Expected:** Graceful error message or prevent deletion via UI (like Projects pattern)

### Acceptance Criteria

**Backend - Cascade Delete Protection (IMMEDIATE FIX):**
- [ ] Child model has `dependent: :restrict_with_exception` on sponsorships association
- [ ] Child model has `can_be_deleted?` method (checks sponsorships.empty?)
- [ ] Model tests: 3 tests for cascade delete behavior
  - Cannot delete child with sponsorships
  - Can delete child with no sponsorships
  - `can_be_deleted?` returns correct boolean

**Backend - Soft Delete (FULL FEATURE):**
- [ ] Child model uses Discard gem for soft delete functionality
- [ ] Migration adds `discarded_at` timestamp column to children table
- [ ] DELETE `/api/children/:id` soft deletes (sets discarded_at timestamp) instead of hard delete
- [ ] GET `/api/children` endpoint excludes archived children by default
- [ ] GET `/api/children` includes archived when `include_discarded=true` param present
- [ ] POST `/api/children/:id/restore` endpoint to unarchive children
- [ ] DELETE `/api/children/all` endpoint for test cleanup (hard delete all)
- [ ] RSpec model tests for soft delete behavior
- [ ] RSpec request tests for archive/restore endpoints
- [ ] Ransack includes discarded_at in searchable attributes
- [ ] Factory Bot updated to support creating archived children for tests

**Frontend - Prevent Delete Before API Call (RECOMMENDED):**
- [ ] Add ChildPresenter with `can_be_deleted` field (follow ProjectPresenter pattern)
- [ ] Update Child TypeScript interface with `can_be_deleted: boolean`
- [ ] ChildList.tsx conditionally shows delete button based on `can_be_deleted`
- [ ] Frontend tests for delete button visibility logic

**Frontend - Error Handling (FALLBACK):**
- [ ] ChildrenPage handleDelete catches errors and shows user-friendly message
- [ ] Test error handling for delete failures

### Technical Notes
- **Pattern Consistency**: Follow exact patterns from:
  - TICKET-001 (Donor soft delete) for soft delete implementation
  - TICKET-038 (Project cascade delete) for `can_be_deleted?` and frontend prevention
  - TICKET-062 (Donor cascade delete) for `dependent: :restrict_with_exception` pattern
- **Discard Gem**: Already in Gemfile, just need to include in Child model
- **Controller Pattern**: Already uses `PaginationConcern` and `RansackFilterable` concerns ✅
- **Test Strategy**: Mirror donor archive tests (`spec/models/donor_spec.rb`, `spec/requests/api/donors_spec.rb`)
- **Cascade Behavior**:
  - Soft delete preserves sponsorship relationships (child remains associated)
  - Hard delete prevented if ANY sponsorship ever existed (not just active ones)
  - This matches financial data retention policy (sponsorships = commitments)
- **Data Integrity**: Archived children should retain all sponsorship history

### Implementation Strategy (Recommended Order)

**Phase 1: Immediate Bug Fix (Backend Only - 30 min)**
1. Add `dependent: :restrict_with_exception` to Child model
2. Add `can_be_deleted?` method
3. Write 3 model tests
4. Run tests, verify all pass
5. Commit: "backend: add cascade delete protection for children (TICKET-049)"

**Phase 2: Frontend Prevention (Frontend - 45 min)**
1. Create ChildPresenter (follow ProjectPresenter pattern)
2. Update ChildrenController index to use presenter
3. Update Child TypeScript interface
4. Update ChildList to conditionally show delete button
5. Write frontend tests for delete button visibility
6. Commit: "frontend: prevent child delete via UI when sponsorships exist (TICKET-049)"

**Phase 3: Soft Delete Implementation (Backend + Frontend - 2 hours)**
1. Add Discard to Child model
2. Create migration for `discarded_at`
3. Update controller destroy action to use `discard`
4. Add restore action
5. Update routes
6. Write comprehensive tests
7. Update frontend to handle archived children
8. Commit: "backend/frontend: implement child soft delete with archive/restore (TICKET-049)"

**Rationale:** Phased approach allows quick fix for UX bug (Phase 1), then progressive enhancement

### Backend Implementation Checklist

**Phase 1 - Cascade Delete Protection:**
- [ ] Update `app/models/child.rb`:
  - [ ] Add `dependent: :restrict_with_exception` to `has_many :sponsorships`
  - [ ] Add `can_be_deleted?` method
- [ ] Add RSpec model tests in `spec/models/child_spec.rb`:
  - [ ] Test: Cannot delete child with sponsorships (raises DeleteRestrictionError)
  - [ ] Test: Can delete child with no sponsorships
  - [ ] Test: `can_be_deleted?` returns false when sponsorships exist
  - [ ] Test: `can_be_deleted?` returns true when no sponsorships
- [ ] Update existing DELETE test in `spec/requests/api/children_spec.rb`:
  - [ ] Add test: DELETE fails with 500 when child has sponsorships (documents current bug)

**Phase 2 - Frontend Prevention:**
- [ ] Create `app/presenters/child_presenter.rb` (follow ProjectPresenter pattern)
- [ ] Update `app/controllers/api/children_controller.rb`:
  - [ ] Modify `index` to use `CollectionPresenter.new(children, ChildPresenter).as_json`
- [ ] Add RSpec presenter tests in `spec/presenters/child_presenter_spec.rb`
- [ ] Update `src/types/child.ts`:
  - [ ] Add `can_be_deleted: boolean` to Child interface
- [ ] Update `src/components/ChildList.tsx`:
  - [ ] Conditionally render delete button based on `can_be_deleted`
  - [ ] Add Tooltip explaining why delete is disabled
- [ ] Add frontend tests in `src/components/ChildList.test.tsx`:
  - [ ] Test: Delete button hidden when can_be_deleted is false
  - [ ] Test: Delete button shown when can_be_deleted is true

**Phase 3 - Soft Delete Implementation:**
- [ ] Add `include Discard::Model` to `app/models/child.rb`
- [ ] Create migration `add_discarded_at_to_children`
- [ ] Update `app/controllers/api/children_controller.rb`:
  - [ ] ✅ Already has `include PaginationConcern` and `include RansackFilterable`
  - [ ] Modify `destroy` to call `discard` instead of `destroy`
  - [ ] Add `restore` action
  - [ ] Add `destroy_all` action for test cleanup
- [ ] Update `config/routes.rb`:
  - [ ] Add `post :restore, on: :member`
  - [ ] Add `delete :all, on: :collection`
- [ ] Add RSpec model tests in `spec/models/child_spec.rb`:
  - [ ] Test soft delete sets discarded_at
  - [ ] Test default scope excludes discarded
  - [ ] Test kept scope excludes discarded
  - [ ] Test discarded scope includes only discarded
  - [ ] Test with_discarded scope includes all
  - [ ] Test soft delete preserves sponsorships
- [ ] Add RSpec request tests in `spec/requests/api/children_spec.rb`:
  - [ ] Test DELETE archives child (changes DELETE behavior from Phase 1)
  - [ ] Test GET excludes archived by default
  - [ ] Test GET includes archived with param
  - [ ] Test POST restore unarchives child
  - [ ] Test DELETE /all hard deletes for tests
- [ ] Update Factory Bot in `spec/factories/children.rb`:
  - [ ] Add `discarded` trait
- [ ] Update ChildPresenter to include `discarded_at` field
- [ ] Update frontend to handle archived children (filter toggle, restore button)

### Files to Change

**Phase 1 - Backend Only:**
- `donation_tracker_api/app/models/child.rb` (add dependent strategy, can_be_deleted?)
- `donation_tracker_api/spec/models/child_spec.rb` (add 4 cascade delete tests)
- `donation_tracker_api/spec/requests/api/children_spec.rb` (add 1 test documenting bug)

**Phase 2 - Backend + Frontend:**
- `donation_tracker_api/app/presenters/child_presenter.rb` (NEW FILE)
- `donation_tracker_api/spec/presenters/child_presenter_spec.rb` (NEW FILE)
- `donation_tracker_api/app/controllers/api/children_controller.rb` (use presenter in index)
- `donation_tracker_frontend/src/types/child.ts` (add can_be_deleted field)
- `donation_tracker_frontend/src/components/ChildList.tsx` (conditional delete button)
- `donation_tracker_frontend/src/components/ChildList.test.tsx` (NEW FILE - add tests)

**Phase 3 - Full Soft Delete:**
- `donation_tracker_api/app/models/child.rb` (add Discard)
- `donation_tracker_api/db/migrate/YYYYMMDDHHMMSS_add_discarded_at_to_children.rb` (NEW FILE)
- `donation_tracker_api/app/controllers/api/children_controller.rb` (update destroy, add restore)
- `donation_tracker_api/config/routes.rb` (add restore, destroy_all routes)
- `donation_tracker_api/spec/models/child_spec.rb` (add soft delete tests)
- `donation_tracker_api/spec/requests/api/children_spec.rb` (add soft delete endpoint tests)
- `donation_tracker_api/spec/factories/children.rb` (add discarded trait)
- `donation_tracker_api/app/presenters/child_presenter.rb` (add discarded_at field)
- `donation_tracker_frontend/src/pages/ChildrenPage.tsx` (handle archived children)
- `donation_tracker_frontend/src/components/ChildList.tsx` (add restore button)

### Testing Strategy
1. **Model Tests**: Verify Discard gem behavior (scopes, timestamps)
2. **Request Tests**: Verify API endpoints return correct data
3. **Factory Tests**: Ensure discarded trait works for test data
4. **Integration**: Manual testing with archived children and sponsorships

### Related Commits
- TBD

### Reference Tickets

- TICKET-001: Donor soft delete pattern to follow
- TICKET-038: Project cascade delete pattern (can_be_deleted? method, ProjectPresenter)
- TICKET-062: Donor cascade delete pattern (dependent: :restrict_with_exception)
- TICKET-050: Frontend UI ticket (depends on this ticket)

---

## Summary of Updates (2025-10-24)

**Issue Identified:**

- Deleting a child with sponsorships returns HTTP 500 error instead of graceful error
- Frontend shows: `Uncaught runtime errors: ERROR Request failed with status code 500`
- Root cause: Child model missing `dependent:` strategy on sponsorships association

**Ticket Updates:**

1. **Priority**: Upgraded from 🟡 Medium to 🔴 High (UX bug)
2. **Scope Clarification**:
   - Policy decision: Children cannot be deleted if ANY sponsorship EVER existed (not just active)
   - Rationale: Sponsorships represent commitments (like donations), financial data retention policy
3. **Phased Implementation Strategy**:
   - **Phase 1**: Quick fix - Add cascade delete protection (30 min)
   - **Phase 2**: Better UX - Hide delete button when can't delete (45 min)
   - **Phase 3**: Full feature - Soft delete with archive/restore (2 hours)
4. **Pattern References**: Added cross-references to TICKET-038 (Projects) and TICKET-062 (Donors)

**Ready for Implementation:**

✅ All acceptance criteria defined
✅ Files to change identified
✅ Test cases specified
✅ Phased approach documented
✅ Time estimates provided
