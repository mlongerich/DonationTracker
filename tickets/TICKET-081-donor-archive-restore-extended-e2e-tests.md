## [TICKET-081] Donor Archive/Restore Extended E2E Tests

**Status:** 📋 Planned
**Priority:** 🟢 Low
**Effort:** S (Small - 1-2 hours)
**Created:** 2025-11-05
**Dependencies:** TICKET-001 (Donor soft delete) ✅, TICKET-062 (Cascade delete strategy) ✅

### User Story
As a developer, I want comprehensive E2E tests for donor archive/restore workflows so that I can ensure data preservation, cascade delete protection, and search filtering work correctly across complex scenarios.

### Problem Statement
**Current State:**
- `cypress/e2e/donor-archive.cy.ts` exists with basic archive/restore tests (71 lines)
- Current tests cover:
  - ✅ Archive donor
  - ✅ Restore donor
  - ✅ Show/hide archived toggle
  - ✅ Archived state visual indicators

**Missing E2E Coverage:**
- Archive donor with donations → verify donations preserved
- Archive donor with sponsorships → verify sponsorships preserved
- Restore archived donor → verify donations still linked
- Restore archived donor → verify sponsorships still linked
- Search respects archived state toggle
- Attempt hard delete donor with donations → verify blocked (if exposed in UI)
- Cascade delete protection validation

**Gap Analysis:**
- ✅ TICKET-001: Soft delete implemented and tested
- ✅ TICKET-062: Cascade delete strategy implemented
- ⚠️ E2E tests only cover simple archive/restore (no associated data)
- ❌ No regression protection for data preservation during archive

### Acceptance Criteria

#### Extended Archive/Restore Tests

- [ ] Archive donor with donations preserves donation history
  - Create donor
  - Create 2-3 donations for donor
  - Archive donor
  - Navigate to Donations page
  - Verify donations still visible
  - Verify donor name still displayed (archived donor)
  - Navigate back to Donors page
  - Toggle "Show Archived"
  - Verify archived donor shows with donations count

- [ ] Archive donor with sponsorships preserves sponsorships
  - Create donor
  - Create child
  - Create sponsorship (donor + child)
  - Archive donor
  - Navigate to Sponsorships page
  - Verify sponsorship still visible
  - Verify donor name still displayed
  - Navigate to Children page
  - Verify child still shows sponsor (archived donor)

- [ ] Restore donor with donations maintains associations
  - Archive donor with donations (from previous test)
  - Restore donor
  - Navigate to Donations page
  - Verify donations still linked to donor
  - Verify donor name clickable/visible

- [ ] Restore donor with sponsorships maintains associations
  - Archive donor with sponsorships
  - Restore donor
  - Navigate to Sponsorships page
  - Verify sponsorships still active
  - Navigate to Children page
  - Verify child sponsor shows restored donor

- [ ] Search excludes archived donors by default
  - Create 3 donors: "Alice Active", "Bob Active", "Carol Archived"
  - Archive Carol
  - Search for "Active"
  - Verify only Alice and Bob visible
  - Search for "Carol"
  - Verify no results (archived hidden)
  - Toggle "Show Archived"
  - Search for "Carol"
  - Verify Carol appears

- [ ] Search includes archived when toggle enabled
  - Create archived donor
  - Enable "Show Archived"
  - Search for archived donor name
  - Verify donor appears in results with archived indicator

- [ ] Cannot permanently delete donor with donations (UI)
  - If UI exposes hard delete option (admin panel?)
  - Attempt to permanently delete donor with donations
  - Verify error message or disabled button
  - **Note:** May not be applicable if hard delete only via API

- [ ] Cannot permanently delete donor with sponsorships (UI)
  - Similar to above for sponsorships

#### Cascade Delete Protection (API Level - Optional)

- [ ] API returns 422 when attempting hard delete with donations
  - Create donor with donations via API
  - Attempt `DELETE /api/donors/:id?permanent=true` (if endpoint exists)
  - Verify 422 Unprocessable Entity response
  - Verify error message explains restriction

### Technical Approach

