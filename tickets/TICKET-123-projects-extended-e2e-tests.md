## [TICKET-123] Projects Extended E2E Tests

**Status:** 📋 Planned
**Priority:** 🟢 Low
**Effort:** S (Small - 1-2 hours)
**Created:** 2025-11-18
**Dependencies:** None

### User Story
As a QA engineer, I want comprehensive E2E tests for Projects beyond basic CRUD so that we can validate archive/restore workflows, type filtering, and system project protection.

### Problem Statement
Current E2E test coverage for Projects is limited to basic CRUD operations.

**Current Coverage:**
- ✅ Project CRUD (project-crud.cy.ts, project-management.cy.ts)
- ❌ Project archive/restore workflow
- ❌ Project type filtering (general/campaign/sponsorship)
- ❌ System project protection ("General Donation" cannot be deleted/edited)

**Impact:** Missing test coverage for project lifecycle management and business rules

### Acceptance Criteria

#### Archive/Restore
- [ ] E2E test: Archive project (no active sponsorships)
- [ ] E2E test: Restore archived project
- [ ] E2E test: Prevent archiving project with active sponsorships
- [ ] E2E test: Archived projects hidden by default
- [ ] E2E test: "Show Archived" toggle displays archived projects

#### Project Type Filtering
- [ ] E2E test: Filter by type = general
- [ ] E2E test: Filter by type = campaign
- [ ] E2E test: Filter by type = sponsorship
- [ ] E2E test: Clear type filter

#### System Project Protection
- [ ] E2E test: "General Donation" cannot be deleted
- [ ] E2E test: "General Donation" cannot be edited
- [ ] E2E test: "General Donation" has system badge
- [ ] E2E test: System project always visible

### Technical Approach

#### 1. Create `projects-archive.cy.ts`

**Archive/Restore Workflow:**
```typescript
describe('Projects Archive/Restore', () => {
  beforeEach(() => {
    cy.task('db:seed');
  });

  it('archives project without active sponsorships', () => {
    // Create project
    cy.visit('/projects');
    cy.contains('button', 'Create Project').click();
    cy.get('input[name="title"]').type('Summer Camp 2024');
    cy.get('select[name="project_type"]').select('campaign');
    cy.get('button[type="submit"]').click();

    // Archive project
    cy.contains('Summer Camp 2024').parent().contains('Archive').click();

    // Verify hidden from active list
    cy.contains('Summer Camp 2024').should('not.exist');

    // Show archived
    cy.get('input[type="checkbox"][name="show_archived"]').check();

    // Verify appears with archived badge
    cy.contains('Summer Camp 2024').should('be.visible');
    cy.contains('Summer Camp 2024').parent().should('contain', 'Archived');
  });

  it('restores archived project', () => {
    // Archive project first
    // Click Restore
    // Verify back in active list
  });

  it('prevents archiving project with active sponsorships', () => {
    // Create project
    // Create sponsorship linked to project
    // Try to archive
    // Verify error message
  });
});
```

#### 2. Create `projects-type-filtering.cy.ts`

**Type Filtering:**
```typescript
describe('Project Type Filtering', () => {
  beforeEach(() => {
    // Create projects of each type
    cy.request('POST', '/api/projects', {
      project: { title: 'General Fund', project_type: 'general' }
    });
    cy.request('POST', '/api/projects', {
      project: { title: 'Christmas Campaign', project_type: 'campaign' }
    });
    cy.request('POST', '/api/projects', {
      project: { title: 'Maria Sponsorship', project_type: 'sponsorship' }
    });
  });

  it('filters by type = general', () => {
    cy.visit('/projects');
    cy.get('select[name="project_type"]').select('general');
    cy.contains('General Fund').should('be.visible');
    cy.contains('Christmas Campaign').should('not.exist');
  });

  it('filters by type = campaign', () => {
    // Similar test
  });

  it('clears type filter', () => {
    // Apply filter
    // Select "All Types"
    // Verify all projects visible
  });
});
```

#### 3. Create `projects-system-protection.cy.ts`

**System Project Protection:**
```typescript
describe('System Project Protection', () => {
  it('prevents deleting "General Donation"', () => {
    cy.visit('/projects');

    // Find General Donation project
    cy.contains('General Donation').parent().within(() => {
      // Verify Delete button disabled or hidden
      cy.contains('button', /delete/i).should('be.disabled');
      // OR: cy.contains('button', /delete/i).should('not.exist');
    });
  });

  it('prevents editing "General Donation"', () => {
    cy.visit('/projects');

    // Find General Donation project
    cy.contains('General Donation').parent().within(() => {
      // Verify Edit button disabled or hidden
      cy.contains('button', /edit/i).should('be.disabled');
    });
  });

  it('displays system badge for "General Donation"', () => {
    cy.visit('/projects');
    cy.contains('General Donation').parent().should('contain', 'System');
  });

  it('system project always visible (not archivable)', () => {
    cy.visit('/projects');

    // Toggle archived filter
    cy.get('input[name="show_archived"]').check();
    cy.get('input[name="show_archived"]').uncheck();

    // General Donation always visible
    cy.contains('General Donation').should('be.visible');
  });
});
```

### Files to Create
- `cypress/e2e/projects-archive.cy.ts` (NEW)
- `cypress/e2e/projects-type-filtering.cy.ts` (NEW)
- `cypress/e2e/projects-system-protection.cy.ts` (NEW)

### Expected Test Count
- **Total New Tests:** ~12-15 E2E tests
- **Estimated Run Time:** ~2 minutes

### Testing Strategy

**Test Data Setup:**
- Use API calls for fast project creation
- Clean database before each test file
- Verify project appears before testing actions

**System Project Verification:**
- Check that "General Donation" is seeded by default
- If not found, seed it via API or migration
- Validate `system: true` flag prevents mutations

### Benefits
- Validates project archive/restore business logic
- Ensures system project protection works correctly
- Tests project type filtering (if implemented)
- Prevents regressions in project lifecycle management

### Related Tickets
- TICKET-009 - Project-Based Donations ✅
- TICKET-079 - Project CRUD E2E Tests ✅
- TICKET-119 - Move Projects to Admin Page Tab 📋
- TICKET-093 - Project Icons on Projects Page 📋

### Notes
- Type filtering may not be implemented yet (TICKET-051 was canceled, superseded by TICKET-119)
- Use `it.skip()` for unimplemented features
- System project protection is CRITICAL business rule - must be tested
- Follow existing patterns from project-crud.cy.ts
