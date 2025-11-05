## [TICKET-083] Multi-Page Integration & State Persistence E2E Tests

**Status:** 📋 Planned
**Priority:** 🟢 Low
**Effort:** S (Small - 1-2 hours)
**Created:** 2025-11-05
**Dependencies:** TICKET-019 (React Router multi-page) ✅, TICKET-030 (Refactor to multi-page) ✅

### User Story
As a developer, I want E2E tests validating navigation between all pages and state persistence so that I can ensure the multi-page architecture works correctly and filters/pagination persist during CRUD operations.

### Problem Statement
**Current State:**
- `cypress/e2e/navigation.cy.ts` exists with basic navigation tests (47 lines)
- Current tests cover:
  - ✅ Navigate between pages via sidebar
  - ✅ Page titles display correctly
  - ✅ URLs update correctly

**Missing E2E Coverage:**
- State persistence during CRUD operations (filters remain after creating/editing entity)
- Pagination state management across navigation
- Complex workflows spanning multiple pages (create donor → create donation → view in list)
- Browser back/forward button navigation
- Deep linking (direct URL access to filtered/paginated views)
- Cross-page data consistency (creating entity in one page appears in related page)

**Gap Analysis:**
- ✅ TICKET-019: React Router implemented
- ✅ TICKET-030: Multi-page refactor complete
- ⚠️ Basic navigation tested but no integration workflow tests
- ❌ No validation of state persistence during complex operations

### Acceptance Criteria

#### Navigation & State Persistence

- [ ] Filter state persists after creating entity
  - Navigate to Donors page
  - Apply search filter "Alice"
  - Click "Create Donor" → create donor "Bob"
  - After creation, verify search filter still shows "Alice"
  - Verify Bob not visible (filtered out)
  - Clear filter → verify Bob appears

- [ ] Pagination state persists after editing entity
  - Navigate to Donations page
  - Navigate to page 2
  - Edit donation
  - After save, verify still on page 2
  - Verify pagination controls show page 2

- [ ] Filters persist across CRUD operations
  - Donations page: Apply date range filter + project filter
  - Create new donation (matching filters)
  - Verify filters still applied
  - Verify new donation appears in filtered list
  - Delete donation → verify filters still applied

#### Cross-Page Integration Workflows

- [ ] Create donor → immediately create donation for that donor
  - Navigate to Donors page
  - Create donor "New Donor"
  - Navigate to Donations page
  - Create donation for "New Donor"
  - Verify donor autocomplete finds "New Donor"
  - Verify donation created successfully
  - Navigate back to Donors page
  - Verify donor shows donation count (if displayed)

- [ ] Create child → create sponsorship → verify in multiple pages
  - Navigate to Children page
  - Create child "New Child"
  - Navigate to Sponsorships page
  - Create sponsorship for "New Child"
  - Navigate back to Children page
  - Verify child shows sponsor info
  - Navigate to Sponsorships page
  - Verify sponsorship appears in list

- [ ] Create project → create donation to project → verify project shows donation count
  - Navigate to Projects page
  - Create project "Test Campaign"
  - Navigate to Donations page
  - Create donation to "Test Campaign"
  - Navigate back to Projects page
  - Verify project shows donation count OR delete button disabled

- [ ] Donor merge → verify donations reassigned across pages
  - Create 2 donors with donations
  - Navigate to Donors page
  - Merge donors
  - Navigate to Donations page
  - Verify all donations now show merged donor name

#### Browser Navigation

- [ ] Browser back button returns to previous page with state
  - Navigate to Donations page
  - Apply filters
  - Navigate to Donors page
  - Click browser back button
  - Verify Donations page loads with filters still applied

- [ ] Browser forward button navigates correctly
  - Navigate Donors → Donations → back → forward
  - Verify Donations page loads correctly

- [ ] Deep linking with query parameters (if implemented)
  - Manually navigate to `/donations?page=2&project_id=3`
  - Verify page 2 loads with project filter applied
  - **Note:** May not be implemented - check URL patterns first

#### Data Consistency

- [ ] Entity created in one page appears in related pages
  - Create donor "Consistency Test"
  - Navigate to Donations page
  - Verify "Consistency Test" appears in donor autocomplete
  - Create donation for "Consistency Test"
  - Navigate back to Donors page
  - Verify "Consistency Test" shows donation count

- [ ] Entity deleted in one page removed from related pages
  - Create project with no donations
  - Delete project
  - Navigate to Donations page
  - Verify project not in project autocomplete

### Technical Approach

#### Test File Structure
```typescript
// cypress/e2e/multi-page-integration.cy.ts (NEW FILE)
describe('Multi-Page Integration & State Persistence', () => {
  beforeEach(() => {
    cy.request('DELETE', 'http://localhost:3001/api/test/cleanup');
  });

  describe('State Persistence', () => {
    it('preserves filter state after creating entity');
    it('preserves pagination state after editing entity');
    it('preserves combined filters during CRUD operations');
  });

  describe('Cross-Page Workflows', () => {
    it('creates donor then donation in sequence');
    it('creates child then sponsorship then verifies in multiple pages');
    it('creates project then donation then verifies project state');
    it('merges donors and verifies donations reassigned');
  });

  describe('Browser Navigation', () => {
    it('browser back button preserves page state');
    it('browser forward button works correctly');
  });

  describe('Data Consistency', () => {
    it('entity appears in related page autocompletes');
    it('deleted entity removed from related pages');
  });
});
```

#### Update Existing Navigation Tests
```typescript
// cypress/e2e/navigation.cy.ts (EXTEND existing file)

describe('Page Navigation', () => {
  // ... existing tests ...

  describe('URL State', () => {
    it('updates URL when navigating between pages', () => {
      cy.visit('/');
      cy.url().should('include', '/donors');

      cy.contains('Donations').click();
      cy.url().should('include', '/donations');
    });

    it('preserves URL parameters during navigation', () => {
      // If query params implemented
      cy.visit('/donations?page=2');
      cy.url().should('include', 'page=2');
    });
  });
});
```

