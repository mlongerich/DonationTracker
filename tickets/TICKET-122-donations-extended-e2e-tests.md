## [TICKET-122] Donations Extended E2E Tests

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Effort:** M (Medium - 3-4 hours)
**Created:** 2025-11-18
**Dependencies:** TICKET-109 (Donation status infrastructure) ✅

### User Story
As a QA engineer, I want comprehensive E2E tests for Donations beyond basic entry and filtering so that we can validate edit/delete workflows, status filtering, payment method filtering, and project/sponsorship linking.

### Problem Statement
Current E2E test coverage for Donations is limited to entry and basic filtering.

**Current Coverage:**
- ✅ Donation entry (donation-entry.cy.ts)
- ✅ Date range filtering (donation-filtering.cy.ts)
- ✅ Stripe badge display (donation-stripe-badge.cy.ts)
- ❌ Donation edit/delete workflows
- ❌ Status filtering (succeeded/failed/refunded/canceled/needs_attention) - TICKET-109
- ❌ Payment method filtering (stripe/check/cash/bank_transfer)
- ❌ Project selection in donations
- ❌ Sponsorship linking in donations

**Impact:** Missing test coverage for donation status infrastructure and CRUD workflows

### Acceptance Criteria

#### Donation CRUD
- [ ] E2E test: Edit donation amount
- [ ] E2E test: Edit donation date
- [ ] E2E test: Edit donation payment method
- [ ] E2E test: Delete donation (within 24-hour window - if implemented)
- [ ] E2E test: Prevent deletion after 24 hours (if implemented)

#### Status Filtering (TICKET-109)
- [ ] E2E test: Filter by status = succeeded
- [ ] E2E test: Filter by status = failed
- [ ] E2E test: Filter by status = refunded
- [ ] E2E test: Filter by status = canceled
- [ ] E2E test: Filter by status = needs_attention
- [ ] E2E test: "Pending Review" filter (failed + refunded + canceled + needs_attention)
- [ ] E2E test: Status badge display in donation list

#### Payment Method Filtering
- [ ] E2E test: Filter by payment method = stripe
- [ ] E2E test: Filter by payment method = check
- [ ] E2E test: Filter by payment method = cash
- [ ] E2E test: Filter by payment method = bank_transfer
- [ ] E2E test: Clear payment method filter

#### Project & Sponsorship Linking
- [ ] E2E test: Create donation linked to project (not sponsorship)
- [ ] E2E test: Create donation linked to child (creates sponsorship automatically)
- [ ] E2E test: Donation displays correct project/child name
- [ ] E2E test: Filter donations by project
- [ ] E2E test: Filter donations by child/sponsorship

### Technical Approach

#### 1. Create `donations-crud.cy.ts`

**Edit/Delete Operations:**
```typescript
describe('Donations CRUD', () => {
  beforeEach(() => {
    cy.task('db:seed');
    // Create donor and donation
  });

  it('edits donation amount', () => {
    cy.visit('/donations');
    cy.contains('$100.00').parent().contains('Edit').click();
    cy.get('input[name="amount"]').clear().type('150.00');
    cy.get('button[type="submit"]').click();
    cy.contains('$150.00').should('be.visible');
  });

  it('edits donation payment method', () => {
    // Create donation with payment_method = check
    // Edit to cash
    // Verify change reflected
  });

  it('deletes donation within 24-hour window', () => {
    // If TICKET-086 implemented
    // Create donation today
    // Click delete
    // Confirm deletion
    // Verify removed from list
  });

  it('prevents deletion after 24 hours', () => {
    // If TICKET-086 implemented
    // Create donation 2 days ago
    // Verify delete button disabled or hidden
  });
});
```

#### 2. Create `donations-status-filtering.cy.ts`

**Status Filtering (TICKET-109):**
```typescript
describe('Donation Status Filtering', () => {
  beforeEach(() => {
    cy.task('db:seed');
    // Create donations with various statuses
  });

  it('filters by status = succeeded', () => {
    // Create: 2 succeeded, 1 failed, 1 refunded
    cy.visit('/donations');
    cy.get('select[name="status"]').select('succeeded');
    cy.contains('Succeeded').should('have.length', 2);
    cy.contains('Failed').should('not.exist');
  });

  it('filters by status = needs_attention', () => {
    // Create donations with needs_attention status
    // Apply filter
    // Verify only needs_attention donations shown
    // Verify needs_attention_reason displayed
  });

  it('filters by "Pending Review" (composite)', () => {
    // Pending Review = failed + refunded + canceled + needs_attention
    // Create mix of all statuses
    // Select "Pending Review" filter
    // Verify only non-succeeded donations shown
  });

  it('displays status badges', () => {
    // Create donations with all statuses
    // Visit donations page
    // Verify each has correct badge (color + text)
    // succeeded = green, failed = red, refunded = orange, etc.
  });
});
```

