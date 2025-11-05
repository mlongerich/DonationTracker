## [TICKET-079] Project CRUD E2E Tests + Bug Fixes

**Status:** ✅ Complete
**Priority:** 🟡 Medium
**Effort:** L (Large - 5 hours) - Expanded from M due to discovered bugs
**Created:** 2025-11-05
**Completed:** 2025-11-05
**Dependencies:** TICKET-009 (Project-based donations) ✅, TICKET-038 (Cascade delete strategy) ✅, TICKET-051 (Project type filter) 📋

### User Story
As a developer, I want comprehensive E2E tests for project management so that I can ensure the full CRUD workflow, filtering, and cascade delete protection work correctly in production.

### Scope Expansion
During implementation, discovered and fixed 3 bugs:
1. **Bug**: Projects lacked unique title validation
2. **Bug**: Test cleanup didn't delete projects between test runs
3. **Bug**: Sponsorship API ignored provided `project_id` (strong parameters issue)

### Problem Statement
**Current State:**
- `cypress/e2e/project-management.cy.ts` exists but only tests page display (16 lines)
- No E2E tests for:
  - Creating projects (all 3 types: general, campaign, sponsorship)
  - Editing projects
  - Deleting projects
  - Project type filtering (if TICKET-051 complete)
  - Cascade delete protection (can_be_deleted logic)

**Gap Analysis:**
- ✅ TICKET-009: Backend project CRUD complete
- ✅ TICKET-038: Frontend prevents deletion when donations/sponsorships exist
- ❌ No E2E tests validating end-to-end behavior
- ❌ No regression protection for cascade delete logic

### Acceptance Criteria

#### Test Coverage
- [x] Create project (general type) ✅
  - Fill form with title, description, select "General" type
  - Submit form
  - Verify project appears in list
  - Verify system=false

- [x] Create project (campaign type) ✅
  - Fill form with title, description, select "Campaign" type
  - Submit and verify in list

- [x] Create project (sponsorship type) ✅
  - Fill form with title, description, select "Sponsorship" type
  - Submit and verify in list

- [x] **Prevent duplicate project titles** ✅ (Added during implementation)
  - Create project with title "Duplicate Title Test"
  - Attempt to create second project with same title
  - Verify uniqueness validation prevents duplicate

- [x] Edit project ✅
  - Create project
  - Click edit button
  - Change title and description
  - Submit
  - Verify updates appear in list

- [x] Delete project (no associations) ✅
  - Create project
  - Verify delete button visible
  - Click delete → confirm
  - Verify project removed from list

- [x] Prevent delete when donations exist ✅
  - Create project
  - Create donation linked to project
  - Navigate back to projects page
  - Verify delete button NOT visible (archive button shown instead)

- [x] Prevent delete when sponsorships exist ✅
  - Create sponsorship project
  - Create child and sponsorship linked to project
  - Navigate to projects page
  - Verify delete button NOT visible (archive button shown)

- [x] System projects cannot be deleted ✅
  - Verify "General Donation" system project has no delete button
  - Verify other system projects have no delete button

- [x] Archive and restore projects ✅
  - Create project with donations
  - Archive project (shows archive button, not delete)
  - Verify project disappears from default view
  - Enable "Show Archived Projects"
  - Restore project
  - Verify project active again

- [ ] Project type filter (TICKET-051 not complete yet)

### Technical Approach

#### Test File Structure
```typescript
// cypress/e2e/project-crud.cy.ts
describe('Project Management - Full CRUD Workflow', () => {
  beforeEach(() => {
    // Clean database before each test
    cy.request('DELETE', 'http://localhost:3001/api/test/cleanup');
    cy.visit('/projects');
  });

  describe('Project Creation', () => {
    it('creates a general project');
    it('creates a campaign project');
    it('creates a sponsorship project');
  });

  describe('Project Editing', () => {
    it('edits project title and description');
  });

  describe('Project Deletion', () => {
    it('deletes project with no associations');
    it('prevents deletion when donations exist');
    it('prevents deletion when sponsorships exist');
    it('prevents deletion of system projects');
  });

  describe('Project Filtering', () => {
    it('filters projects by type'); // If TICKET-051 complete
  });
});
```

