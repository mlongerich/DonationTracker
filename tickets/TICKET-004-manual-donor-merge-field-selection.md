## [TICKET-004] Manual Donor Merge with Field Selection

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Dependencies:** None

### User Story
As an admin, I want to merge duplicate donors by selecting which details to keep from each so that I have a single accurate donor record.

### Acceptance Criteria
- [ ] Frontend: Multi-select donors from list (checkboxes in DonorList)
- [ ] Frontend: "Merge Selected" button appears when 2+ donors selected
- [ ] Frontend: Merge modal shows side-by-side comparison of selected donors
- [ ] Frontend: Radio buttons to choose which value to keep for each field (name, email)
- [ ] Frontend: Preview of merged donor before confirming
- [ ] Backend: POST /api/donors/merge endpoint
- [ ] Backend: DonorMergeService handles merge logic
- [ ] Backend: Returns merged donor with 200 OK
- [ ] RSpec tests for merge service and endpoint
- [ ] Jest tests for merge modal component
- [ ] Cypress E2E test for complete merge workflow

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
- Backend: `app/services/donor_merge_service.rb` (new)
- Backend: `app/controllers/api/donors_controller.rb` (add merge action)
- Backend: `config/routes.rb` (add merge route)
- Backend: `spec/services/donor_merge_service_spec.rb` (new)
- Backend: `spec/requests/donor_merge_spec.rb` (new)
- Frontend: `src/components/DonorList.tsx` (add checkboxes, merge button)
- Frontend: `src/components/DonorMergeModal.tsx` (new)
- Frontend: `src/api/client.ts` (add mergeDonors method)
- Frontend: `src/components/DonorMergeModal.test.tsx` (new)
- Frontend: `cypress/e2e/donor-merge.cy.ts` (new)

### Related Commits
- (To be added during commit)