#### 3. Create `donations-payment-method-filtering.cy.ts`

**Payment Method Filtering:**
```typescript
describe('Donation Payment Method Filtering', () => {
  beforeEach(() => {
    // Create donations with different payment methods
  });

  it('filters by payment method = stripe', () => {
    cy.visit('/donations');
    cy.get('select[name="payment_method"]').select('stripe');
    // Verify only Stripe donations shown
    // Verify Stripe badge visible
  });

  it('filters by payment method = check', () => {
    // Similar test for check
  });

  it('clears payment method filter', () => {
    // Apply filter
    // Click "Clear" or select "All"
    // Verify all donations visible again
  });
});
```

#### 4. Create `donations-project-linking.cy.ts`

**Project & Sponsorship Linking:**
```typescript
describe('Donation Project & Sponsorship Linking', () => {
  beforeEach(() => {
    // Create donor, projects, children
  });

  it('creates donation linked to general project', () => {
    cy.visit('/donations');
    cy.get('input[name="donor"]').type('John Doe');
    cy.get('input[name="amount"]').type('100');

    // Select project (not child)
    cy.get('input[name="donation_for"]').type('Summer Campaign');
    cy.contains('Summer Campaign').click();

    cy.get('button[type="submit"]').click();

    // Verify donation created
    cy.contains('John Doe').parent().should('contain', 'Summer Campaign');
    cy.contains('John Doe').parent().should('not.contain', 'Sponsorship');
  });

  it('creates donation linked to child (auto-creates sponsorship)', () => {
    // TICKET-064 smart sponsorship detection
    cy.visit('/donations');
    cy.get('input[name="donor"]').type('Jane Smith');
    cy.get('input[name="amount"]').type('50');

    // Select child
    cy.get('input[name="donation_for"]').type('Maria Santos');
    cy.contains('Maria Santos').click();

    cy.get('button[type="submit"]').click();

    // Verify donation created with sponsorship
    cy.contains('Jane Smith').parent().should('contain', 'Maria Santos');

    // Verify sponsorship auto-created
    cy.visit('/sponsorships');
    cy.contains('Jane Smith').parent().should('contain', 'Maria Santos');
  });

  it('filters donations by project', () => {
    // If TICKET-046 implemented
    // Create donations for multiple projects
    // Apply project filter
    // Verify only selected project's donations shown
  });
});
```

### Files to Create
- `cypress/e2e/donations-crud.cy.ts` (NEW)
- `cypress/e2e/donations-status-filtering.cy.ts` (NEW)
- `cypress/e2e/donations-payment-method-filtering.cy.ts` (NEW)
- `cypress/e2e/donations-project-linking.cy.ts` (NEW)

### Expected Test Count
- **Total New Tests:** ~20-25 E2E tests
- **Estimated Run Time:** ~3-4 minutes

### Testing Strategy

**Test Data Management:**
- Use API calls to create test data (donors, projects, children, donations)
- Clean database before each test file
- Use factory-like helpers for consistent data creation

**Status Badge Validation:**
```typescript
const verifyStatusBadge = (donationRow, expectedStatus) => {
  cy.contains(donationRow).parent().within(() => {
    cy.get('[data-testid="status-badge"]')
      .should('have.text', expectedStatus)
      .should('have.class', `status-${expectedStatus.toLowerCase()}`);
  });
};
```

**Filter Combination Testing:**
```typescript
it('combines status + payment method + date range filters', () => {
  // Create mix of donations
  // Apply: status=succeeded, payment_method=stripe, date_range=last 30 days
  // Verify correct subset shown
});
```

### Benefits
- Comprehensive coverage of donation status infrastructure (TICKET-109)
- Validates payment method filtering
- Ensures project/sponsorship linking works correctly
- Tests edit/delete workflows (if implemented)
- Prevents regressions in donation filtering

### Related Tickets
- TICKET-109 - Donation Status Infrastructure (succeeded/failed/refunded/canceled/needs_attention) ✅
- TICKET-110 - Import Service with Status & Metadata ✅
- TICKET-064 - Smart Sponsorship Detection (auto-creation from donations) ✅
- TICKET-085 - Donation Source & Payment Method Tracking ✅
- TICKET-086 - Delete Donation Within 24-Hour Window 📋 (may not be implemented)
- TICKET-046 - Add Project Filter to Donations Page 📋 (may not be implemented)

### Notes
- Some tests may need to be skipped if features not yet implemented (TICKET-086, TICKET-046)
- Use `it.skip()` for unimplemented features with ticket reference
- Status filtering is HIGH PRIORITY (core TICKET-109/110 feature)
- Follow existing E2E test patterns (donation-entry.cy.ts, donation-filtering.cy.ts)
