## [TICKET-125] Accessibility E2E Tests

**Status:** 📋 Planned (POST-MVP)
**Priority:** 🟢 Low
**Effort:** M (Medium - 2-3 hours)
**Created:** 2025-11-18
**Dependencies:** None

### User Story
As a QA engineer, I want E2E tests for accessibility features so that we can ensure the application is usable by keyboard-only users and compatible with screen readers (WCAG 2.1 AA compliance).

### Problem Statement
Current E2E tests do not validate accessibility features.

**Current Coverage:**
- ❌ Keyboard navigation (Tab, Enter, Escape, Arrow keys)
- ❌ Screen reader compatibility (ARIA labels, roles, live regions)
- ❌ Focus management (trap, restore, visible indicators)
- ❌ Color contrast validation
- ❌ Form error announcements

**Impact:** Potential accessibility barriers for users with disabilities

### Acceptance Criteria

#### Keyboard Navigation
- [ ] E2E test: Tab through form fields in logical order
- [ ] E2E test: Submit form with Enter key
- [ ] E2E test: Close modal with Escape key
- [ ] E2E test: Navigate list items with Arrow keys
- [ ] E2E test: Activate button with Space/Enter
- [ ] E2E test: Skip navigation links work

#### ARIA Labels & Roles
- [ ] E2E test: All form inputs have labels
- [ ] E2E test: Buttons have descriptive aria-label when text is ambiguous
- [ ] E2E test: Modals have aria-modal and aria-labelledby
- [ ] E2E test: List items have appropriate roles
- [ ] E2E test: Status messages use aria-live regions

#### Focus Management
- [ ] E2E test: Focus trapped in modal when open
- [ ] E2E test: Focus restored to trigger element when modal closes
- [ ] E2E test: Focus visible indicator present
- [ ] E2E test: Skip to main content link works

#### Form Validation
- [ ] E2E test: Required field errors announced
- [ ] E2E test: Error messages have aria-invalid and aria-describedby
- [ ] E2E test: Success messages announced

### Technical Approach

#### 1. Create `accessibility-keyboard-nav.cy.ts`

**Keyboard Navigation:**
```typescript
describe('Accessibility - Keyboard Navigation', () => {
  it('navigates donation form with Tab key', () => {
    cy.visit('/donations');

    // Start at first form field
    cy.get('body').tab();
    cy.focused().should('have.attr', 'name', 'donor');

    // Tab to next field
    cy.focused().tab();
    cy.focused().should('have.attr', 'name', 'amount');

    // Continue through all fields
    cy.focused().tab();
    cy.focused().should('have.attr', 'name', 'date');

    // Tab to submit button
    cy.focused().tab();
    cy.focused().should('contain', 'Submit');
  });

  it('submits form with Enter key', () => {
    cy.visit('/donations');

    // Fill form
    cy.get('input[name="donor"]').type('John Doe');
    cy.get('input[name="amount"]').type('100');
    cy.get('input[name="date"]').type('2024-01-15');

    // Submit with Enter
    cy.get('input[name="date"]').type('{enter}');

    // Verify submission
    cy.contains('Donation created successfully').should('be.visible');
  });

  it('closes modal with Escape key', () => {
    // Open modal (e.g., donor merge modal)
    cy.visit('/donors');
    // ... open merge modal
    cy.get('[role="dialog"]').should('be.visible');

    // Press Escape
    cy.get('body').type('{esc}');

    // Verify modal closed
    cy.get('[role="dialog"]').should('not.exist');
  });
});
```

#### 2. Create `accessibility-aria.cy.ts`

**ARIA Labels & Roles:**
```typescript
describe('Accessibility - ARIA Labels & Roles', () => {
  it('all form inputs have labels', () => {
    cy.visit('/donations');

    // Check donor input
    cy.get('input[name="donor"]').should('have.attr', 'aria-label')
      .or('have.attr', 'id').then((id) => {
        cy.get(`label[for="${id}"]`).should('exist');
      });

    // Repeat for all form fields
  });

  it('buttons have descriptive aria-labels', () => {
    cy.visit('/donors');

    // Edit button should have aria-label
    cy.get('button[aria-label*="Edit"]').should('exist');

    // Delete button should have aria-label
    cy.get('button[aria-label*="Delete"]').should('exist');
  });

  it('modals have correct ARIA attributes', () => {
    // Open modal
    cy.visit('/donors');
    // ... trigger merge modal

    // Verify modal attributes
    cy.get('[role="dialog"]').should('have.attr', 'aria-modal', 'true');
    cy.get('[role="dialog"]').should('have.attr', 'aria-labelledby');
  });

  it('status messages use aria-live regions', () => {
    cy.visit('/donations');

    // Fill and submit form
    // ...

    // Verify success message has aria-live
    cy.contains('Donation created').parent()
      .should('have.attr', 'role', 'alert')
      .or('have.attr', 'aria-live', 'polite');
  });
});
```

