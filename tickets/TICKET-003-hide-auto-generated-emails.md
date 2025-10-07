## [TICKET-003] Hide Auto-Generated Emails in Donor Display

**Status:** ✅ Complete
**Priority:** 🟢 Low
**Started:** 2025-10-07
**Completed:** 2025-10-07

### User Story
As a user, I want auto-generated @mailinator.com emails to be hidden in the donor list view so that I only see real email addresses, while still being able to see and edit them in the form.

### Acceptance Criteria
- [x] Frontend: Hide email when it ends with "@mailinator.com" in DonorList display
- [x] Frontend: Show donor name even when email is hidden
- [x] Frontend: Show all emails (including @mailinator) in DonorForm edit view
- [x] Frontend: Visual indicator for hidden emails (show "No email provided" or leave blank)
- [x] Jest tests for email display helper function (3 tests passing)
- [x] Cypress E2E test validating hidden emails in list view

### Technical Notes
- Created utility function: `shouldDisplayEmail(email)` - returns false if email ends with "@mailinator.com" (case-insensitive)
- Updated DonorList component to conditionally render email based on helper
- DonorForm component unchanged (already shows all fields for editing)
- Shows placeholder text "(No email provided)" when email is hidden
- **Backend unchanged**: This is purely frontend display logic
- **Email generation unchanged**: Backend still generates @mailinator.com for blank emails
- **TDD approach**: Red-Green-Refactor cycle followed for all tests
- **Jest tests**: 3 emailUtils tests + 3 DonorList tests = 36 total tests passing
- **Cypress test**: Ready to run with `npm run cypress:run` (requires server running)

### Files Changed
- Frontend: `src/utils/emailUtils.ts` (new utility function)
- Frontend: `src/utils/emailUtils.test.ts` (new Jest tests - 3 tests)
- Frontend: `src/components/DonorList.tsx` (conditional email display)
- Frontend: `src/components/DonorList.test.tsx` (added 3 new tests)
- Frontend: `cypress/e2e/donor-display.cy.ts` (E2E validation)

### Related Commits
- `a02bfda`: frontend: hide auto-generated @mailinator.com emails in donor list
