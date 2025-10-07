## [TICKET-005] Auto-Reassign Donations After Donor Merge

**Status:** ⏸️ Blocked
**Priority:** 🟡 Medium
**Dependencies:** TICKET-004 (donor merge), Donation model must exist

### User Story
As an admin, after merging donors, I want their donations automatically reassigned to the merged donor so that donation history is preserved and I have accurate giving records.

### Acceptance Criteria
- [ ] Backend: Extend DonorMergeService to reassign donations
- [ ] Backend: All donations from source donors reassigned to target/merged donor
- [ ] Backend: Preserve all donation data (amount, date, payment info)
- [ ] Backend: Soft delete source donors after successful reassignment
- [ ] Backend: PaperTrail audit trail shows merge happened
- [ ] Backend: Database transaction ensures atomicity (rollback on failure)
- [ ] Backend: Return count of reassigned donations in merge response
- [ ] Frontend: Show donation count in merge preview
- [ ] Frontend: Display success message with reassignment count
- [ ] RSpec tests for donation reassignment logic
- [ ] Cypress E2E test validates donations moved correctly

### Technical Notes
- **TDD approach**: Red-Green-Refactor cycle followed for all tests
- **Prerequisite**: Donation model with `donor_id` foreign key must exist
- **Merge flow**:
  1. Create/update merged donor record
  2. Update all `donations.donor_id` WHERE donor_id IN (source_donor_ids) SET donor_id = merged_donor_id
  3. Soft delete source donors (set merged_into_id = merged_donor_id)
  4. Return merged donor + donation_count
- **Transaction safety**: Wrap entire operation in `ActiveRecord::Base.transaction`
- **PaperTrail**: Automatically tracks donor updates and soft deletes
- **Edge cases**: Handle donors with no donations (still allow merge)
- **Performance**: Consider batch updates for large donation counts

### Files Changed
- Backend: `app/services/donor_merge_service.rb` (extend)
- Backend: `app/models/donor.rb` (add merged_into_id column if needed)
- Backend: `db/migrate/..._add_merged_into_to_donors.rb` (new migration)
- Backend: `spec/services/donor_merge_service_spec.rb` (update)
- Frontend: `src/components/DonorMergeModal.tsx` (show donation counts)
- Frontend: `cypress/e2e/donor-merge.cy.ts` (update)

### Related Commits
- (To be added during commit)
