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
- `1d2a43e`: backend: add Stripe CSV donor import with case-insensitive email lookup
