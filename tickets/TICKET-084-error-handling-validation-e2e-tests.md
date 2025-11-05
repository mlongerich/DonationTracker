## [TICKET-084] Error Handling & Form Validation E2E Tests

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Effort:** M (Medium - 2-3 hours)
**Created:** 2025-11-05
**Dependencies:** TICKET-068 (Global error handling) ✅

### User Story
As a developer, I want comprehensive E2E tests for error handling and form validation so that I can ensure users receive clear feedback when errors occur and validation prevents invalid data submission.

### Problem Statement
**Current State:**
- No E2E tests covering:
  - Form validation errors (required fields, format validation, date validation)
  - API error responses (404, 422, 500)
  - Network failures (timeouts, connection errors)
  - User-friendly error messages display
  - Error recovery workflows (user can correct and retry)

**Gap Analysis:**
- ✅ TICKET-068: Global error handling implemented in ApplicationController
- ✅ Backend returns consistent error formats
- ✅ Frontend shows error notifications (Material-UI Snackbar/Alerts)
- ❌ No E2E validation of error handling end-to-end
- ❌ High UX risk: Poor error handling confuses users

### Acceptance Criteria

#### Form Validation Tests

- [ ] Required field validation - Donor form
  - Navigate to Donors page
  - Click submit without entering name
  - Verify error message: "Name is required" (or similar)
  - Verify form does not submit
  - Enter name → submit
  - Verify successful submission

- [ ] Email format validation - Donor form
  - Enter invalid email format (e.g., "notanemail")
  - Attempt submit
  - Verify error message: "Invalid email format"
  - Correct email → submit successfully

- [ ] Amount validation - Donation form
  - Enter negative amount
  - Verify error or input rejected
  - Enter zero
  - Verify error: "Amount must be greater than zero"
  - Enter valid amount → submit successfully

- [ ] Date validation - Donation form
  - Leave date blank (if required)
  - Verify error message
  - Enter future date (if not allowed)
  - Verify error or warning
  - Enter valid date → submit successfully

- [ ] Date range validation - Donation filtering
  - Set end date before start date
  - Verify error message: "End date must be after start date"
  - Verify error indicator on date fields
  - Correct dates → filter applies successfully

- [ ] Unique constraint validation - Donor email
  - Create donor with email "duplicate@example.com"
  - Attempt to create second donor with same email
  - Verify error message: "Email already exists" (422 from backend)
  - Change email → submit successfully

#### API Error Handling Tests

- [ ] 404 Not Found error
  - Create donor
  - Delete donor via API
  - Attempt to edit deleted donor via frontend
  - Verify error message: "Donor not found" (user-friendly)
  - Verify user redirected or returned to list

- [ ] 422 Unprocessable Entity error - Cascade delete
  - Create project with donation
  - Attempt to delete project (should be blocked)
  - Verify error message explains why (has donations)
  - Verify project NOT deleted

- [ ] 500 Server Error (simulated)
  - Use `cy.intercept()` to simulate 500 error on API call
  - Attempt to create donation
  - Verify error message: "Something went wrong" (generic)
  - Verify form state preserved (user can retry)

- [ ] 400 Bad Request error
  - Send malformed data via intercepted request
  - Verify error message displayed
  - Verify user can correct and retry

#### Network Failure Tests

- [ ] Timeout error
  - Use `cy.intercept()` to delay API response indefinitely
  - Attempt to create entity
  - Verify loading indicator appears
  - After timeout, verify error message
  - Verify user can retry

- [ ] Network disconnection (simulated)
  - Use `cy.intercept()` to simulate network failure
  - Attempt to fetch data
  - Verify error message: "Network error" or "Unable to connect"
  - Verify graceful degradation (no crash)

#### Error Recovery Tests

- [ ] User can correct validation error and resubmit
  - Submit form with invalid data
  - Receive validation error
  - Correct data
  - Resubmit successfully
  - Verify error message clears

- [ ] User can retry after API error
  - Simulate API error on first attempt
  - Verify error message
  - Remove intercept (allow success)
  - User clicks retry or resubmits
  - Verify successful submission

