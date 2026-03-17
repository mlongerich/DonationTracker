## [TICKET-123] Projects Extended E2E Tests

**Status:** ✅ Complete
**Priority:** 🟢 Low
**Effort:** S (Small - expanded from XS during manual testing)
**Created:** 2025-11-18
**Updated:** 2026-03-17
**Completed:** 2026-03-17
**Dependencies:** TICKET-119 (Move Projects to Admin Tab) ✅ Complete

### User Story
As a QA engineer, I want explicit E2E tests for system project flag behavior so that we can validate "General Donation" system project protection in the UI (no action buttons displayed).

### Problem Statement
Projects have comprehensive E2E test coverage (428 lines in project-crud.cy.ts), but explicit system flag UI validation is missing.

**Current Coverage:**
- ✅ Project CRUD (project-crud.cy.ts lines 1-428, project-management.cy.ts)
- ✅ Project archive/restore workflow (project-crud.cy.ts lines 357-426)
- ❌ Project type filtering (TICKET-051 canceled - feature not implemented)
- ✅ System project cascade delete prevention (project-crud.cy.ts lines 305-354)
- ⚠️ System flag UI behavior (`{!project.system && (...)}` in ProjectList.tsx line 51) not explicitly tested

**Gap:** "General Donation" system project needs explicit E2E tests for:
- No action buttons displayed (edit/delete/archive/restore all hidden)
- System projects always visible (not affected by archive filter)
- UI respects `project.system` flag

**Implementation Note:** ProjectList.tsx hides ALL action buttons for system projects via `{!project.system && (...)}` (line 51). There is no "System" badge in the UI - protection is via hidden buttons only.

**Impact:** Narrow gap - most project lifecycle management is already thoroughly tested

### Acceptance Criteria

#### System Project Protection (NEW - Gap Identified)
- [x] E2E test: "General Donation" has NO action buttons (edit/delete/archive/restore all hidden)
- [x] E2E test: System project always visible (not affected by "Show Archived Projects" filter) — strengthened to create a real archived project and verify toggle behavior
- [x] E2E test: Verify non-system projects SHOW action buttons (contrast test)

#### Bugs Found During Manual Testing (Expanded Scope)
- [x] "General Donation" missing from dev DB on fresh setup → added to seeds.rb
- [x] Sponsorship type removed from ProjectForm create/edit UI — backend rejects direct donations to sponsorship projects (validation: `sponsorship_project_must_have_sponsorship_id`); the create form no longer misleads users; shows as disabled when editing existing sponsorship project
- [x] DonationForm silently swallowed errors — fixed catch block to show dismissable error Alert with backend message
- [x] E2E test "creates a sponsorship project" replaced with "does not offer sponsorship as a project type option"
- [x] Redundant `beforeEach` in System Project Flag Protection describe removed (outer already covers login/cleanup/navigation)

#### Unit Tests Added
- [x] ProjectForm: "does not show sponsorship as a selectable option in create mode"
- [x] ProjectForm: "shows sponsorship as disabled option when editing a sponsorship project"
- [x] DonationForm: "shows error alert when donation creation fails"
- [x] DonationForm: "shows error alert with validation errors from backend"
- [x] DonationForm: "error alert can be dismissed"

#### Archive/Restore (Already Tested ✅)
*These are already fully tested in project-crud.cy.ts lines 357-426 - no new tests needed:*
- ✅ Archive project (no active sponsorships)
- ✅ Restore archived project
- ✅ Prevent archiving project with active sponsorships
- ✅ Archived projects hidden by default
- ✅ "Show Archived" toggle displays archived projects

#### Cascade Delete Prevention (Already Tested ✅)
*These are already fully tested in project-crud.cy.ts lines 152-354 - no new tests needed:*
- ✅ Delete project with no associations
- ✅ Prevent deletion when donations exist
- ✅ Prevent deletion when sponsorships exist

#### Type Filtering (Feature Not Implemented)
*TICKET-051 was canceled/superseded by TICKET-119 - no type filtering UI exists*

### Technical Approach

**Note:** Archive/restore and cascade delete prevention are already fully tested in `project-crud.cy.ts` (428 lines). Only system flag validation is missing.

#### Add to existing `project-crud.cy.ts`

**Add new describe block for explicit system flag tests:**

