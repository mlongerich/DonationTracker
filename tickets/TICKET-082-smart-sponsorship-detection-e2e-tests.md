## [TICKET-082] Smart Sponsorship Detection & Auto-Creation E2E Tests

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Effort:** M (Medium - 2-3 hours)
**Created:** 2025-11-05
**Dependencies:** TICKET-064 (Smart sponsorship detection) ✅, TICKET-061 (Auto-create sponsorship) 📋

### User Story
As a developer, I want comprehensive E2E tests for smart sponsorship detection and auto-creation workflows so that I can ensure sponsorships are created automatically when donations are made to sponsorship projects, and duplicates are prevented.

### Problem Statement
**Current State:**
- TICKET-064: Smart sponsorship detection implemented (backend logic) ✅
- TICKET-061: Auto-create sponsorship from donation (backend service) 📋
- No E2E tests covering:
  - Donation to sponsorship project triggers sponsorship creation
  - Duplicate sponsorships prevented when multiple donations made
  - Monthly amount set correctly from donation amount
  - Child determination logic (project → child mapping)
  - Edge cases: orphan projects, multiple children, existing sponsorships

**Gap Analysis:**
- ✅ Backend logic implemented for smart detection
- ✅ Backend auto-creation service (may be in TICKET-061)
- ❌ No E2E validation of end-to-end workflow
- ❌ High business risk: Incorrect sponsorship creation could cause donor confusion

### Acceptance Criteria

#### Auto-Creation Tests

- [ ] Create sponsorship when donation made to sponsorship project
  - Create donor "John Sponsor"
  - Create child "Maria"
  - Create sponsorship project "Sponsor Maria" (linked to Maria)
  - Create donation: John → Sponsor Maria project, $100
  - Navigate to Sponsorships page
  - Verify new sponsorship created: John + Maria, $100/month
  - Verify donation appears in donation history

- [ ] Prevent duplicate sponsorship on second donation
  - Setup: Existing sponsorship (John + Maria, $100/month)
  - Create second donation: John → Sponsor Maria project, $100
  - Navigate to Sponsorships page
  - Verify still only ONE sponsorship for John + Maria
  - Verify both donations counted

- [ ] Use donation amount as monthly sponsorship amount
  - Create donation: Sarah → Sponsor Carlos project, $75
  - Navigate to Sponsorships page
  - Verify sponsorship created with $75/month (not hardcoded value)

- [ ] Idempotency: Multiple donations don't create duplicate sponsorships
  - Create 3 donations from same donor to same sponsorship project
  - Verify only 1 sponsorship created
  - Verify all 3 donations linked

- [ ] Don't create sponsorship for general donations
  - Create donation to "General Donation" project (not sponsorship type)
  - Navigate to Sponsorships page
  - Verify NO sponsorship created

- [ ] Don't create sponsorship for campaign donations
  - Create donation to "Summer Campaign" project (campaign type)
  - Verify NO sponsorship created

#### Edge Case Tests

- [ ] Handle orphan sponsorship project (no child linked)
  - Create sponsorship project without associated child
  - Create donation to orphan project
  - Verify NO sponsorship created (graceful failure)
  - Verify donation still recorded
  - Verify no error to user

- [ ] Update existing sponsorship amount on new donation (if applicable)
  - Create sponsorship: Tom + Child A, $50/month
  - Create donation: Tom → Sponsor Child A project, $100
  - Verify sponsorship amount updates to $100/month
  - **OR** verify no update (depends on business logic - check TICKET-061)

- [ ] Handle different donor to same child
  - Existing: Alice sponsors Maria ($100/month)
  - New donation: Bob → Sponsor Maria project, $50
  - Verify new sponsorship created: Bob + Maria, $50/month
  - Verify Alice's sponsorship unchanged

#### Child Determination Tests

- [ ] Determine child from existing sponsorships
  - Create child "Carlos"
  - Create sponsorship project "Sponsor Carlos" (linked via existing sponsorship)
  - Create sponsorship: Donor A + Carlos (establishes link)
  - Create donation: Donor B → Sponsor Carlos project
  - Verify new sponsorship: Donor B + Carlos (child correctly determined)

- [ ] Handle multiple children for one project (edge case)
  - If project has 2+ children linked
  - Create donation to multi-child project
  - Verify sponsorship uses first/primary child (deterministic)
  - **OR** verify no sponsorship created (depends on business rule)

