## [TICKET-001] Donor Soft Delete with Archive/Restore

**Status:** ✅ Complete
**Priority:** 🟡 Medium
**Started:** 2025-10-07
**Completed:** 2025-10-07

### User Story
As an admin, I want to archive donors instead of permanently deleting them so that I can restore them if needed and maintain historical records.

### Acceptance Criteria
- [x] DELETE endpoint soft deletes (sets discarded_at timestamp)
- [x] GET endpoint excludes archived donors by default
- [x] GET endpoint includes archived when `include_discarded=true`
- [x] POST restore endpoint to unarchive donors
- [x] UI toggle to show/hide archived donors
- [x] Visual indicators for archived state (opacity, chip)
- [x] Archive/Restore buttons in UI
- [x] Search respects archived toggle state

### Technical Notes
- Used Discard gem for soft delete functionality
- Ransack includes discarded_at in searchable attributes
- Frontend uses MUI Tooltip for accessibility
- Separate DELETE /all endpoint for test cleanup (hard delete)

### Files Changed
- Backend: `donors_controller.rb`, `donor.rb`, routes, migration
- Frontend: `App.tsx`, `DonorList.tsx`, `donor-archive.cy.ts`

### Related Commits
- `da26726`: backend: add soft delete with discard gem and restore endpoint
- `d8cce67`: frontend: add donor archive/restore with accessibility tooltips