```typescript
describe('System Project Flag Protection', () => {
  beforeEach(() => {
    cy.login();
    cy.request('DELETE', `${Cypress.env('testApiUrl')}/api/test/cleanup`);
    // Visit Admin page and navigate to Projects tab
    cy.visit('/admin');
    cy.contains('button', 'Projects').click();
  });

  it('hides all action buttons for "General Donation" system project', () => {
    // "General Donation" is created via migration with system: true
    cy.contains('General Donation', { timeout: 10000 }).should('be.visible');

    // Verify NO action buttons exist for system projects
    // ProjectList.tsx line 51: {!project.system && (...)} hides all buttons
    cy.contains('General Donation')
      .parent()
      .parent()
      .within(() => {
        cy.get('button[aria-label="edit"]').should('not.exist');
        cy.get('button[aria-label="delete"]').should('not.exist');
        cy.get('button[aria-label="archive"]').should('not.exist');
        cy.get('button[aria-label="restore"]').should('not.exist');
      });
  });

  it('shows action buttons for non-system projects (contrast test)', () => {
    // Create a non-system project to verify normal behavior
    cy.contains('h2', 'Create Project')
      .parent()
      .within(() => {
        cy.get('input').first().type('Test Non-System Project');
        cy.get('textarea').first().type('Should have action buttons');
      });
    cy.contains('button', /create project/i).click();
    cy.contains('Test Non-System Project', { timeout: 10000 }).should('be.visible');

    // Verify action buttons ARE visible for non-system projects
    cy.contains('Test Non-System Project')
      .parent()
      .parent()
      .within(() => {
        cy.get('button[aria-label="edit"]').should('be.visible');
        // Delete or archive button should exist (depending on can_be_deleted)
        cy.get('button').should('have.length.at.least', 2); // At least edit + one action button
      });
  });

  it('system project always visible regardless of archive filter', () => {
    // Default view (active projects only)
    cy.contains('General Donation', { timeout: 10000 }).should('be.visible');

    // Toggle "Show Archived Projects" ON
    cy.contains('label', 'Show Archived Projects').click();
    cy.wait(1000);

    // System project still visible
    cy.contains('General Donation').should('be.visible');

    // Toggle "Show Archived Projects" OFF
    cy.contains('label', 'Show Archived Projects').click();
    cy.wait(1000);

    // System project still visible
    cy.contains('General Donation').should('be.visible');
  });
});
```

**Note:** Cascade delete prevention for system projects is already tested in existing tests (lines 305-354).

### Files to Modify
- `donation_tracker_frontend/cypress/e2e/project-crud.cy.ts` (ADD new describe block with 3-4 tests)

**No new files needed** - existing test file has excellent structure and organization.

### Expected Test Count
- **Total New Tests:** 3 E2E tests (system flag UI behavior)
  1. Hides all action buttons for system projects
  2. Shows action buttons for non-system projects (contrast)
  3. System project always visible (archive filter test)
- **Existing Tests:** 40+ tests already in project-crud.cy.ts (archive, restore, cascade delete)
- **Estimated Run Time:** +20-30 seconds to existing test suite

### Testing Strategy

**Test Data Setup:**
- "General Donation" is auto-created via migration (`db/migrate/20251018123011_create_projects.rb`) with `system: true`
- No manual seeding required - project always exists after migration
- Create non-system project via UI to test contrast behavior

**System Project Verification:**
- Verify "General Donation" exists in UI
- Validate ALL action buttons hidden (edit/delete/archive/restore)
- Confirm non-system projects SHOW action buttons (contrast test proves system flag works)
- Confirm visibility regardless of "Show Archived Projects" filter state

**UI Implementation (ProjectList.tsx line 51):**
```tsx
{!project.system && (
  <Box sx={{ display: 'flex', gap: 0.5 }}>
    {/* Edit, Delete, Archive, Restore buttons */}
  </Box>
)}
```
System projects (`project.system === true`) skip the entire button box - no buttons rendered at all.

**Existing Test Reuse:**
- Archive/restore fully tested (project-crud.cy.ts lines 357-426)
- Cascade delete prevention fully tested (lines 152-354)
- Only gap: explicit system flag UI behavior (button visibility)

### Benefits
- Explicitly validates system flag UI behavior (gap in existing tests)
- Ensures "General Donation" system project has NO action buttons (cannot be edited, deleted, or archived)
- Tests button visibility logic in ProjectList.tsx (`{!project.system && (...)`)
- Contrast test proves system flag actually works (non-system projects show buttons)
- Complements existing comprehensive archive/restore/cascade delete tests
- Prevents regressions in system project protection

### Related Tickets
- TICKET-009 - Project-Based Donations ✅ Complete
- TICKET-079 - Project CRUD E2E Tests ✅ Complete (comprehensive 428-line test file)
- TICKET-119 - Move Projects to Admin Page Tab ✅ Complete (Projects now in Admin page, Tab 2)
- TICKET-051 - Project Type Filtering ❌ Canceled (superseded by TICKET-119)
- TICKET-093 - Project Icons on Projects Page 📋 Planned

### Notes
- **Scope Reduction:** Most project E2E tests already exist (428 lines in project-crud.cy.ts)
- **No Badge UI:** ProjectList.tsx hides ALL action buttons for system projects - there is no "System" badge displayed
- **Type filtering:** Not implemented (TICKET-051 canceled) - removed from this ticket
- **Archive/restore:** Already fully tested - no new tests needed
- **Cascade delete:** Already fully tested - no new tests needed
- **Gap:** Only system flag UI behavior (button visibility) needs explicit E2E tests
- **Effort:** Reduced from 1-2h to ~30min-1h due to comprehensive existing coverage
- **System Project:** "General Donation" created via migration with `system: true` flag
- **Implementation:** ProjectList.tsx line 51 - `{!project.system && (...)}` wraps all action buttons
- **Follow existing patterns:** Use same style/structure as project-crud.cy.ts
- **Location:** Projects are in Admin page (route `/admin`, Tab 2), NOT standalone `/projects` page