### Technical Approach

#### Test File Structure
```typescript
// cypress/e2e/sponsorship-auto-creation.cy.ts
describe('Smart Sponsorship Detection & Auto-Creation', () => {
  beforeEach(() => {
    cy.request('DELETE', 'http://localhost:3001/api/test/cleanup');
  });

  describe('Auto-Create Sponsorship from Donation', () => {
    it('creates sponsorship when donating to sponsorship project');
    it('prevents duplicate sponsorships on multiple donations');
    it('uses donation amount as monthly sponsorship amount');
    it('creates only one sponsorship for multiple donations');
  });

  describe('Project Type Filtering', () => {
    it('does not create sponsorship for general donations');
    it('does not create sponsorship for campaign donations');
  });

  describe('Edge Cases', () => {
    it('handles orphan sponsorship project gracefully');
    it('handles different donor to same child');
    it('determines child from existing sponsorships');
  });
});
```

#### Key Testing Patterns

**1. Complete Workflow Pattern:**
```typescript
it('creates sponsorship when donating to sponsorship project', () => {
  // 1. Setup: Create donor via UI
  cy.visit('/donors');
  cy.get('input[type="text"]').first().type('John Sponsor');
  cy.get('input[type="email"]').type('john@example.com');
  cy.contains('button', /submit/i).click();
  cy.contains(/donor (created|updated) successfully/i, { timeout: 5000 });

  // 2. Setup: Create child and sponsorship project via API (faster)
  cy.request('POST', 'http://localhost:3001/api/children', {
    child: { name: 'Maria' }
  }).then((childResponse) => {
    const childId = childResponse.body.child.id;

    cy.request('POST', 'http://localhost:3001/api/projects', {
      project: {
        title: 'Sponsor Maria',
        project_type: 'sponsorship'
      }
    }).then((projectResponse) => {
      const projectId = projectResponse.body.project.id;

      // 3. Create initial sponsorship to link child with project
      cy.request('POST', 'http://localhost:3001/api/sponsorships', {
        sponsorship: {
          donor_id: 1, // Temporary donor for link
          child_id: childId,
          project_id: projectId,
          monthly_amount: 5000
        }
      });
    });
  });

  // 4. Create donation via UI (test user workflow)
  cy.visit('/donations');
  cy.contains('h2', 'Record Donation').parent().within(() => {
    // Select donor
    cy.contains('label', 'Donor').parent().find('input').type('John');
    cy.wait(500);
    cy.get('[role="option"]').contains('John Sponsor').click();

    // Enter amount
    cy.contains('label', 'Amount').parent().find('input').type('100');

    // Select sponsorship project
    cy.contains('label', 'Project').parent().find('input').type('Sponsor Maria');
    cy.wait(500);
    cy.get('[role="option"]').contains('Sponsor Maria').click();

    // Submit
    cy.contains('button', /create donation/i).click();
  });

  cy.contains(/donation created successfully/i, { timeout: 5000 });

  // 5. Navigate to Sponsorships page
  cy.visit('/sponsorships');

  // 6. Verify sponsorship auto-created
  cy.contains('John Sponsor').should('be.visible');
  cy.contains('Maria').should('be.visible');
  cy.contains('$100.00').should('be.visible');
});
```

**2. Duplicate Prevention Pattern:**
```typescript
it('prevents duplicate sponsorships on multiple donations', () => {
  // Setup: Create initial sponsorship via first donation
  createSponsorshipViaFirstDonation('Alice', 'Carlos', 100);

  // Create second donation to same project
  cy.visit('/donations');
  cy.contains('h2', 'Record Donation').parent().within(() => {
    cy.contains('label', 'Donor').parent().find('input').type('Alice');
    cy.wait(500);
    cy.get('[role="option"]').first().click();

    cy.contains('label', 'Amount').parent().find('input').type('100');

    cy.contains('label', 'Project').parent().find('input').type('Sponsor Carlos');
    cy.wait(500);
    cy.get('[role="option"]').first().click();

    cy.contains('button', /create donation/i).click();
  });

  // Navigate to Sponsorships page
  cy.visit('/sponsorships');

  // Verify only ONE sponsorship for Alice + Carlos
  cy.get('tbody tr').filter(':contains("Alice")').should('have.length', 1);
});
```

