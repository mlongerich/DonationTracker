## [TICKET-079] Project CRUD E2E Tests

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Effort:** M (Medium - 2-3 hours)
**Created:** 2025-11-05
**Dependencies:** TICKET-009 (Project-based donations) ✅, TICKET-038 (Cascade delete strategy) ✅, TICKET-051 (Project type filter) 📋

### User Story
As a developer, I want comprehensive E2E tests for project management so that I can ensure the full CRUD workflow, filtering, and cascade delete protection work correctly in production.

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
- [ ] Create project (general type)
  - Fill form with title, description, select "General" type
  - Submit form
  - Verify project appears in list
  - Verify system=false

- [ ] Create project (campaign type)
  - Fill form with title, description, select "Campaign" type
  - Submit and verify in list

- [ ] Create project (sponsorship type)
  - Fill form with title, description, select "Sponsorship" type
  - Submit and verify in list

- [ ] Edit project
  - Create project
  - Click edit button
  - Change title and description
  - Submit
  - Verify updates appear in list

- [ ] Delete project (no associations)
  - Create project
  - Verify delete button visible
  - Click delete → confirm
  - Verify project removed from list

- [ ] Prevent delete when donations exist
  - Create project
  - Create donation linked to project
  - Navigate back to projects page
  - Verify delete button NOT visible OR disabled
  - Verify tooltip/message explains why

- [ ] Prevent delete when sponsorships exist
  - Create sponsorship project
  - Create child and sponsorship linked to project
  - Navigate to projects page
  - Verify delete button NOT visible OR disabled

- [ ] System projects cannot be deleted
  - Verify "General Donation" system project has no delete button
  - Verify other system projects have no delete button

- [ ] Project type filter (if TICKET-051 complete)
  - Create 3 projects (1 of each type)
  - Select "Sponsorship" filter
  - Verify only sponsorship project visible
  - Select "All Types"
  - Verify all 3 projects visible

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
- [ ] All 9+ Cypress tests passing
- [ ] Tests validate both happy path and error cases
- [ ] Cascade delete protection verified end-to-end
- [ ] Tests follow existing Cypress conventions
- [ ] No flaky tests (deterministic, proper waits)

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
- [ ] 9+ E2E tests written covering all acceptance criteria
- [ ] All tests passing in CI environment
- [ ] Test execution time < 2 minutes
- [ ] No console errors during test runs
- [ ] Tests added to pre-commit hook validation
- [ ] DonationTracking.md updated with test coverage status