#### Update Existing Test File
```typescript
// cypress/e2e/donor-archive.cy.ts (EXTEND existing file)

describe('Donor Archive and Restore', () => {
  beforeEach(() => {
    cy.request('DELETE', 'http://localhost:3001/api/test/cleanup');
    cy.visit('/donors');
  });

  // ... existing tests ...

  describe('Archive with Associated Data', () => {
    it('preserves donations when archiving donor', () => {
      // Create donor
      cy.get('input[type="text"]').first().type('John Donor');
      cy.get('input[type="email"]').type('john@example.com');
      cy.contains('button', /submit/i).click();
      cy.contains(/donor (created|updated) successfully/i, { timeout: 5000 });

      // Create donation via API (faster)
      cy.request('POST', 'http://localhost:3001/api/donations', {
        donation: {
          donor_id: 1, // Assuming first donor
          amount: 10000,
          date: '2024-01-01'
        }
      });

      // Archive donor
      cy.get('[aria-label="archive"]').first().click();
      cy.contains('John Donor').should('have.css', 'opacity', '0.5');

      // Navigate to donations page
      cy.visit('/donations');

      // Verify donation exists with donor name
      cy.contains('John Donor').should('be.visible');
      cy.contains('$100.00').should('be.visible');
    });

    it('preserves sponsorships when archiving donor', () => {
      // Create donor, child, and sponsorship
      cy.request('POST', 'http://localhost:3001/api/donors', {
        donor: { name: 'Jane Sponsor', email: 'jane@example.com' }
      });
      cy.request('POST', 'http://localhost:3001/api/children', {
        child: { name: 'Maria Child' }
      });
      cy.request('POST', 'http://localhost:3001/api/sponsorships', {
        sponsorship: { donor_id: 1, child_id: 1, monthly_amount: 5000 }
      });

      // Archive donor
      cy.visit('/donors');
      cy.get('[aria-label="archive"]').first().click();

      // Navigate to sponsorships page
      cy.visit('/sponsorships');

      // Verify sponsorship exists
      cy.contains('Jane Sponsor').should('be.visible');
      cy.contains('Maria Child').should('be.visible');

      // Navigate to children page
      cy.visit('/children');
      cy.contains('Maria Child').parent().should('contain', 'Jane Sponsor');
    });

    it('maintains donation links after restore', () => {
      // Setup: archived donor with donation
      cy.request('POST', 'http://localhost:3001/api/donors', {
        donor: { name: 'Restore Test', email: 'restore@example.com' }
      });
      cy.request('POST', 'http://localhost:3001/api/donations', {
        donation: { donor_id: 1, amount: 5000, date: '2024-01-01' }
      });
      cy.request('DELETE', 'http://localhost:3001/api/donors/1'); // Soft delete

      // Restore donor
      cy.visit('/donors');
      cy.contains('label', /show archived/i).click(); // Enable toggle
      cy.get('[aria-label="restore"]').first().click();

      // Navigate to donations
      cy.visit('/donations');
      cy.contains('Restore Test').should('be.visible');
      cy.contains('$50.00').should('be.visible');
    });
  });

  describe('Search with Archive State', () => {
    it('excludes archived donors from search by default', () => {
      // Create active and archived donors
      cy.request('POST', 'http://localhost:3001/api/donors', {
        donor: { name: 'Active Alice', email: 'alice@example.com' }
      });
      cy.request('POST', 'http://localhost:3001/api/donors', {
        donor: { name: 'Archived Bob', email: 'bob@example.com' }
      });
      cy.request('DELETE', 'http://localhost:3001/api/donors/2'); // Archive Bob

      cy.visit('/donors');

      // Search for "Bob"
      cy.get('input[placeholder*="Search"]').type('Bob');
      cy.wait(500); // Debounce

      // Should not find Bob (archived)
      cy.contains('Archived Bob').should('not.exist');
    });

    it('includes archived donors in search when toggle enabled', () => {
      // Setup: archived donor
      cy.request('POST', 'http://localhost:3001/api/donors', {
        donor: { name: 'Carol Archived', email: 'carol@example.com' }
      });
      cy.request('DELETE', 'http://localhost:3001/api/donors/1'); // Archive

      cy.visit('/donors');

      // Enable show archived
      cy.contains('label', /show archived/i).click();

      // Search for archived donor
      cy.get('input[placeholder*="Search"]').type('Carol');
      cy.wait(500);

      // Should find Carol
      cy.contains('Carol Archived').should('be.visible');
      cy.contains('Carol Archived').should('have.css', 'opacity', '0.5');
    });
  });
});
```

### Implementation Notes

**Test Organization:**
- Extend existing `donor-archive.cy.ts` file (don't create new file)
- Add new `describe` blocks for "Archive with Associated Data" and "Search with Archive State"
- Keep existing tests intact

**Performance:**
- Use API calls for donor/donation/sponsorship creation (faster than UI)
- Only use UI for testing user-facing behavior (archive/restore buttons)
- Clean database before each test for isolation

**Edge Cases:**
- Verify archived donor names still appear in donations list (not "Deleted Donor")
- Verify archived state persists across page navigations
- Test search debounce timing (300ms standard)

**Hard Delete Testing:**
- Check if frontend exposes hard delete UI (may not exist)
- If only accessible via API, consider API-level test in RSpec instead
- Document if hard delete testing is deferred to backend

### Files to Update
- `donation_tracker_frontend/cypress/e2e/donor-archive.cy.ts` (EXTEND - add ~150 lines)

### Estimated Time
- Test writing: 1.5 hours
- Debugging/refinement: 30 minutes
- Total: ~2 hours

### Success Criteria
- [ ] 6-8 new E2E tests added to existing file
- [ ] All tests validate data preservation during archive/restore
- [ ] Search filtering respects archived state toggle
- [ ] Tests follow existing Cypress conventions
- [ ] Total test file < 250 lines (maintainable size)
- [ ] No flaky tests (deterministic, proper waits)

### Related Tickets
- TICKET-001: Donor Soft Delete with Archive/Restore ✅ (base feature)
- TICKET-062: Donor Cascade Delete Strategy ✅ (data protection)
- TICKET-005: Auto-reassign Donations After Merge (related workflow)

### Notes
- **Low Priority**: Basic archive/restore already tested; this extends coverage for edge cases
- **Data Integrity**: Critical to verify donations/sponsorships preserved during archive
- **Regression Protection**: Ensures TICKET-062 cascade delete logic works end-to-end
- **Search Integration**: Validates complex interaction between search and archive state

### Test Execution Commands
```bash
# Run donor archive tests
docker-compose exec frontend npm run cypress:run -- --spec "cypress/e2e/donor-archive.cy.ts"

# Run all donor-related tests
docker-compose exec frontend npm run cypress:run -- --spec "cypress/e2e/donor-*.cy.ts"

# Open Cypress UI for debugging
docker-compose exec frontend npm run cypress:open
```

### Definition of Done
- [ ] 6-8 new E2E tests added to donor-archive.cy.ts
- [ ] Data preservation validated (donations, sponsorships)
- [ ] Search + archive state integration tested
- [ ] All tests passing in CI environment
- [ ] Test execution time < 2 minutes
- [ ] No console errors during test runs
- [ ] Tests added to pre-commit hook validation
- [ ] DonationTracking.md updated with extended test coverage