- [ ] Form state preserved after error
  - Fill out long form (e.g., donation with all fields)
  - Simulate API error
  - Verify all form fields still populated
  - User can correct error and resubmit without re-entering data

### Technical Approach

#### Test File Structure
```typescript
// cypress/e2e/error-handling.cy.ts
describe('Error Handling & Validation', () => {
  beforeEach(() => {
    cy.request('DELETE', 'http://localhost:3001/api/test/cleanup');
  });

  describe('Form Validation', () => {
    it('validates required fields on donor form');
    it('validates email format');
    it('validates donation amount');
    it('validates date fields');
    it('validates date range (end after start)');
    it('validates unique constraints (email)');
  });

  describe('API Error Responses', () => {
    it('handles 404 Not Found gracefully');
    it('handles 422 Unprocessable Entity (cascade delete)');
    it('handles 500 Server Error');
    it('handles 400 Bad Request');
  });

  describe('Network Failures', () => {
    it('handles timeout errors');
    it('handles network disconnection');
  });

  describe('Error Recovery', () => {
    it('allows user to correct validation error and resubmit');
    it('allows user to retry after API error');
    it('preserves form state after error');
  });
});
```

#### Key Testing Patterns

**1. Form Validation Pattern:**
```typescript
it('validates required fields on donor form', () => {
  cy.visit('/donors');

  // Attempt submit without required field
  cy.contains('button', /submit/i).click();

  // Verify error message appears
  cy.contains(/name is required/i).should('be.visible');

  // Verify form not submitted (still on same page)
  cy.url().should('include', '/donors');

  // Enter required field
  cy.get('input[type="text"]').first().type('Valid Donor');
  cy.get('input[type="email"]').type('valid@example.com');

  // Submit successfully
  cy.contains('button', /submit/i).click();
  cy.contains(/donor (created|updated) successfully/i, { timeout: 5000 });
});
```

**2. API Error Simulation Pattern:**
```typescript
it('handles 422 Unprocessable Entity (cascade delete)', () => {
  // Create project with donation
  cy.request('POST', 'http://localhost:3001/api/projects', {
    project: { title: 'Test Project', project_type: 'general' }
  });
  cy.request('POST', 'http://localhost:3001/api/donors', {
    donor: { name: 'Test Donor', email: 'test@example.com' }
  });
  cy.request('POST', 'http://localhost:3001/api/donations', {
    donation: { donor_id: 1, project_id: 1, amount: 10000, date: '2024-01-01' }
  });

  // Attempt to delete project
  cy.visit('/projects');
  cy.contains('Test Project').parent().find('[aria-label="delete"]').click();

  // If confirmation dialog exists
  cy.contains('button', /confirm|yes|delete/i).click();

  // Verify error message
  cy.contains(/cannot delete.*donations/i, { timeout: 5000 }).should('be.visible');

  // Verify project still exists
  cy.contains('Test Project').should('be.visible');
});
```

**3. Error Simulation with Intercept:**
```typescript
it('handles 500 Server Error', () => {
  cy.visit('/donors');

  // Intercept API call and return 500 error
  cy.intercept('POST', '/api/donors', {
    statusCode: 500,
    body: { error: 'Internal server error' }
  }).as('createDonor');

  // Fill form
  cy.get('input[type="text"]').first().type('Test Donor');
  cy.get('input[type="email"]').type('test@example.com');

  // Submit
  cy.contains('button', /submit/i).click();

  // Wait for API call
  cy.wait('@createDonor');

  // Verify error message displayed
  cy.contains(/something went wrong|error|failed/i, { timeout: 5000 }).should('be.visible');

  // Verify form state preserved
  cy.get('input[type="text"]').first().should('have.value', 'Test Donor');
  cy.get('input[type="email"]').should('have.value', 'test@example.com');
});
```