#### Key Testing Patterns

**1. State Persistence Pattern:**
```typescript
it('preserves filter state after creating entity', () => {
  cy.visit('/donors');

  // Apply filter
  cy.get('input[placeholder*="Search"]').type('Alice');
  cy.wait(500); // Debounce
  cy.url().should('include', 'Alice'); // If URL params used

  // Create entity
  cy.get('input[type="text"]').first().clear().type('Bob Donor');
  cy.get('input[type="email"]').type('bob@example.com');
  cy.contains('button', /submit/i).click();
  cy.contains(/donor (created|updated) successfully/i, { timeout: 5000 });

  // Verify filter still applied
  cy.get('input[placeholder*="Search"]').should('have.value', 'Alice');
  cy.contains('Bob Donor').should('not.exist'); // Filtered out
});
```

**2. Cross-Page Workflow Pattern:**
```typescript
it('creates donor then donation in sequence', () => {
  // Create donor
  cy.visit('/donors');
  cy.get('input[type="text"]').first().type('Workflow Donor');
  cy.get('input[type="email"]').type('workflow@example.com');
  cy.contains('button', /submit/i).click();
  cy.contains(/donor (created|updated) successfully/i, { timeout: 5000 });

  // Navigate to donations page
  cy.contains('Donations').click();
  cy.url().should('include', '/donations');

  // Create donation for new donor
  cy.contains('h2', 'Record Donation').parent().within(() => {
    cy.contains('label', 'Donor').parent().find('input').type('Workflow');
    cy.wait(500);
    cy.get('[role="option"]').contains('Workflow Donor').should('be.visible');
    cy.get('[role="option"]').contains('Workflow Donor').click();

    cy.contains('label', 'Amount').parent().find('input').type('100');
    cy.contains('button', /create donation/i).click();
  });

  cy.contains(/donation created successfully/i, { timeout: 5000 });

  // Navigate back to donors page
  cy.contains('Donors').click();

  // Verify donor shows donation (if count displayed)
  cy.contains('Workflow Donor').should('be.visible');
});
```

**3. Browser Navigation Pattern:**
```typescript
it('browser back button preserves page state', () => {
  // Start at donors
  cy.visit('/donors');

  // Apply filter
  cy.get('input[placeholder*="Search"]').type('Test');
  cy.wait(500);

  // Navigate to donations
  cy.contains('Donations').click();
  cy.url().should('include', '/donations');

  // Go back
  cy.go('back');

  // Verify back at donors with filter preserved
  cy.url().should('include', '/donors');
  cy.get('input[placeholder*="Search"]').should('have.value', 'Test');
});
```

### Implementation Notes

**URL State Management:**
- Check if query parameters are used for filters/pagination
- If yes: Test URL updates when filters change
- If no: Test only component state persistence

**State Persistence Strategy:**
- Most apps use component state (resets on unmount)
- Some use URL query params (persists across navigation)
- Some use global state (Redux/Context - persists across navigation)
- Test according to actual implementation

**Cross-Browser Testing:**
- Focus on Chrome (primary browser for Cypress)
- Browser navigation (back/forward) should work consistently

**Performance:**
- Keep tests fast by using API for setup where possible
- Only test actual user workflows via UI

### Files to Create
- `donation_tracker_frontend/cypress/e2e/multi-page-integration.cy.ts` (NEW - ~200-250 lines)

### Files to Update
- `donation_tracker_frontend/cypress/e2e/navigation.cy.ts` (EXTEND - add URL state tests, ~30 lines)

### Estimated Time
- Feature discovery (check state management approach): 30 minutes
- Test writing: 1.5 hours
- Debugging: 30 minutes
- Total: ~2.5 hours

### Success Criteria
- [ ] 10+ E2E tests covering multi-page workflows
- [ ] State persistence validated across CRUD operations
- [ ] Cross-page data consistency tested
- [ ] Browser navigation tested (back/forward)
- [ ] All tests passing in CI environment
- [ ] Test execution time < 3 minutes
- [ ] No flaky tests

### Related Tickets
- TICKET-019: Multi-Page Architecture (React Router) ✅
- TICKET-030: Refactor App to Multi-Page Architecture ✅
- TICKET-032: Custom Hooks Library (usePagination, useRansackFilters) ✅
- TICKET-078: Fix Donation Filter Race Condition ✅ (state management fixes)

### Notes
- **Low Priority**: Basic navigation already tested; this adds integration validation
- **State Management**: Important to verify filters/pagination persist correctly
- **User Experience**: Complex workflows spanning multiple pages are common user flows
- **Regression Protection**: Ensures multi-page refactor didn't break state management

### Test Execution Commands
```bash
# Run multi-page integration tests
docker-compose exec frontend npm run cypress:run -- --spec "cypress/e2e/multi-page-integration.cy.ts"

# Run all navigation-related tests
docker-compose exec frontend npm run cypress:run -- --spec "cypress/e2e/navigation.cy.ts,cypress/e2e/multi-page-integration.cy.ts"

# Open Cypress UI for debugging
docker-compose exec frontend npm run cypress:open
```

### Definition of Done
- [ ] 10+ E2E tests written for multi-page workflows
- [ ] State persistence validated
- [ ] Cross-page data consistency tested
- [ ] Browser navigation tested
- [ ] All tests passing in CI environment
- [ ] Test execution time < 3 minutes
- [ ] No console errors during test runs
- [ ] Tests added to pre-commit hook validation
- [ ] DonationTracking.md updated with integration test coverage
