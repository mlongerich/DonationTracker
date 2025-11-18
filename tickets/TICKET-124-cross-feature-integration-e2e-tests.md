## [TICKET-124] Cross-Feature Integration E2E Tests

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Effort:** M (Medium - 3 hours)
**Created:** 2025-11-18
**Dependencies:** None

### User Story
As a QA engineer, I want E2E tests that validate cross-feature workflows so that we can ensure data flows correctly between Donors, Donations, Projects, Children, and Sponsorships.

### Problem Statement
Current E2E tests focus on individual features in isolation. We lack comprehensive tests for workflows that span multiple entities.

**Current Coverage:**
- ✅ Individual entity CRUD operations
- ✅ Last donation date updates (last-donation-date.cy.ts)
- ❌ Donation → Project linkage workflow
- ❌ Donation → Child → Sponsorship auto-creation workflow
- ❌ Multi-entity state consistency
- ❌ Cascade delete prevention

**Impact:** Missing test coverage for complex business workflows

### Acceptance Criteria

#### Donation → Project Workflow
- [ ] E2E test: Create donation linked to existing project
- [ ] E2E test: Donation displays project name
- [ ] E2E test: Filter donations by project (if implemented)
- [ ] E2E test: Project cannot be deleted when donations exist

#### Donation → Child → Sponsorship Workflow
- [ ] E2E test: Create donation for child (auto-creates sponsorship)
- [ ] E2E test: Verify sponsorship appears in Sponsorships page
- [ ] E2E test: Verify child displays donor as sponsor
- [ ] E2E test: Subsequent donation to same child links to existing sponsorship
- [ ] E2E test: Monthly amount calculated from first donation

#### Donor → Sponsorship → Child Workflow
- [ ] E2E test: Create sponsorship directly
- [ ] E2E test: Verify child shows sponsor in Children page
- [ ] E2E test: Donor cannot be archived when active sponsorship exists

#### Multi-Entity State Consistency
- [ ] E2E test: Merge donors → donations reassigned
- [ ] E2E test: Merge donors → sponsorships reassigned
- [ ] E2E test: Archive donor → donations still visible with archived badge
- [ ] E2E test: Archive child → sponsorships marked as inactive

#### Cascade Delete Prevention
- [ ] E2E test: Cannot delete donor with donations
- [ ] E2E test: Cannot delete donor with sponsorships
- [ ] E2E test: Cannot delete child with active sponsorships
- [ ] E2E test: Cannot delete project with donations

### Technical Approach

#### 1. Create `cross-feature-donation-project.cy.ts`

**Donation → Project Linkage:**
```typescript
describe('Donation → Project Integration', () => {
  beforeEach(() => {
    // Create donor and project via API
  });

  it('creates donation linked to project', () => {
    cy.visit('/donations');

    // Fill donation form
    cy.get('input[name="donor"]').type('John Doe');
    cy.get('input[name="amount"]').type('100');
    cy.get('input[name="date"]').type('2024-01-15');

    // Select project
    cy.get('input[name="donation_for"]').type('Summer Campaign');
    cy.contains('li', 'Summer Campaign').click();

    cy.get('button[type="submit"]').click();

    // Verify donation displays project name
    cy.contains('John Doe').parent().should('contain', 'Summer Campaign');
  });

  it('prevents deleting project with donations', () => {
    // Create donation linked to project
    // Visit projects page
    // Try to delete project
    // Verify error message
    cy.visit('/projects');
    cy.contains('Summer Campaign').parent().within(() => {
      cy.contains('button', /delete/i).should('be.disabled');
      // OR verify error on click
    });
  });

  it('filters donations by project', () => {
    // If TICKET-046 implemented
    // Create donations for multiple projects
    // Apply project filter
    // Verify only selected project's donations shown
  });
});
```

#### 2. Create `cross-feature-donation-sponsorship.cy.ts`

**Donation → Child → Sponsorship Workflow:**
```typescript
describe('Donation → Child → Sponsorship Auto-Creation', () => {
  beforeEach(() => {
    // Create donor and child
  });

  it('creates sponsorship when donation for child is made', () => {
    cy.visit('/donations');

    // Create donation for child
    cy.get('input[name="donor"]').type('Jane Smith');
    cy.get('input[name="amount"]').type('50');
    cy.get('input[name="donation_for"]').type('Maria Santos');
    cy.contains('li', 'Maria Santos').click();

    cy.get('button[type="submit"]').click();

    // Verify donation created
    cy.contains('Jane Smith').should('be.visible');

    // Verify sponsorship auto-created
    cy.visit('/sponsorships');
    cy.contains('Jane Smith').parent().should('contain', 'Maria Santos');
    cy.contains('Jane Smith').parent().should('contain', '$50.00');
  });

  it('links subsequent donations to existing sponsorship', () => {
    // Create first donation → sponsorship created
    // Create second donation for same donor + child
    // Verify no duplicate sponsorship
    // Verify both donations linked to same sponsorship project
  });

  it('calculates monthly amount from first donation', () => {
    // Create donation for $75
    // Verify sponsorship shows $75.00/month
  });
});
```

