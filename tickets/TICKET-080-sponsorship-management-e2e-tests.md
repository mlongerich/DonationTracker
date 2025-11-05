## [TICKET-080] Sponsorship Management Actions E2E Tests

**Status:** 📋 Planned
**Priority:** 🔴 High
**Effort:** L (Large - 3-4 hours)
**Created:** 2025-11-05
**Dependencies:** TICKET-055 (Sponsorship actions) 📋, TICKET-053 (Filters/pagination) 📋, TICKET-010 (Sponsorships page) ✅

### User Story
As a developer, I want comprehensive E2E tests for sponsorship management actions so that I can ensure end/reactivate/delete actions, conditional button logic, and filtering work correctly across the full user workflow.

### Problem Statement
**Current State:**
- `cypress/e2e/children-sponsorship.cy.ts` tests sponsorship creation
- No E2E tests for:
  - Ending sponsorship with date picker
  - Reactivating ended sponsorship
  - Deleting sponsorship (conditional logic)
  - Conditional button rendering (Delete vs End vs Reactivate)
  - Sponsorship filtering (donor, child, show ended toggle)
  - Sponsorship pagination

**Gap Analysis:**
- TICKET-055: Sponsorship management actions (planned - may not be implemented yet)
- TICKET-053: Filters and pagination UI (partially complete - omni-search + show ended)
- ❌ No E2E tests for sponsorship lifecycle management
- ❌ High business risk: Ending sponsorships incorrectly could cause donation tracking issues

### Acceptance Criteria

#### Test Coverage - Sponsorship Actions

- [ ] End sponsorship (no donations)
  - Create sponsorship (no donations yet)
  - Click "End" button
  - Verify button changes to "Reactivate"
  - Verify `end_date` set in UI
  - Verify sponsorship moves to "ended" status

- [ ] End sponsorship with date picker (if TICKET-055 complete)
  - Create sponsorship with donations
  - Click "End" button
  - Date picker modal appears with default date
  - Select custom end date
  - Submit
  - Verify sponsorship ended with correct date

- [ ] Reactivate ended sponsorship
  - Create sponsorship
  - End sponsorship
  - Click "Reactivate" button
  - Verify button changes back to "End"
  - Verify `end_date` cleared
  - Verify sponsorship shows as active

- [ ] Delete sponsorship (no donations)
  - Create sponsorship (no donations)
  - Verify "Delete" button visible
  - Click delete → confirm
  - Verify sponsorship removed from list

- [ ] Prevent delete when donations exist
  - Create sponsorship
  - Create donation linked to sponsorship project
  - Verify "Delete" button changes to "End" button
  - Attempt to delete via API → verify 422 error

- [ ] Conditional button logic
  - Scenario 1: Active sponsorship, no donations → "Delete" button
  - Scenario 2: Active sponsorship, has donations → "End" button
  - Scenario 3: Ended sponsorship → "Reactivate" button

#### Test Coverage - Sponsorship Filtering (if TICKET-053 complete)

- [ ] Filter by donor
  - Create 2 sponsorships with different donors
  - Select donor filter
  - Verify only that donor's sponsorships visible
  - Clear filter → verify all visible

- [ ] Filter by child
  - Create 2 sponsorships with different children
  - Select child filter
  - Verify only that child's sponsorships visible

- [ ] Show ended sponsorships toggle
  - Create active sponsorship
  - Create ended sponsorship
  - Default (unchecked): only active sponsorship visible
  - Check "Show Ended" → both visible
  - Uncheck → only active visible

- [ ] Combined filters
  - Create multiple sponsorships (various donors, children, active/ended)
  - Apply donor filter + show ended
  - Verify correct subset displayed

- [ ] Pagination (if implemented)
  - Create 30+ sponsorships
  - Verify pagination controls appear
  - Navigate to page 2
  - Verify different sponsorships displayed

#### Test Coverage - Omni-Search (TICKET-053 completed feature)