#### Key Testing Patterns
1. **Database Cleanup**: Use `/api/test/cleanup` before each test
2. **Form Interaction**: Use `cy.contains('h2', 'Create Project')` to scope to form section
3. **Cascade Delete**: Create related entities via API or UI, verify delete button state
4. **System Projects**: Query for existing system project (General Donation)
5. **API Intercepts**: `cy.intercept('GET', '/api/projects*').as('getProjects')` for async verification

### Implementation Notes

**Follow Existing Patterns:**
- `donation-entry.cy.ts` - Form submission pattern
- `children-sponsorship.cy.ts` - Multi-entity creation pattern
- `donor-archive.cy.ts` - Button visibility testing

**Project Form Location:**
- Projects page has embedded form (like Children, Donors)
- Scope selectors to form section: `cy.contains('h2', 'Create Project').parent()`

**Cascade Delete Testing Strategy:**
```typescript
// Pattern for "prevent delete when donations exist"
it('prevents deletion when donations exist', () => {
  // 1. Create donor via API
  cy.request('POST', 'http://localhost:3001/api/donors', {
    donor: { name: 'Test Donor', email: 'test@example.com' }
  });

  // 2. Create project via UI
  cy.visit('/projects');
  cy.contains('h2', 'Create Project').parent()
    .find('input[name="title"]').type('Test Project');
  cy.contains('button', /submit/i).click();

  // 3. Create donation via API (faster than UI)
  cy.request('POST', 'http://localhost:3001/api/donations', {
    donation: {
      donor_id: 1, // Assuming first donor
      project_id: 1, // Assuming first project
      amount: 10000,
      date: '2024-01-01'
    }
  });

  // 4. Reload projects page
  cy.visit('/projects');

  // 5. Verify delete button NOT visible
  cy.contains('Test Project').parent()
    .find('button[aria-label="delete"]').should('not.exist');
});
```

### Files to Create
- `donation_tracker_frontend/cypress/e2e/project-crud.cy.ts` (NEW - ~200 lines)

### Files to Update
- `donation_tracker_frontend/cypress/e2e/project-management.cy.ts` (EXPAND or DELETE - currently only 16 lines)

### Estimated Time
- Test writing: 2 hours
- Debugging/refinement: 1 hour
- Total: ~3 hours

### Success Criteria
- [x] All 10 Cypress tests passing ✅
- [x] Tests validate both happy path and error cases ✅
- [x] Cascade delete protection verified end-to-end ✅
- [x] Tests follow existing Cypress conventions ✅
- [x] No flaky tests (deterministic, proper waits) ✅

### Related Tickets
- TICKET-009: Project-based donations (backend feature) ✅
- TICKET-038: Cascade delete strategy (frontend + backend) ✅
- TICKET-051: Project type filter (frontend - if complete)
- TICKET-078: Fix donation filter race condition (Cypress test patterns) ✅

### Notes
- **Prioritization**: Medium priority because project management is a core feature but less frequently used than donations/donors
- **Coverage Gap**: This is the biggest E2E testing gap - projects have full backend + frontend but minimal E2E coverage
- **Regression Risk**: Cascade delete logic is complex and needs E2E validation
- **Test Stability**: Follow TICKET-078 patterns to avoid race conditions

### Test Execution Commands
```bash
# Run all project tests
docker-compose exec frontend npm run cypress:run -- --spec "cypress/e2e/project-crud.cy.ts"

# Open Cypress UI for debugging
docker-compose exec frontend npm run cypress:open
```

### Definition of Done
- [x] 10 E2E tests written covering all acceptance criteria ✅
- [x] All tests passing (37 seconds execution time) ✅
- [x] Test execution time < 2 minutes ✅
- [x] No console errors during test runs ✅
- [x] Tests follow pre-commit patterns ✅
- [x] DonationTracking.md updated with test coverage status ✅