**3. Edge Case Testing:**
```typescript
it('handles orphan sponsorship project gracefully', () => {
  // Create orphan project (no child linked)
  cy.request('POST', 'http://localhost:3001/api/projects', {
    project: {
      title: 'Orphan Sponsorship Project',
      project_type: 'sponsorship'
    }
  });

  // Create donor
  cy.visit('/donors');
  cy.get('input[type="text"]').first().type('Orphan Donor');
  cy.get('input[type="email"]').type('orphan@example.com');
  cy.contains('button', /submit/i).click();

  // Create donation to orphan project
  cy.visit('/donations');
  cy.contains('h2', 'Record Donation').parent().within(() => {
    cy.contains('label', 'Donor').parent().find('input').type('Orphan');
    cy.wait(500);
    cy.get('[role="option"]').first().click();

    cy.contains('label', 'Amount').parent().find('input').type('50');

    cy.contains('label', 'Project').parent().find('input').type('Orphan Sponsorship');
    cy.wait(500);
    cy.get('[role="option"]').first().click();

    cy.contains('button', /create donation/i).click();
  });

  // Verify donation created (no error)
  cy.contains(/donation created successfully/i, { timeout: 5000 });

  // Navigate to Sponsorships page
  cy.visit('/sponsorships');

  // Verify NO sponsorship created for orphan project
  cy.contains('Orphan Donor').should('not.exist');
});
```

### Implementation Notes

**Feature Discovery:**
Before writing tests, verify:
1. Is TICKET-064 fully implemented? (smart detection)
2. Is TICKET-061 complete? (auto-creation service)
3. What is the business logic for:
   - Orphan projects (no child)
   - Multiple children per project
   - Existing sponsorship amount updates

**Test Data Setup:**
- Use API for donor/child/project creation (faster)
- Use UI for donation creation (tests actual user workflow)
- Create "linking" sponsorship to establish project-child relationship

**Performance:**
- Total test execution should be < 3 minutes
- Use `cy.intercept()` to verify API calls
- Minimize unnecessary waits (rely on Cypress retries)

**Edge Case Coverage:**
- Document expected behavior for ambiguous scenarios
- If feature not implemented, use `it.skip()` with ticket reference

### Files to Create
- `donation_tracker_frontend/cypress/e2e/sponsorship-auto-creation.cy.ts` (NEW - ~250-300 lines)

### Estimated Time
- Feature discovery (check TICKET-061 status): 30 minutes
- Test writing: 2 hours
- Debugging/refinement: 1 hour
- Total: ~3.5 hours

### Success Criteria
- [ ] 10+ E2E tests covering auto-creation workflow
- [ ] Duplicate prevention validated
- [ ] Edge cases handled gracefully (no errors to user)
- [ ] Tests follow existing Cypress conventions
- [ ] All tests passing in CI environment
- [ ] Test execution time < 3 minutes
- [ ] No flaky tests

### Related Tickets
- TICKET-064: Smart Sponsorship Detection ✅ (backend logic)
- TICKET-061: Auto-Create Sponsorship from Donation 📋 (service object)
- TICKET-010: Children & Sponsorship Tracking ✅ (base feature)
- TICKET-052: Improve Sponsorship Donation Linking (related workflow)

### Notes
- **Medium Priority**: Important business logic but backend likely has unit test coverage
- **Business Risk**: Incorrect auto-creation could confuse donors or create duplicate sponsorships
- **Complexity**: Requires multi-entity setup (donor + child + project + sponsorship + donation)
- **Feature Uncertainty**: TICKET-061 may not be complete yet - check status first

### Test Execution Commands
```bash
# Run sponsorship auto-creation tests
docker-compose exec frontend npm run cypress:run -- --spec "cypress/e2e/sponsorship-auto-creation.cy.ts"

# Run all sponsorship-related tests
docker-compose exec frontend npm run cypress:run -- --spec "cypress/e2e/*sponsorship*.cy.ts"

# Open Cypress UI for debugging
docker-compose exec frontend npm run cypress:open
```

### Definition of Done
- [ ] 10+ E2E tests written for auto-creation workflow
- [ ] Duplicate prevention validated
- [ ] Edge cases tested (orphan projects, project types)
- [ ] All tests passing in CI environment
- [ ] Test execution time < 3 minutes
- [ ] No console errors during test runs
- [ ] Tests added to pre-commit hook validation
- [ ] DonationTracking.md updated with test coverage status
- [ ] Any skipped tests documented with ticket references
