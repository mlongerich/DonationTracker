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
- `1d2a43e`: backend: add Stripe CSV donor import with case-insensitive email lookup

---

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
- (To be added during commit)

---

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

---

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

---
## [TICKET-006] Simple Donation Entry (Vertical Slice 2)

**Status:** 📋 Planned
**Priority:** 🔴 High
**Dependencies:** None (Donor model exists)

### User Story
As a user, I want to record donations with amount and date linked to a donor so that I can track giving history.

### Acceptance Criteria
- [ ] Backend: Donation model with amount, date, donor_id (belongs_to :donor)
- [ ] Backend: Amount validation (must be positive number)
- [ ] Backend: Date validation (not future date)
- [ ] Backend: POST /api/donations endpoint
- [ ] Backend: GET /api/donations/:id endpoint
- [ ] Frontend: DonationForm component with amount, date, donor selection
- [ ] Frontend: Donor dropdown/autocomplete (search by name)
- [ ] Frontend: Form validation (required fields)
- [ ] Frontend: Success message after submission
- [ ] RSpec tests for Donation model and API
- [ ] Jest tests for DonationForm component
- [ ] Cypress E2E test for donation creation flow

### Technical Notes
- **TDD approach**: Red-Green-Refactor cycle followed for all tests
- **Model**: `rails g model Donation amount:decimal date:date donor:references`
- **Validations**: `validates :amount, presence: true, numericality: { greater_than: 0 }`
- **Donor dropdown**: Use existing donors from GET /api/donors
- **Future**: Add recurring, project, payment method fields later
- **Keep it simple**: Just amount, date, donor for this slice

### Files Changed
- Backend: `app/models/donation.rb` (new)
- Backend: `db/migrate/..._create_donations.rb` (new)
- Backend: `app/controllers/api/donations_controller.rb` (new)
- Backend: `config/routes.rb` (add donation routes)
- Backend: `spec/models/donation_spec.rb` (new)
- Backend: `spec/requests/donations_spec.rb` (new)
- Frontend: `src/components/DonationForm.tsx` (new)
- Frontend: `src/api/client.ts` (add createDonation method)
- Frontend: `cypress/e2e/donation-entry.cy.ts` (new)

### Related Commits
- (To be added during commit)

---

## [TICKET-007] Donation List & History View

**Status:** 📋 Planned
**Priority:** 🔴 High
**Dependencies:** TICKET-006 (Donation model)

### User Story
As a user, I want to view all donations with filtering options so that I can see giving history and patterns.

### Acceptance Criteria
- [ ] Backend: GET /api/donations with pagination (Kaminari)
- [ ] Backend: Filter by donor_id query parameter
- [ ] Backend: Filter by date range (start_date, end_date params)
- [ ] Backend: Sort by date descending (newest first)
- [ ] Backend: Include donor name in response (eager load)
- [ ] Frontend: DonationList component displaying all donations
- [ ] Frontend: Show amount, date, donor name for each donation
- [ ] Frontend: Pagination controls
- [ ] Frontend: Filter by donor dropdown
- [ ] Frontend: Date range picker for filtering
- [ ] RSpec tests for filtering and pagination
- [ ] Cypress E2E test for list view and filters

### Technical Notes
- **TDD approach**: Red-Green-Refactor cycle followed for all tests
- **Pagination**: Use Kaminari (already installed), 25 per page
- **Eager loading**: `Donation.includes(:donor)` to avoid N+1
- **Date filtering**: Use ransack or custom scopes
- **Frontend**: Material-UI DataGrid or custom table
- **Display format**: "$25.00 - 2025-01-15 - John Doe"

### Files Changed
- Backend: `app/controllers/api/donations_controller.rb` (add index)
- Backend: `spec/requests/donations_spec.rb` (update)
- Frontend: `src/components/DonationList.tsx` (new)
- Frontend: `src/api/client.ts` (add getDonations method)
- Frontend: `cypress/e2e/donation-list.cy.ts` (new)

### Related Commits
- (To be added during commit)

---

## [TICKET-008] Basic Authentication with Google OAuth

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Dependencies:** None

### User Story
As an admin, I want to log in with Google OAuth so that only authorized users can access the donation system.

### Acceptance Criteria
- [ ] Backend: Update User model with Google OAuth fields (provider, uid, token)
- [ ] Backend: Configure Devise + OmniAuth Google OAuth2
- [ ] Backend: POST /auth/google_oauth2/callback endpoint
- [ ] Backend: DELETE /auth/logout endpoint
- [ ] Backend: Authentication middleware for protected routes
- [ ] Backend: Return JWT token on successful login
- [ ] Frontend: Login page with "Sign in with Google" button
- [ ] Frontend: Auth context/provider to store user state
- [ ] Frontend: Protected routes (redirect to login if not authenticated)
- [ ] Frontend: Logout button in header
- [ ] RSpec tests for auth flows
- [ ] Cypress E2E test for login/logout flow