#### 3. Create `cross-feature-donor-sponsorship.cy.ts`

**Donor → Sponsorship → Child Workflow:**
```typescript
describe('Donor → Sponsorship → Child Integration', () => {
  it('creates sponsorship from Sponsorships page', () => {
    // Create donor and child
    cy.visit('/sponsorships');

    // Fill sponsorship form
    cy.get('input[name="donor"]').type('Bob Johnson');
    cy.get('input[name="child"]').type('Juan Rodriguez');
    cy.get('input[name="monthly_amount"]').type('40');

    cy.get('button[type="submit"]').click();

    // Verify sponsorship appears
    cy.contains('Bob Johnson').parent().should('contain', 'Juan Rodriguez');

    // Verify child shows sponsor
    cy.visit('/children');
    cy.contains('Juan Rodriguez').parent().should('contain', 'Bob Johnson');
  });

  it('prevents archiving donor with active sponsorship', () => {
    // Create sponsorship
    // Visit donors page
    // Try to archive donor
    // Verify error message
  });
});
```

#### 4. Create `cross-feature-state-consistency.cy.ts`

**Multi-Entity State Consistency:**
```typescript
describe('Multi-Entity State Consistency', () => {
  it('reassigns donations after donor merge', () => {
    // Create 2 donors with donations
    // Merge donor A into donor B
    // Verify all donations now belong to donor B
    cy.visit('/donations');
    cy.get('select[name="donor_filter"]').select('Donor B');
    // Verify both original donations visible
  });

  it('reassigns sponsorships after donor merge', () => {
    // Create 2 donors with sponsorships
    // Merge
    // Verify all sponsorships reassigned
  });

  it('displays archived donor badge on donations', () => {
    // Create donor with donation
    // Archive donor
    // Visit donations page
    // Verify donation still visible
    // Verify donor name has "Archived" badge
  });
});
```

#### 5. Create `cross-feature-cascade-prevention.cy.ts`

**Cascade Delete Prevention:**
```typescript
describe('Cascade Delete Prevention', () => {
  it('prevents deleting donor with donations', () => {
    // Create donor with donation
    // Try to delete donor
    // Verify error message
  });

  it('prevents deleting child with active sponsorships', () => {
    // Create child with active sponsorship
    // Try to delete child
    // Verify error message
  });

  it('prevents deleting project with donations', () => {
    // Already tested in cross-feature-donation-project.cy.ts
  });
});
```

### Files to Create
- `cypress/e2e/cross-feature-donation-project.cy.ts` (NEW)
- `cypress/e2e/cross-feature-donation-sponsorship.cy.ts` (NEW)
- `cypress/e2e/cross-feature-donor-sponsorship.cy.ts` (NEW)
- `cypress/e2e/cross-feature-state-consistency.cy.ts` (NEW)
- `cypress/e2e/cross-feature-cascade-prevention.cy.ts` (NEW)

### Expected Test Count
- **Total New Tests:** ~18-22 E2E tests
- **Estimated Run Time:** ~3-4 minutes

### Testing Strategy

**Test Data Management:**
- Use API calls to create interconnected entities
- Clean database before each test
- Use descriptive entity names for clarity (e.g., "John Doe", "Summer Campaign")

**Assertion Patterns:**
```typescript
// Verify entity appears in related list
cy.visit('/sponsorships');
cy.contains(donorName).parent().should('contain', childName);

// Verify cascade delete prevention
cy.contains('button', /delete/i).click();
cy.contains(/cannot delete.*has active/i).should('be.visible');
```

### Benefits
- Validates complex business workflows
- Ensures data consistency across features
- Tests cascade delete business rules
- Prevents regressions in multi-entity interactions

### Related Tickets
- TICKET-064 - Smart Sponsorship Detection ✅
- TICKET-005 - Auto-Reassign Donations After Donor Merge ✅
- TICKET-062 - Donor Cascade Delete Strategy ✅
- TICKET-038 - Cascade Delete Strategy for Donations ✅
- TICKET-063 - Archive Business Logic for Active Sponsorships ✅
- TICKET-077 - Last Donation Date Tracking ✅

### Notes
- Some workflows may need to be skipped if features not implemented
- Focus on HIGH RISK workflows first (sponsorship auto-creation, cascade deletes)
- Use existing E2E patterns from donor-merge-reassignment.cy.ts
- Verify state changes persist across page navigations
