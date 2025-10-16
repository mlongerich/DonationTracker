## [TICKET-020] Consistent Material-UI Styling for DonationForm

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Started:** 2025-10-15
**Dependencies:** TICKET-006 (DonationForm exists)

### User Story
As a user, I want the donation form to have the same professional styling as the donor form so that the application has a consistent look and feel.

### Acceptance Criteria
- [ ] Replace plain HTML inputs with Material-UI `TextField` components
- [ ] Use Material-UI `Button` component with proper variants
- [ ] Use `Stack` component for layout spacing
- [ ] Use `Alert` component for success/error messages
- [ ] Match DonorForm visual style and spacing
- [ ] Maintain form validation and submission logic
- [ ] Mobile-responsive layout
- [ ] Accessible form labels and ARIA attributes
- [ ] Jest tests still pass after styling changes
- [ ] Cypress E2E tests verify visual consistency

### Technical Notes
- **Material-UI Components**: TextField, Button, Stack, Alert
- **Consistency**: Match spacing and styling from DonorForm.tsx
- **Type Safety**: Maintain TypeScript types for form props
- **Validation**: Keep existing validation behavior
- **Theme**: Use existing Material-UI theme from App.tsx

### Before/After Example
```typescript
// Before (plain HTML)
<input id="amount" type="number" step="0.01" />
<button type="submit">Create Donation</button>

// After (Material-UI)
<TextField
  label="Amount"
  type="number"
  inputProps={{ step: 0.01 }}
  fullWidth
/>
<Button type="submit" variant="contained" color="primary" fullWidth>
  Create Donation
</Button>
```

### Files Changed
- `donation_tracker_frontend/src/components/DonationForm.tsx` (update to Material-UI)
- `donation_tracker_frontend/src/components/DonationForm.test.tsx` (update selectors)
- `donation_tracker_frontend/cypress/e2e/donation-entry.cy.ts` (update selectors)

### Related Commits
- (To be added during implementation)
