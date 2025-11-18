## [TICKET-121] Children Management E2E Tests

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Effort:** S (Small - 2-3 hours)
**Created:** 2025-11-18
**Dependencies:** None

### User Story
As a QA engineer, I want comprehensive E2E tests for Children management features so that we can catch regressions in child CRUD operations, search, filtering, and archiving.

### Problem Statement
Current E2E test coverage for Children is limited to sponsorship context (`children-sponsorship.cy.ts`). We lack comprehensive tests for standalone Children management features.

**Current Coverage:**
- ✅ Children in sponsorship context (children-sponsorship.cy.ts)
- ❌ Child CRUD (create, edit, delete)
- ❌ Child search/filtering
- ❌ Child archive/restore
- ❌ Child gender field validation (TICKET-052 feature)

**Impact:** Missing test coverage for core Children management workflows

### Acceptance Criteria
- [ ] E2E test: Create child with all fields (name, age, bio, location, gender)
- [ ] E2E test: Create child with gender = boy
- [ ] E2E test: Create child with gender = girl
- [ ] E2E test: Create child with gender = null (not specified)
- [ ] E2E test: Edit child information
- [ ] E2E test: Edit child gender (boy → girl → null)
- [ ] E2E test: Delete child (when no active sponsorships)
- [ ] E2E test: Search children by name
- [ ] E2E test: Filter children by archived status
- [ ] E2E test: Archive child
- [ ] E2E test: Restore archived child
- [ ] E2E test: Child list pagination
- [ ] E2E test: Gender icon display (Boy/Girl icons)
- [ ] All tests pass with 0 flakiness

### Technical Approach

#### 1. Create `children-crud.cy.ts`

**Child CRUD Operations:**
```typescript
describe('Children CRUD', () => {
  it('creates child with all fields', () => {
    cy.visit('/children');
    cy.get('input[name="name"]').type('Maria Santos');
    cy.get('input[name="age"]').type('8');
    cy.get('select[name="gender"]').select('girl');
    cy.get('textarea[name="bio"]').type('Loves reading and drawing');
    cy.get('input[name="location"]').type('Guatemala City');
    cy.get('button[type="submit"]').click();

    cy.contains('Maria Santos').should('be.visible');
    cy.contains('8 years old').should('be.visible');
    cy.get('[data-testid="girl-icon"]').should('be.visible');
  });

  it('edits child information', () => {
    // Create child first
    // Click edit button
    // Modify fields
    // Verify changes appear
  });

  it('prevents deletion when child has active sponsorships', () => {
    // Create child with sponsorship
    // Try to delete
    // Verify error message
  });
});
```

#### 2. Create `children-search.cy.ts`

**Search & Filtering:**
```typescript
describe('Children Search & Filtering', () => {
  beforeEach(() => {
    // Seed database with multiple children
  });

  it('searches children by name', () => {
    cy.visit('/children');
    cy.get('input[placeholder*="Search"]').type('Maria');
    cy.contains('Maria Santos').should('be.visible');
    cy.contains('Juan Rodriguez').should('not.exist');
  });

  it('filters by archived status', () => {
    // Archive a child
    // Toggle "Show Archived" checkbox
    // Verify archived child appears
  });
});
```

#### 3. Create `children-archive.cy.ts`

**Archive/Restore:**
```typescript
describe('Children Archive/Restore', () => {
  it('archives child without active sponsorships', () => {
    // Create child
    // Click archive button
    // Verify child no longer in active list
    // Toggle "Show Archived"
    // Verify child appears with archived badge
  });

  it('restores archived child', () => {
    // Archive child
    // Click restore button
    // Verify child back in active list
  });

  it('prevents archiving child with active sponsorships', () => {
    // Create child with sponsorship
    // Try to archive
    // Verify error message
  });
});
```

#### 4. Create `children-gender.cy.ts`

**Gender Field Validation (TICKET-052):**
```typescript
describe('Child Gender Field', () => {
  it('creates child with gender = boy', () => {
    // Create child, select "Boy"
    // Verify Boy icon displayed
  });

  it('creates child with gender = girl', () => {
    // Create child, select "Girl"
    // Verify Girl icon displayed
  });

  it('creates child with no gender specified', () => {
    // Create child, leave gender empty
    // Verify default Boy icon displayed (null defaults to boy)
  });

  it('edits child gender from boy to girl', () => {
    // Create child with boy
    // Edit to girl
    // Verify icon changes
  });

  it('clears gender to null', () => {
    // Create child with gender
    // Edit to "Not specified"
    // Verify default Boy icon
  });
});
```

### Files to Create
- `cypress/e2e/children-crud.cy.ts` (NEW)
- `cypress/e2e/children-search.cy.ts` (NEW)
- `cypress/e2e/children-archive.cy.ts` (NEW)
- `cypress/e2e/children-gender.cy.ts` (NEW)

### Expected Test Count
- **Total New Tests:** ~18-20 E2E tests
- **Estimated Run Time:** ~2-3 minutes

### Testing Strategy

**Test Data Management:**
- Use `cy.task('db:seed')` for consistent test data
- Clean database before each test file (`beforeEach`)
- Create minimal test data for each scenario

**Stability:**
- Use `cy.intercept()` to wait for API calls
- Use `data-testid` attributes for reliable selectors
- Follow existing E2E test patterns (environment-isolation.cy.ts)

### Benefits
- Comprehensive coverage of Children management workflows
- Regression prevention for TICKET-052 (gender field) feature
- Validates archive/restore business logic
- Ensures search/filtering works correctly

### Related Tickets
- TICKET-052 - Gender field implementation (feature to test)
- TICKET-050 - Children page UI standardization
- TICKET-010 - Children & Basic Sponsorship Tracking
- TICKET-108 - E2E test infrastructure improvements

### Notes
- Follow existing E2E test patterns in `donation-entry.cy.ts` and `donor-archive.cy.ts`
- Ensure tests pass with 100% success rate (no flakiness)
- Add tests to CI pipeline (already configured via npm run cypress:e2e)
