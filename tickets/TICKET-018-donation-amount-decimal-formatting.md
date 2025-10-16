## [TICKET-018] Fix Donation Amount Decimal Formatting

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Started:** 2025-10-15
**Dependencies:** TICKET-007 (DonationList exists)

### User Story
As a user, I want to see donation amounts formatted with two decimal places so that all dollar amounts are consistently displayed (e.g., $25.00 instead of $25).

### Acceptance Criteria
- [ ] DonationList shows amounts as `$25.00` format
- [ ] All donation displays use `.toFixed(2)` for currency
- [ ] Handle edge cases (null, undefined, very large numbers)
- [ ] Consistent formatting across all views
- [ ] Jest tests verify formatting logic
- [ ] Cypress E2E tests verify visual display

### Technical Notes
- **Implementation**: Use `parseFloat(amount).toFixed(2)` or currency formatting library
- **Consistency**: Apply same format everywhere donations are displayed
- **Future**: Consider internationalization (i18n) for currency symbols
- **Backend**: Amount stored as decimal in database, no changes needed

### Example
```typescript
// Before
${donation.amount}  // Shows "$25"

// After
${parseFloat(donation.amount).toFixed(2)}  // Shows "$25.00"
```

### Files Changed
- `donation_tracker_frontend/src/components/DonationList.tsx` (update display format)
- `donation_tracker_frontend/src/components/DonationList.test.tsx` (add formatting tests)
- `donation_tracker_frontend/cypress/e2e/donation-entry.cy.ts` (verify formatting)

### Related Commits
- (To be added during implementation)