**4. Date Range Validation Pattern:**
```typescript
it('validates date range (end before start)', () => {
  cy.visit('/donations');

  // Set invalid date range in filter section
  cy.contains('h2', 'Recent Donations').parent().within(() => {
    // Start date: December 1, 2024
    cy.find('[role="spinbutton"][aria-label="Month"]').first().type('12');
    cy.find('[role="spinbutton"][aria-label="Day"]').first().type('01');
    cy.find('[role="spinbutton"][aria-label="Year"]').first().type('2024');

    // End date: January 1, 2024 (before start)
    cy.find('[role="spinbutton"][aria-label="Month"]').eq(1).type('01');
    cy.find('[role="spinbutton"][aria-label="Day"]').eq(1).type('01');
    cy.find('[role="spinbutton"][aria-label="Year"]').eq(1).type('2024');
  });

  // Verify error message
  cy.contains(/end date must be after.*start date/i).should('be.visible');

  // Verify error indicator (aria-invalid)
  cy.get('[role="group"][aria-invalid="true"]').should('exist');
});
```

**5. Error Recovery Pattern:**
```typescript
it('allows user to correct validation error and resubmit', () => {
  cy.visit('/donors');

  // Submit with invalid email
  cy.get('input[type="text"]').first().type('Recovery Test');
  cy.get('input[type="email"]').type('invalid-email');
  cy.contains('button', /submit/i).click();

  // Verify error
  cy.contains(/invalid email/i).should('be.visible');

  // Correct email
  cy.get('input[type="email"]').clear().type('valid@example.com');

  // Resubmit
  cy.contains('button', /submit/i).click();

  // Verify success
  cy.contains(/donor (created|updated) successfully/i, { timeout: 5000 });

  // Verify error message cleared
  cy.contains(/invalid email/i).should('not.exist');
});
```

### Implementation Notes

**Error Message Locations:**
- Material-UI Snackbar (top-right corner)
- Inline form errors (below input fields)
- Alert components (top of form or page)
- Check actual implementation for selector targets

**Error Response Format (TICKET-068):**
```json
// 404, 400: { "error": "message" }
// 422: { "errors": ["message1", "message2"] }
```

**Validation Sources:**
- Frontend validation (immediate feedback)
- Backend validation (authoritative)
- Both should be tested

**Intercept Patterns:**
- Use `cy.intercept()` for API error simulation
- Use `.as('aliasName')` for wait verification
- Remove intercept after test (automatic with beforeEach cleanup)

### Files to Create
- `donation_tracker_frontend/cypress/e2e/error-handling.cy.ts` (NEW - ~300-350 lines)

### Estimated Time
- Test writing: 2.5 hours
- Debugging/refinement: 1 hour
- Total: ~3.5 hours

### Success Criteria
- [ ] 15+ E2E tests covering validation and errors
- [ ] All error types tested (404, 422, 500, network)
- [ ] User-friendly error messages validated
- [ ] Error recovery workflows tested
- [ ] All tests passing in CI environment
- [ ] Test execution time < 3 minutes
- [ ] No flaky tests

### Related Tickets
- TICKET-068: Global Error Handling (ApplicationController) ✅
- TICKET-067: Standardize Presenter Responses ✅ (consistent error format)
- TICKET-078: Fix Donation Filter Race Condition ✅ (date validation example)

### Notes
- **Medium Priority**: Error handling is critical for UX but backend has unit test coverage
- **User Experience**: Clear error messages prevent user frustration
- **Regression Protection**: Ensures TICKET-068 global error handling works end-to-end
- **Edge Cases**: Focus on common error scenarios users will encounter

### Test Execution Commands
```bash
# Run error handling tests
docker-compose exec frontend npm run cypress:run -- --spec "cypress/e2e/error-handling.cy.ts"

# Open Cypress UI for debugging
docker-compose exec frontend npm run cypress:open
```

### Definition of Done
- [ ] 15+ E2E tests written covering validation and error handling
- [ ] All error response codes tested (404, 422, 500, 400)
- [ ] Network failure scenarios tested
- [ ] Error recovery workflows validated
- [ ] All tests passing in CI environment
- [ ] Test execution time < 3 minutes
- [ ] No console errors during test runs
- [ ] Tests added to pre-commit hook validation
- [ ] DonationTracking.md updated with error handling test coverage
