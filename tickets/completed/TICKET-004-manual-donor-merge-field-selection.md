## [TICKET-004] Manual Donor Merge with Field Selection

**Status:** ✅ Complete
**Priority:** 🟡 Medium
**Completed:** 2025-10-15
**Dependencies:** None

### User Story
As an admin, I want to merge duplicate donors by selecting which details to keep from each so that I have a single accurate donor record.

### Acceptance Criteria
- [x] Frontend: Multi-select donors from list (checkboxes in DonorList)
- [x] Frontend: "Merge Selected" button appears when 2+ donors selected
- [x] Frontend: Merge modal shows side-by-side comparison of selected donors
- [x] Frontend: Radio buttons to choose which value to keep for each field (name, email)
- [x] Frontend: Preview of merged donor before confirming
- [x] Backend: POST /api/donors/merge endpoint
- [x] Backend: DonorMergeService handles merge logic
- [x] Backend: Returns merged donor with 200 OK
- [x] RSpec tests for merge service and endpoint
- [x] Jest tests for merge modal component
- [x] Cypress E2E test for complete merge workflow

### Technical Notes
- **TDD approach**: Red-Green-Refactor cycle followed for all tests
- **Backend**: DonorMergeService.merge(donor_ids:, field_selections:)
- **Field selections format**: `{ name: donor_id_to_keep, email: donor_id_to_keep }`
- **Merge logic**: Create new donor with selected fields, or update one existing donor
- **Source donors**: Mark as merged (add `merged_into_id` field?) or soft delete
- **Validation**: Ensure at least 2 donors provided, all donors exist
- **Transaction**: Wrap merge in database transaction for atomicity
- **Out of scope for this ticket**: Donation reassignment (see TICKET-005)

### Files Changed
**Backend:**
- `db/migrate/20251008085418_add_merged_into_id_to_donors.rb` (new - adds merged_into_id column)
- `app/models/donor.rb` (updated email uniqueness validation to exclude discarded)
- `app/services/donor_merge_service.rb` (new - transaction-safe merge logic)
- `app/controllers/api/donors_controller.rb` (added merge action)
- `config/routes.rb` (added POST /api/donors/merge route)
- `spec/services/donor_merge_service_spec.rb` (new - 6 tests)
- `spec/requests/donors_spec.rb` (added merge endpoint test + merged donor filtering test)

**Frontend:**
- `src/api/client.ts` (added mergeDonors method)
- `src/components/DonorList.tsx` (added checkboxes with selection state)
- `src/components/DonorList.test.tsx` (added 2 tests for checkboxes and selection)
- `src/components/DonorMergeModal.tsx` (new - modal with radio button field selection)
- `src/components/DonorMergeModal.test.tsx` (new - 2 tests)
- `src/App.tsx` (integrated selection state, merge button, and modal)
- `cypress/e2e/donor-merge.cy.ts` (new - E2E workflow test)

### Related Commits
- Implementation completed 2025-10-15 via TDD workflow
- All tests passing: 90 total (49 backend RSpec, 34 frontend Jest, 7 Cypress E2E)