#### 3. Create `accessibility-focus-management.cy.ts`

**Focus Management:**
```typescript
describe('Accessibility - Focus Management', () => {
  it('focus trapped in modal', () => {
    // Open modal
    cy.visit('/donors');
    // ... open merge modal

    // Tab through modal elements
    cy.focused().tab();
    cy.focused().tab();
    cy.focused().tab();

    // Focus should stay within modal
    cy.focused().parents('[role="dialog"]').should('exist');
  });

  it('focus restored after modal closes', () => {
    cy.visit('/donors');

    // Click merge button (capture focus)
    cy.contains('button', /merge/i).click();

    // Modal opens
    cy.get('[role="dialog"]').should('be.visible');

    // Close modal
    cy.get('body').type('{esc}');

    // Focus restored to merge button
    cy.focused().should('contain', 'Merge');
  });

  it('focus visible indicator present', () => {
    cy.visit('/donors');

    // Tab to first interactive element
    cy.get('body').tab();

    // Verify focus ring visible
    cy.focused().should('have.css', 'outline-width').and('not.eq', '0px');
    // OR verify custom focus styles
  });
});
```

#### 4. Create `accessibility-form-validation.cy.ts`

**Form Validation Accessibility:**
```typescript
describe('Accessibility - Form Validation', () => {
  it('required field errors announced', () => {
    cy.visit('/donations');

    // Submit form without filling required field
    cy.get('button[type="submit"]').click();

    // Verify error message
    cy.contains(/donor is required/i).should('be.visible');

    // Verify input has aria-invalid
    cy.get('input[name="donor"]').should('have.attr', 'aria-invalid', 'true');
  });

  it('error messages have aria-describedby', () => {
    cy.visit('/donations');

    // Submit form with validation error
    cy.get('button[type="submit"]').click();

    // Verify input has aria-describedby pointing to error
    cy.get('input[name="donor"]').invoke('attr', 'aria-describedby')
      .then((describedBy) => {
        cy.get(`#${describedBy}`).should('contain', /required/i);
      });
  });

  it('success messages announced', () => {
    cy.visit('/donations');

    // Fill and submit valid form
    // ...

    // Verify success message has role="alert" or aria-live
    cy.contains(/success/i).should('have.attr', 'role', 'alert');
  });
});
```

### Tools & Plugins

**Cypress Axe (Automated Accessibility Testing):**
```bash
npm install --save-dev cypress-axe axe-core
```

**Usage:**
```typescript
import 'cypress-axe';

it('has no accessibility violations', () => {
  cy.visit('/donations');
  cy.injectAxe();
  cy.checkA11y();
});
```

**cypress-plugin-tab (Keyboard Navigation):**
```bash
npm install --save-dev cypress-plugin-tab
```

### Files to Create
- `cypress/e2e/accessibility-keyboard-nav.cy.ts` (NEW)
- `cypress/e2e/accessibility-aria.cy.ts` (NEW)
- `cypress/e2e/accessibility-focus-management.cy.ts` (NEW)
- `cypress/e2e/accessibility-form-validation.cy.ts` (NEW)

### Expected Test Count
- **Total New Tests:** ~15-20 E2E tests
- **Estimated Run Time:** ~2-3 minutes

### Testing Strategy

**Automated + Manual Testing:**
- Use `cypress-axe` for automated WCAG checks
- Write manual tests for keyboard navigation
- Test with screen reader (VoiceOver on Mac, NVDA on Windows)

**WCAG 2.1 AA Compliance Checklist:**
- ✅ Keyboard accessible
- ✅ Focus visible
- ✅ Meaningful labels
- ✅ Color contrast ≥ 4.5:1
- ✅ Error identification
- ✅ Status messages

### Benefits
- Ensures application is usable by keyboard-only users
- Validates screen reader compatibility
- Meets WCAG 2.1 AA compliance requirements
- Prevents accessibility regressions

### Related Tickets
- TICKET-025 - Standardize Form Input Sizing (includes focus states)
- TICKET-036 - React Error Boundary (error announcements)

### Notes
- This is a POST-MVP ticket (not critical for initial launch)
- Can be implemented incrementally (one test file at a time)
- Requires `cypress-axe` and `cypress-plugin-tab` plugins
- May reveal accessibility issues requiring frontend fixes
- Consider hiring accessibility consultant for audit