---

## Implementation Summary

### Files Created
1. **cypress/e2e/project-crud.cy.ts** (420 lines)
   - 10 comprehensive E2E tests covering full CRUD + archive/restore
   - Tests validate UI behavior (not just API responses)
   - Follows existing Cypress patterns for deterministic tests

### Files Modified

#### Backend
1. **app/models/project.rb**
   - Added `uniqueness: true` validation to title (line 9)

2. **app/models/sponsorship.rb**
   - Added `project_must_be_sponsorship_type` validation (lines 11, 57-63)
   - Validates that provided `project_id` must be sponsorship type

3. **app/controllers/api/sponsorships_controller.rb**
   - Added `:project_id` to permitted parameters (line 47)
   - Allows API clients to specify explicit project for sponsorships

4. **app/controllers/api/test_controller.rb**
   - Added `Project.where(system: false).delete_all` to cleanup (line 22)
   - Ensures clean state between E2E test runs

5. **spec/models/project_spec.rb**
   - Added 2 uniqueness validation tests (lines 11-23)
   - Validates unique titles and same-title updates

6. **spec/models/sponsorship_spec.rb**
   - Added 2 project_id validation tests (lines 192-224)
   - Tests respecting provided project_id and rejecting non-sponsorship projects

#### Frontend
7. **src/components/DonationForm.test.tsx**
   - Increased timeout to 10000ms for "passes child_id" test (line 280)
   - Fixed consistently failing test due to userEvent typing delays

### Bugs Fixed

#### Bug 1: Projects lack unique title validation
**Symptom:** Could create multiple projects with identical titles
**Root Cause:** No uniqueness validation on Project model
**Fix:** Added `uniqueness: true` to title validation
**Tests:** 2 RSpec tests, 1 E2E test

#### Bug 2: Test cleanup doesn't delete projects
**Symptom:** Projects persisted between E2E test runs causing test pollution
**Root Cause:** TestController cleanup only deleted donations, donors, children, sponsorships
**Fix:** Added `Project.where(system: false).delete_all` to cleanup
**Impact:** All E2E tests now have clean database state

#### Bug 3: Sponsorship API ignores provided project_id
**Symptom:** E2E test for sponsorship cascade delete failed - wrong project checked
**Root Cause:** Strong parameters didn't permit `:project_id`, so API stripped it out
**Investigation:** Callback `return if project_id.present?` worked in RSpec but not via API
**Fix:** Added `:project_id` to `sponsorship_params` whitelist
**Bonus Fix:** Added validation to reject non-sponsorship projects
**Tests:** 2 RSpec tests validating project_id behavior

### Test Results
- ✅ **Backend**: 270 tests passing (93.11% coverage)
- ✅ **Frontend**: 264 tests passing
- ✅ **E2E**: 10 tests passing (37s execution time)

### Key Learnings

1. **E2E Philosophy**: Tests should verify UI behavior (what users see), not API internals
   - Original test checked API response `can_be_deleted` field
   - Corrected to verify button visibility (archive vs delete icons)

2. **Sponsorship Auto-Project Logic**: Discovered complex interaction between:
   - Before_validation callback creating "Sponsor {child_name}" projects
   - Strong parameters filtering out explicit project_id
   - Frontend expectations of explicit project associations

3. **Test-Driven Bug Discovery**: Writing E2E tests revealed 3 production bugs that unit tests missed
   - Demonstrates value of full-stack integration testing
   - Validates the "thin vertical slice" development approach

### Time Breakdown
- Initial E2E test writing: 1 hour
- Bug 1 discovery & fix (uniqueness): 0.5 hours
- Bug 2 discovery & fix (cleanup): 0.25 hours
- Bug 3 investigation & fix (sponsorship project_id): 2 hours
- Frontend test timeout fix: 0.5 hours
- Documentation updates: 0.75 hours
- **Total: 5 hours** (expanded from 3 hour estimate)