- [ ] Search by donor name
  - Create sponsorships with different donor names
  - Type donor name in search
  - Verify only matching sponsorships shown

- [ ] Search by child name
  - Create sponsorships with different child names
  - Type child name in search
  - Verify only matching sponsorships shown

### Technical Approach

#### Test File Structure
```typescript
// cypress/e2e/sponsorship-management.cy.ts
describe('Sponsorship Management - Actions & Filtering', () => {
  beforeEach(() => {
    cy.request('DELETE', 'http://localhost:3001/api/test/cleanup');
    cy.visit('/sponsorships');
  });

  describe('Sponsorship Actions', () => {
    it('ends sponsorship');
    it('reactivates ended sponsorship');
    it('deletes sponsorship with no donations');
    it('prevents deletion when donations exist');
    it('shows correct action button based on state');
  });

  describe('Sponsorship Filtering', () => {
    it('filters by donor');
    it('filters by child');
    it('toggles show ended sponsorships');
    it('combines multiple filters');
    it('searches by donor name (omni-search)');
    it('searches by child name (omni-search)');
  });

  describe('Sponsorship Pagination', () => {
    it('paginates large sponsorship lists'); // If implemented
  });
});
```

#### Key Testing Patterns

**1. Setup Multiple Entities Pattern:**
```typescript
// Create donor, child, and sponsorship via API for faster test execution
const createSponsorshipFixture = (donorName: string, childName: string) => {
  cy.request('POST', 'http://localhost:3001/api/donors', {
    donor: { name: donorName, email: `${donorName}@example.com` }
  }).then((donorResponse) => {
    cy.request('POST', 'http://localhost:3001/api/children', {
      child: { name: childName }
    }).then((childResponse) => {
      cy.request('POST', 'http://localhost:3001/api/sponsorships', {
        sponsorship: {
          donor_id: donorResponse.body.donor.id,
          child_id: childResponse.body.child.id,
          monthly_amount: 5000
        }
      });
    });
  });
};
```

**2. Conditional Button Testing:**
```typescript
it('shows correct action button based on state', () => {
  // Scenario 1: No donations → Delete button
  createSponsorshipFixture('Donor A', 'Child A');
  cy.visit('/sponsorships');
  cy.contains('Donor A').parent().within(() => {
    cy.contains('button', /delete/i).should('be.visible');
    cy.contains('button', /end/i).should('not.exist');
  });

  // Scenario 2: Has donations → End button
  cy.request('POST', 'http://localhost:3001/api/donations', {
    donation: { donor_id: 1, project_id: 1, amount: 5000, date: '2024-01-01' }
  });
  cy.reload();
  cy.contains('Donor A').parent().within(() => {
    cy.contains('button', /end/i).should('be.visible');
    cy.contains('button', /delete/i).should('not.exist');
  });

  // Scenario 3: Ended → Reactivate button
  cy.contains('button', /end/i).click();
  cy.contains('Donor A').parent().within(() => {
    cy.contains('button', /reactivate/i).should('be.visible');
  });
});
```

**3. Date Picker Testing (if TICKET-055 complete):**
```typescript
it('ends sponsorship with custom date', () => {
  createSponsorshipFixture('Donor B', 'Child B');
  cy.visit('/sponsorships');

  // Click End button
  cy.contains('Donor B').parent().contains('button', /end/i).click();

  // Date picker modal should appear
  cy.contains('End Sponsorship').should('be.visible');

  // Select custom date
  cy.get('input[type="date"]').type('2024-12-31');

  // Confirm
  cy.contains('button', /confirm|end sponsorship/i).click();

  // Verify ended with correct date
  cy.contains('Donor B').parent().should('contain', '2024-12-31');
});
```

