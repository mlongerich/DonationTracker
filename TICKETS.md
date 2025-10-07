# Active Tickets

Current work items and user stories being actively developed.

---

## Template for New Tickets

```markdown
## [TICKET-ID] Ticket Title

**Status:** 🔵 In Progress | ⏸️ Paused | ✅ Complete
**Priority:** 🔴 High | 🟡 Medium | 🟢 Low
**Started:** YYYY-MM-DD
**Completed:** YYYY-MM-DD (if done)

### User Story
As a [user type], I want [goal] so that [benefit].

### Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

### Technical Notes
- Implementation details
- Dependencies
- Breaking changes

### Files Changed
- `path/to/file.rb`
- `path/to/file.tsx`

### Related Commits
- `commit-hash`: Description
```

---

## Example: Completed Ticket

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

---

## [TICKET-002] Stripe CSV Donor Import via CLI (Iteration 1)

**Status:** ✅ Complete
**Priority:** 🟡 Medium
**Started:** 2025-10-07
**Completed:** 2025-10-07

### User Story
As an admin, I want to import donors from Stripe payment export CSV via CLI so that I can migrate existing donor data without manual entry.

### Acceptance Criteria
- [x] Backend: CSV parsing with validation (follows Donor model defaults)
- [x] Backend: Duplicate detection using DonorService.find_or_update_by_email
- [x] Backend: Import summary report (created, updated, failed with reasons)
- [x] Backend: Rake task `rake donors:import[path/to/file.csv]`
- [x] Backend: Parse Stripe CSV format (headers: "Billing Details Name", "Cust Email")
- [x] RSpec tests updated for Stripe format (11 passing tests)
- [x] Rake task outputs clear success/error summary
- [x] Validated with real Stripe export file (1445 rows, 0 failures)

### Technical Notes
- Uses Ruby CSV library (added csv gem for Ruby 3.4+ compatibility)
- Reuses DonorService.find_or_update_by_email for duplicate handling
- Validation: Follows Donor model rules (blank name → "Anonymous", blank email → generated from name)
- Error handling: Catches ActiveRecord validation errors, continues processing, reports all errors
- CLI output: Shows created/updated/failed counts and detailed error messages with row numbers
- **Stripe CSV Format**: Headers "Billing Details Name" and "Cust Email", columns 3+ ignored (payment data)
- **Format Detection**: Auto-detects Stripe headers, legacy "name/email" headers, or no-header format
- **Case-Insensitive**: Email lookups are case-insensitive to handle varying capitalizations
- **Bug Fix**: Fixed DonorService to use case-insensitive email lookup (LOWER comparison)
- **Out of scope for iteration 1**: Frontend UI, donation data extraction, donor-donation linking
- **Future**: Extract donation amounts/dates, admin panel UI

### Files Changed
- Backend: `app/services/donor_import_service.rb` (Stripe header detection & mapping)
- Backend: `app/services/donor_service.rb` (case-insensitive email lookup)
- Backend: `lib/tasks/donors.rake` (no changes)
- Backend: `spec/services/donor_import_service_spec.rb` (11 tests including case-insensitive)
- Backend: `Gemfile` (added csv gem)

### Related Commits
- (To be added during commit)

---