### Technical Notes
- **TDD approach**: Red-Green-Refactor cycle followed for all tests
- **Gems**: devise, omniauth-google-oauth2, omniauth-rails_csrf_protection, jwt (already in Gemfile)
- **OAuth setup**: Google Cloud Console credentials needed
- **JWT**: Store in localStorage, include in Authorization header
- **Protected routes**: All /api/* except /auth/* require authentication
- **Env vars**: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET

### Files Changed
- Backend: `app/models/user.rb` (update)
- Backend: `config/initializers/devise.rb` (configure OAuth)
- Backend: `app/controllers/auth_controller.rb` (new)
- Backend: `app/middleware/authenticate_request.rb` (new)
- Backend: `spec/requests/auth_spec.rb` (new)
- Frontend: `src/contexts/AuthContext.tsx` (new)
- Frontend: `src/pages/Login.tsx` (new)
- Frontend: `src/components/ProtectedRoute.tsx` (new)
- Frontend: `cypress/e2e/authentication.cy.ts` (new)

### Related Commits
- (To be added during commit)

---

## [TICKET-009] Project-Based Donations

**Status:** 📋 Planned
**Priority:** 🟢 Low
**Dependencies:** TICKET-006 (Donation model)

### User Story
As an admin, I want to assign donations to specific projects/campaigns so that I can track funding for different initiatives.

### Acceptance Criteria
- [ ] Backend: Project model (name, description, goal_amount, start_date, end_date)
- [ ] Backend: Add project_id to donations table
- [ ] Backend: Project CRUD endpoints (GET, POST, PUT, DELETE /api/projects)
- [ ] Backend: Include project info in donation responses
- [ ] Frontend: Project management page (list, create, edit)
- [ ] Frontend: Add project dropdown to DonationForm
- [ ] Frontend: Show project name in DonationList
- [ ] Frontend: Project dashboard showing total raised vs goal
- [ ] RSpec tests for Project model and API
- [ ] Cypress E2E test for project assignment

### Technical Notes
- **TDD approach**: Red-Green-Refactor cycle followed for all tests
- **Model**: `rails g model Project name:string description:text goal_amount:decimal start_date:date end_date:date`
- **Migration**: `rails g migration AddProjectToDonations project:references`
- **Optional field**: project_id nullable (not all donations need projects)
- **Calculations**: `project.donations.sum(:amount)` for total raised
- **Future**: Project progress bars, analytics

### Files Changed
- Backend: `app/models/project.rb` (new)
- Backend: `app/models/donation.rb` (add belongs_to :project)
- Backend: `db/migrate/..._create_projects.rb` (new)
- Backend: `db/migrate/..._add_project_to_donations.rb` (new)
- Backend: `app/controllers/api/projects_controller.rb` (new)
- Frontend: `src/components/ProjectForm.tsx` (new)
- Frontend: `src/components/ProjectList.tsx` (new)
- Frontend: `src/components/DonationForm.tsx` (update)

### Related Commits
- (To be added during commit)

---

## [TICKET-010] Children & Basic Sponsorship Tracking

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Dependencies:** TICKET-006 (Donation model)

### User Story
As an admin, I want to manage children profiles and link them to sponsors so that I can track sponsorship relationships.

### Acceptance Criteria
- [ ] Backend: Child model (name, age, photo_url, bio, location)
- [ ] Backend: Sponsorship model (donor_id, child_id, monthly_amount, start_date, end_date)
- [ ] Backend: Child CRUD endpoints
- [ ] Backend: Sponsorship assignment endpoints (POST, DELETE)
- [ ] Backend: GET /api/donors/:id/sponsorships (list donor's sponsored children)
- [ ] Backend: GET /api/children/:id/sponsors (list child's sponsors)
- [ ] Frontend: Child profile cards with photo and info
- [ ] Frontend: Sponsorship management interface
- [ ] Frontend: Link children to donors
- [ ] RSpec tests for models and associations
- [ ] Cypress E2E test for sponsorship workflow

### Technical Notes
- **TDD approach**: Red-Green-Refactor cycle followed for all tests
- **Models**: Child, Sponsorship (join table with additional data)
- **Many-to-many**: One child can have multiple sponsors, one donor can sponsor multiple children
- **Photo storage**: Use image_url string for now (upload later)
- **Monthly amount**: Track per-sponsorship amount
- **Status**: Add active/inactive to sponsorship
- **Future**: Automatic donation creation for sponsorships

### Files Changed
- Backend: `app/models/child.rb` (new)
- Backend: `app/models/sponsorship.rb` (new)
- Backend: `app/models/donor.rb` (add has_many :sponsorships, :children)
- Backend: `db/migrate/..._create_children.rb` (new)
- Backend: `db/migrate/..._create_sponsorships.rb` (new)
- Backend: `app/controllers/api/children_controller.rb` (new)
- Backend: `app/controllers/api/sponsorships_controller.rb` (new)
- Frontend: `src/components/ChildCard.tsx` (new)
- Frontend: `src/components/SponsorshipManager.tsx` (new)

### Related Commits
- (To be added during commit)

---

## [TICKET-011] Recurring Donation Tracking

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Dependencies:** TICKET-006 (Donation model), TICKET-008 (Background jobs need auth)

### User Story
As an admin, I want to track recurring donations and identify missed payments so that I can follow up with donors.

### Acceptance Criteria
- [ ] Backend: Add recurring fields to Donation (recurring:boolean, frequency:string, expected_next_date:date, status:string, missed_payments_count:integer)
- [ ] Backend: Calculate expected_next_date based on frequency (monthly, quarterly, annually)
- [ ] Backend: Background job CheckMissedPaymentsJob (Sidekiq)
- [ ] Backend: Update status based on overdue days (late, overdue, at_risk, cancelled)
- [ ] Backend: GET /api/donations/overdue endpoint for admin dashboard
- [ ] Backend: Increment missed_payments_count for overdue donations
- [ ] Frontend: Recurring checkbox in DonationForm
- [ ] Frontend: Frequency dropdown (monthly, quarterly, annually)
- [ ] Frontend: Overdue donations dashboard
- [ ] RSpec tests for date calculations and status logic
- [ ] Background job tests with Sidekiq testing mode

### Technical Notes
- **TDD approach**: Red-Green-Refactor cycle followed for all tests
- **Frequency enum**: `enum frequency: { one_time: 0, monthly: 1, quarterly: 2, annually: 3 }`
- **Status enum**: `enum status: { active: 0, late: 1, overdue: 2, at_risk: 3, cancelled: 4 }`
- **Date calculation**:
  - monthly: +1.month
  - quarterly: +3.months
  - annually: +1.year
- **Job schedule**: Daily at midnight via Sidekiq cron
- **Status transitions**:
  - 1-7 days late: 'late'
  - 8-30 days: 'overdue' (increment missed_payments_count)
  - 31-90 days: 'at_risk'
  - 90+ days: 'cancelled'

### Files Changed
- Backend: `db/migrate/..._add_recurring_to_donations.rb` (new)
- Backend: `app/models/donation.rb` (update)
- Backend: `app/jobs/check_missed_payments_job.rb` (new)
- Backend: `app/controllers/api/donations_controller.rb` (add overdue action)
- Backend: `spec/jobs/check_missed_payments_job_spec.rb` (new)
- Frontend: `src/components/DonationForm.tsx` (update)
- Frontend: `src/components/OverdueDonationsDashboard.tsx` (new)

### Related Commits
- (To be added during commit)

---

## [TICKET-012] Stripe Webhook Integration

**Status:** 📋 Planned
**Priority:** 🟢 Low
**Dependencies:** TICKET-006 (Donation model), TICKET-011 (Recurring logic)

### User Story
As the system, I want to automatically update donation records when Stripe payments occur so that donation data stays in sync with payment processor.

### Acceptance Criteria
- [ ] Backend: POST /webhooks/stripe endpoint (unauthenticated - webhook only)
- [ ] Backend: Stripe webhook signature verification
- [ ] Backend: Handle payment_intent.succeeded event
- [ ] Backend: Handle invoice.payment_succeeded event (subscriptions)
- [ ] Backend: Handle customer.subscription.deleted event
- [ ] Backend: Find donation by stripe_payment_intent_id or customer_id
- [ ] Backend: Update last_received_date, calculate new expected_next_date
- [ ] Backend: Reset missed_payments_count and status on successful payment
- [ ] Backend: Add stripe fields to Donation (stripe_payment_intent_id, stripe_customer_id, stripe_subscription_id)
- [ ] RSpec tests with Stripe webhook fixtures
- [ ] Manual testing with Stripe CLI webhook forwarding

### Technical Notes
- **TDD approach**: Red-Green-Refactor cycle followed for all tests
- **Stripe gem**: Already in Gemfile
- **Webhook signing**: Use STRIPE_WEBHOOK_SECRET env var
- **Signature verification**: `Stripe::Webhook.construct_event(payload, sig_header, secret)`
- **Event types**: payment_intent.succeeded, invoice.payment_succeeded, customer.subscription.deleted
- **Idempotency**: Check if event already processed (store stripe_event_id)
- **Error handling**: Return 200 even on errors (Stripe will retry)
- **Testing**: Use `stripe trigger` CLI command

### Files Changed
- Backend: `db/migrate/..._add_stripe_fields_to_donations.rb` (new)
- Backend: `app/controllers/webhooks/stripe_controller.rb` (new)
- Backend: `config/routes.rb` (add webhook route)
- Backend: `app/services/stripe_webhook_handler.rb` (new)
- Backend: `spec/requests/webhooks/stripe_spec.rb` (new)

### Related Commits
- (To be added during commit)

---