**4. Filter Testing:**
```typescript
it('filters sponsorships by donor', () => {
  // Create 2 sponsorships with different donors
  createSponsorshipFixture('Alice', 'Child 1');
  createSponsorshipFixture('Bob', 'Child 2');

  cy.visit('/sponsorships');

  // Both visible initially
  cy.contains('Alice').should('be.visible');
  cy.contains('Bob').should('be.visible');

  // Apply donor filter (omni-search)
  cy.get('input[placeholder*="Search"]').type('Alice');
  cy.wait(500); // Debounce delay

  // Only Alice's sponsorship visible
  cy.contains('Alice').should('be.visible');
  cy.contains('Bob').should('not.exist');

  // Clear filter
  cy.get('input[placeholder*="Search"]').clear();
  cy.wait(500);

  // Both visible again
  cy.contains('Alice').should('be.visible');
  cy.contains('Bob').should('be.visible');
});
```

### Implementation Notes

**Dependencies Check:**
Before writing tests, verify which features are implemented:
1. Check if TICKET-055 is complete (End/Reactivate/Delete actions)
2. Check if TICKET-053 is complete (Filters/Pagination UI)
3. Adjust test coverage based on implementation status

**Test Organization:**
- Group related tests in describe blocks
- Use `it.skip()` for features not yet implemented
- Document why tests are skipped (reference ticket)

**Performance Optimization:**
- Use API calls for test data setup (faster than UI)
- Clean database before each test (not after - helps debugging)
- Use `cy.intercept()` for API call verification
- Minimize unnecessary waits (use Cypress retry logic)

### Files to Create
- `donation_tracker_frontend/cypress/e2e/sponsorship-management.cy.ts` (NEW - ~300-400 lines)

### Files May Need Updates
- `donation_tracker_frontend/cypress/e2e/children-sponsorship.cy.ts` (REFACTOR - separate sponsorship creation from management actions)

### Estimated Time
- Test writing: 3 hours
- Feature discovery (check what's implemented): 30 minutes
- Debugging/refinement: 1 hour
- Total: ~4.5 hours

### Success Criteria
- [ ] 15+ Cypress tests covering sponsorship actions
- [ ] All implemented features tested (skip unimplemented)
- [ ] Conditional button logic validated end-to-end
- [ ] Filter combinations work correctly
- [ ] No flaky tests (deterministic, proper debounce waits)
- [ ] Tests run in < 3 minutes

### Related Tickets
- TICKET-055: Sponsorship Management Actions (End, Reactivate, Delete) 📋
- TICKET-053: Sponsorships Page Filters & Pagination UI 📋
- TICKET-010: Children & Sponsorship Tracking (base feature) ✅
- TICKET-054: Create Sponsorship from Sponsorships Page ✅
- TICKET-064: Smart Sponsorship Detection (donation linking) ✅

### Notes
- **High Priority**: Sponsorships are a core business feature with complex state transitions
- **Business Risk**: Incorrect sponsorship management could cause donor miscommunication
- **Test Complexity**: Multi-entity setup required (donor + child + sponsorship + donations)
- **Feature Uncertainty**: TICKET-055 and TICKET-053 may not be fully implemented yet
- **Recommendation**: Check implementation status first, then write tests for completed features

### Test Execution Commands
```bash
# Run sponsorship management tests
docker-compose exec frontend npm run cypress:run -- --spec "cypress/e2e/sponsorship-management.cy.ts"

# Run all sponsorship-related tests
docker-compose exec frontend npm run cypress:run -- --spec "cypress/e2e/*sponsorship*.cy.ts"

# Open Cypress UI for debugging
docker-compose exec frontend npm run cypress:open
```

### Definition of Done
- [ ] 15+ E2E tests written for implemented features
- [ ] Conditional action button logic validated
- [ ] Filter combinations tested (if filters implemented)
- [ ] All tests passing in CI environment
- [ ] Test execution time < 3 minutes
- [ ] No console errors during test runs
- [ ] Tests added to pre-commit hook validation
- [ ] DonationTracking.md updated with test coverage status
- [ ] Any skipped tests documented with ticket references
