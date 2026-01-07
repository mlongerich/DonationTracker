# Donation Tracker - Project Specifications

*Technical requirements and system design for children's home donation management*

---

## 📖 Documentation

- **[Project Overview](project/README.md)** - Status, architecture, quick start
- **[Data Models](project/data-models.md)** - Database schema and relationships
- **[API Endpoints](project/api-endpoints.md)** - Complete REST API reference
- **[Tech Stack](project/tech-stack.md)** - Frameworks, tools, versions
- **[Development Roadmap](project/roadmap.md)** - Vertical slice implementation plan
- **[Deployment Guide](project/deployment.md)** - Production infrastructure

---

## 🚀 Project Status

**Last Updated:** 2026-01-07 (TICKET-008: Authentication Foundation - In Progress)

**Latest Milestones:**
- TICKET-008 - Google OAuth Authentication Foundation 🔵 (2026-01-07 - IN PROGRESS)
  - **JWT Service:** Encode/decode with 30-day expiration and automatic validation (4 tests passing)
  - **User Model:** OAuth fields (provider, uid, email, name, avatar_url) with @projectsforasia.com domain restriction (2 tests passing)
  - **Database Migration:** Added OAuth fields with composite unique index on [provider, uid] and unique email index
  - **Factory Bot:** Updated user factory with OAuth traits (:admin, :unauthorized_domain)
  - **Auth Routes:** Added /auth/google_oauth2/callback, /auth/logout, /auth/me routes
  - **OmniAuth Config:** Manual Google OAuth2 setup (no Devise middleware for API-only JWT auth)
  - **Test Coverage:** 6 tests passing (JWT service + User model) with strict TDD (Red-Green-Refactor)
  - **Technical Decision:** Manual OAuth handling (not Devise :omniauthable) to avoid session requirements in API-only app
  - **Next Steps:** AuthController implementation (callback/logout/me endpoints), authentication middleware, frontend components, E2E test updates
  - See tickets/TICKET-008-basic-authentication-google-oauth.md for full implementation plan
- TICKET-071 - Stripe CSV Batch Import Task ✅ (2026-01-06)
  - **User Testing Complete:** Validated production CSV import working as expected
  - **Import Verified:** Donations created correctly with proper status breakdown
  - **Idempotency Confirmed:** Duplicate detection prevents re-import of existing donations
  - **Sponsorship Auto-creation:** Subscription payments correctly create child sponsorships
  - **Project Mapping:** Pattern matching correctly assigns General Donation vs named projects
  - **MVP Status:** Functional batch import solution used until TICKET-026 (webhooks) complete
  - **CLI Usage:** `docker-compose exec api rails stripe:import_csv` (default path or custom file)
  - **GUI Alternative:** Admin page CSV tab provides web-based import (TICKET-091)
  - See tickets/TICKET-071-stripe-csv-batch-import-task.md for implementation details
- TICKET-091 - Stripe CSV Import GUI ✅ (2025-12-08)
  - **Admin CSV Import:** Added Stripe CSV upload to Admin page CSV tab (alongside existing donor export)
  - **Backend API:** Admin controller POST /api/admin/import/stripe_payments endpoint with binary file handling for non-UTF-8 CSVs
  - **Service Reuse:** Controller thin wrapper around existing StripeCsvBatchImporter (same logic as rake task)
  - **Frontend UI:** MUI file picker button, loading state ("Importing..."), success/error result display with counts (succeeded/skipped/failed/needs_attention)
  - **Timeout Handling:** 120s axios timeout for large CSV imports (default 10s too short)
  - **Encoding Fix:** Binary mode (binmode) prevents UTF-8 conversion errors on file upload
  - **Test Coverage:** 5 RSpec tests (success, errors, missing file, malformed CSV, encoding), 7 Jest tests (render, file selection, upload button, API call, results, clear, loading), 1 Cypress E2E test
  - **User Flow:** Admin page → CSV tab → Choose File → Import Stripe CSV → View detailed results
  - See tickets/TICKET-091-admin-page-csv-import-gui.md for full implementation details
- TICKET-127 - StandardDialog Component & Form UX Consistency ✅ (2025-12-07)
  - **StandardDialog Component:** Created generic dialog wrapper eliminating 180+ lines of duplication across SponsorshipModal, QuickDonorCreateDialog, QuickEntityCreateDialog
  - **Interface:** open, onClose, title, children, error, onErrorClose, maxWidth - provides standard close X button and error handling
  - **Conditional Cancel Buttons:** Cancel now shows ONLY in edit mode (when initialData/project/donor AND onCancel provided) - no Cancel in create mode or modal forms
  - **Cancel Button Styling:** Error color (red) for visual distinction, side-by-side layout with Update button
  - **Forms Updated:** ChildForm, DonorForm, ProjectForm all follow conditional Cancel pattern
  - **Bug Fix:** ProjectForm and ChildForm now clear fields when Cancel clicked (useEffect syncs with prop changes)
  - **SponsorshipForm:** Removed Cancel button (modal-only component), Submit button now fullWidth + color="primary"
  - **Test Coverage:** StandardDialog (5 tests), form clear tests added to ProjectForm and ChildForm, all affected component tests updated
  - **Net Impact:** -17 lines of code, significantly better maintainability, single source of truth for dialogs
  - **Documentation:** CLAUDE.md updated with StandardDialog Pattern section and revised Form Component Pattern
  - See tickets/TICKET-127-sponsorshipmodal-dialog-consistency.md for full implementation details
- TICKET-119 - Move Projects to Admin Page Tab ✅ (2025-12-05)
  - **AdminPage Tab Structure:** Projects moved from standalone page to Admin page as 3rd tab
  - **Tab Organization:** Tab 0 (Pending Review), Tab 1 (CSV Export), Tab 2 (Projects)
  - **ProjectsSection Component:** Self-contained section with full CRUD functionality (15 tests preserved)
  - **Navigation Cleanup:** Removed Projects button from top nav (5 buttons instead of 6)
  - **Route Changes:** Removed /projects route, Projects accessed via /admin → Projects tab
  - **Zero Regression:** All 15 functional tests migrated, all unit & E2E tests passing
  - **UX Improvement:** Clear separation of operational pages vs admin features
  - **Pattern:** Section components are self-contained with own state, handlers, notifications
  - **Test Coverage:** ProjectsSection (15 tests), AdminPage (2 new tests), updated 3 Cypress E2E files
  - See tickets/TICKET-119-move-projects-to-admin-tab.md for implementation details
- TICKET-134 - Stripe CSV Email Fallback Handling ✅ (2025-12-05)
  - **Email Fallback Logic:** 3-tier priority system for donor email extraction from Stripe CSV
  - **Priority 1:** Cust Email (primary customer email from Stripe)
  - **Priority 2:** Billing Details Email (fallback when Cust Email empty - fixes 121 rows)
  - **Priority 3:** Anonymous email generation (when both empty - handles 138 rows via DonorService)
  - **Bug Fix:** Resolves "Email is invalid" validation errors during CSV import
  - **Test Coverage:** 3 new test cases (billing fallback, priority preference, anonymous generation)
  - **Pattern:** donor_email helper method in StripePaymentImportService
  - See tickets/TICKET-134-stripe-csv-email-fallback.md for implementation details
- TICKET-088 - Donor Export to CSV ✅ (2025-12-04)
  - **Admin Page CSV Tab:** Added "Export All Donors to CSV" button on Admin page
  - **13 CSV Columns:** Name, Email, Phone, Address (4 fields), Total Donated, Donation Count, Last Donation Date, Status
  - **SQL Aggregates:** Uses SUM/COUNT/MAX with left_joins to avoid N+1 queries (efficient for large donor lists)
  - **Email Privacy:** Hides @mailinator.com emails (anonymous donors) by exporting empty string
  - **Merged Donor Handling:** Exports only final merged records (excludes merged_into_id not null)
  - **Currency Formatting:** Converts cents to dollars with format_currency helper
  - **Test Coverage:** 5 service tests (empty list, no donations, aggregates, last donation date, mailinator emails), 2 controller tests (filters, include_discarded), 2 AdminPage Jest tests, 1 Cypress E2E test
  - **DonorExportService:** Class method pattern (stateless CSV generation) with Ruby CSV library
  - **Ransack Support:** Respects search filters and include_discarded parameter
  - See tickets/completed/TICKET-088-donor-export-csv-excel.md for implementation details
- TICKET-132 - Add Ransack Security Comments and Fix Whitelists ✅ (2025-12-03)
  - **Security Comments:** Added inline documentation to all ransackable_* methods explaining security purpose
  - **Missing Security Whitelists:** Added ransackable_associations to Donation model, both methods to Project model
  - **Bug Fix:** Added missing address_line2 to Donor ransackable_attributes
  - **Code Consistency:** Converted all models to %w[] word array syntax (Style/WordArray RuboCop rule)
  - **Comprehensive Testing:** 19 new Ransack whitelist tests across 5 models (Donor, Child, Sponsorship, Donation, Project)
  - **Security Impact:** Prevents SQL injection via unauthorized attribute searches, prevents unauthorized joins
  - **Pattern Documentation:** Updated CLAUDE.md with word array preference (%w[] over [""])
  - See tickets/TICKET-132-add-ransackable-method-comments.md for implementation details
- TICKET-100 - Add Physical Address to Donor Records ✅ (2025-11-28)
  - **Phone & Address Fields:** phone (phonelib validation), address_line1, address_line2, city, state (2-char), zip_code (validates_zipcode with auto-padding), country (2-char ISO)
  - **Anonymous Email Generation:** Unique email from phone/address (prevents duplicate anonymous donors)
  - **Priority:** phone > address > name for anonymous donors ("anonymous-5551234567@mailinator.com", "anonymous-123mainst-springfield@mailinator.com")
  - **Data Preservation:** CSV import with blank phone/address preserves existing values
  - **Omni-Search:** Ransack search across name, email, phone, and all address fields
  - **Donor Merge:** Address fields included in merge modal with composite "Address" field selection
  - **Stripe CSV Import:** Extracts phone and billing address from CSV
  - **Frontend:** DonorForm with phone/address inputs, DonorList shows phone, DonorMergeModal async loading fix
  - **Test Coverage:** 20+ backend RSpec tests, 15+ frontend Jest tests, 5 Cypress E2E tests
  - **Factory Traits:** :with_phone, :with_address, :with_full_contact for testing
  - See tickets/completed/TICKET-100-add-physical-address-donor-records.md for full implementation
- TICKET-126 - Intelligent Pre-Commit Documentation Validation ✅ (2025-11-26)
  - **Active validation replaces passive warning** - blocks commits when docs missing
  - Intelligent ticket detection from git changes (modified + untracked files)
  - Validates CLAUDE.md, DonationTracking.md, tickets/README.md, and ticket file
  - Handles both tickets/ and tickets/completed/ directories
  - **Bypass options**: SKIP_DOC_CHECK=1 (env var), [skip-docs] (commit tag), --no-verify (all hooks)
  - Blocking pre-commit hook with helpful error messages showing all bypass options
  - 17 passing tests (100% coverage) - strict TDD approach (RED-GREEN-REFACTOR)
  - Script executes in <100ms (fast, non-intrusive)
  - Updated CLAUDE.md with bypass documentation
  - See TICKET-126 for implementation details and bypass usage
- TICKET-113 - Cleanup Old Failed Payments System ✅ (2025-11-17)
  - **Final phase of Stripe import redesign - removed old failed_stripe_payments system**
  - Created verification script: scripts/verify-cleanup.sh (checks for old code references)
  - Created migration to drop failed_stripe_payments table (20251117153808_drop_failed_stripe_payments.rb)
  - Verified no code references remain: Backend ✅, Frontend ✅, Routes ✅, Schema ✅
  - Updated docs/STRIPE_IMPORT_PLAN.md status to COMPLETE
  - Updated TICKET-076 status to SUPERSEDED BY TICKET-109/110/111/112/113
  - All tests pass: 330 backend tests (92.94% coverage), all frontend tests pass ✅
  - **Stripe import redesign complete**: TICKET-109 → TICKET-113 all done
  - docs/STRIPE_IMPORT_PLAN.md implementation: ✅ COMPLETE
- TICKET-112 - Validation & Merge to Master ✅ (2025-11-16)
  - **Stripe import redesign validated and ready for production**
  - Created validation script: scripts/validate-stripe-redesign.sh (automated testing workflow)
  - **Database Validation**: Drop/recreate database, import CSV, verify status tracking ✅
  - **Import Results**: 455 donations imported (449 succeeded, 6 needs_attention, 0 failed)
  - **Idempotency Verified**: Re-import created 0 duplicates (1397 skipped) ✅
  - **Duplicate Detection**: 6 donations flagged with duplicate_subscription_detected ✅
  - **Status Tracking**: All donations properly categorized by Stripe status ✅
  - **Test Coverage**: 333 backend tests pass (93.65% coverage), all frontend tests pass ✅
  - Branch: feature/stripe-import-redesign (ready to merge to master)
  - Next: Client demo and approval before merge
- TICKET-110 - Stripe Payment Import with Status & Metadata Support ✅ (2025-11-15)
  - **New Idempotency Logic**: subscription_id + child_id (sponsorships), charge_id + project_id (projects)
  - **Status-based Counting**: Batch importer tracks succeeded_count, failed_count, needs_attention_count (donation status)
  - **Metadata-first Extraction**: child_id/project_id from metadata (webhooks), fallback to parsing (CSV)
  - **Duplicate Detection**: Flags duplicate subscriptions (same child, different subscription_id) as needs_attention
  - Updated StripePaymentImportService: find_existing_donation method with 2-strategy lookup
  - Updated StripeCsvBatchImporter: Status-based counters, error tracking with row numbers
  - Updated rake task output: Displays succeeded/failed/needs_attention breakdown
  - Full test coverage: 3 idempotency tests, 1 status counting test (strict TDD)
  - Backend: All tests pass (90%+ coverage maintained)
  - Validated with real CSV data (TICKET-112)
- TICKET-109 - Donation Status Infrastructure ✅ (2025-11-15)
  - Added comprehensive status tracking to donations table (succeeded, failed, refunded, canceled, needs_attention)
  - Migration: Added status (NOT NULL, default 'succeeded'), duplicate_subscription_detected, needs_attention_reason fields
  - Migration: Added composite unique index on [stripe_subscription_id, child_id] for sponsorships
  - Model: Added status enum with 5 values and validation
  - Model: Added scopes (pending_review, active, for_subscription)
  - Model: Added instance methods (needs_review?, sponsorship?)
  - Model: Added uniqueness validation for subscription_id + child_id combination
  - Factory: Added status traits (succeeded, failed, refunded, canceled, needs_attention)
  - Updated Ransackable attributes to support filtering by status
  - Full test coverage: 41 passing tests (enum, scopes, validations, instance methods)
  - Followed strict TDD: RED-GREEN-REFACTOR for all 23 implementation cycles
  - Backend: All tests pass (90%+ coverage maintained)
- TICKET-076 → TICKET-109/110/111/112/113 - Stripe Import Redesign 🔄 (2025-11-14)
  - Discovered fundamental design issues during TICKET-076 implementation
  - Created comprehensive STRIPE_IMPORT_PLAN.md for redesigned approach
  - Paused TICKET-076, preserved work in backup/ticket-076-complete branch
  - Created 5-phase implementation plan (TICKET-109 through TICKET-113)
  - New design: Add status field to donations (succeeded, failed, refunded, canceled, needs_attention)
  - Metadata-first strategy for webhook alignment (TICKET-026)
  - Branch-based workflow on feature/stripe-import-redesign
  - Cleaned up feature branch (deleted old failed_stripe_payments code)
  - See docs/STRIPE_IMPORT_PLAN.md for complete rationale
- TICKET-052 - Improve Sponsorship Donation Linking UX ✅ (2025-11-11)
  - Added child gender field (optional: boy/girl/null) to Child model
  - Backend: Gender validation, presenter support, API parameter permission
  - Frontend: Gender dropdown in ChildForm with "Not specified" option
  - Display Boy/Girl icons in ChildList (after name, hidden if null)
  - Display Boy/Girl icons in ProjectOrChildAutocomplete (before name, null→Boy)
  - Grouped autocomplete results: "Children" and "Projects" sections
  - Type badges with icons (Child/General/Campaign) for visual distinction
  - Updated label to "Donation For" for clarity
  - Added 6 Jest unit tests (ChildForm: 3, ChildList: 3)
  - Added 5 Cypress E2E tests (create boy/girl/null, edit gender, clear to null)
  - Fixed bug: ChildForm sending undefined instead of null for empty gender
  - Documentation: Optimized CLAUDE.md (1036 → 822 lines, 20% reduction)
  - Documentation: Moved environment details to docs/project/tech-stack.md and deployment.md
  - Created TICKET-092 (child name+gender uniqueness validation)
  - Created TICKET-093 (project icons on projects page)
- TICKET-024 - Separate Test and Development Database Environments ✅ (2025-11-06)
  - Fixed misconfigured E2E test infrastructure to use isolated test database
  - Updated docker-compose.yml database names to match database.yml (donation_tracker_api_test)
  - Updated 6 Cypress test files to use testApiUrl instead of hardcoded localhost:3001
  - Added npm scripts: cypress:e2e, cypress:e2e:open, cypress:e2e:down
  - Created environment-isolation.cy.ts verification test
  - Updated CLAUDE.md with E2E testing documentation
  - Environment isolation working: Dev (3001) → dev DB, Test (3002) → test DB
  - All Cypress E2E tests verified passing (no data pollution)
- TICKET-042 - Add Class-Level Documentation Comments ✅ (2025-11-06)
  - Added YARD-style documentation to 29 files (8 controllers, 8 models, 5 services, 2 concerns, 6 presenters, 1 job, 1 mailer)
  - Eliminated 29 IrresponsibleModule warnings (0 remaining)
  - Reduced total Reek warnings from 94 → 65 (22% reduction)
  - Updated CLAUDE.md with documentation standards
  - All RSpec tests pass (no regressions)
- TICKET-079 - Project CRUD E2E Tests + Bug Fixes ✅ (2025-11-05)
  - Created comprehensive E2E test suite: 10 tests covering full CRUD + archive/restore
  - **Bug Fix 1**: Added unique title validation to Project model
  - **Bug Fix 2**: Fixed test cleanup to delete projects between E2E runs
  - **Bug Fix 3**: Fixed sponsorship API to respect provided project_id (strong parameters + validation)
  - **Bug Fix 4**: Fixed DonationForm test timeout (increased to 10s for userEvent delays)
  - Added 2 RSpec tests for Project uniqueness, 2 for Sponsorship project_id validation
  - Backend: 270 tests pass (93.11% coverage), Frontend: 264 tests pass
  - Cypress: 44/44 E2E tests pass (37s runtime for project-crud.cy.ts) ✅
- TICKET-078 - Fix Donation Filter Race Condition ✅ (2025-11-05)
  - Fixed race condition in DonationsPage.tsx between state updates and API calls
  - Removed useRansackFilters hook, build query params directly from state
  - All 5 reported filter issues resolved (donor filter, date filters, clear button)
  - Fixed 8 Cypress E2E test files (34/34 tests passing)
  - Added Jest and Cypress tests to pre-commit hooks
  - Backend: TestController cleanup endpoint fix
  - Frontend: 264 tests pass, Cypress: 34/34 E2E tests pass ✅
- TICKET-069 - Code Quality Cleanup (Linter Warnings Batch) ✅ (2025-11-04)
  - Fixed 63 linter warnings (16 backend Reek, 47 frontend ESLint)
  - Backend: UnusedParameters (5), DuplicateMethodCall (9), UtilityFunction (1), UncommunicativeVariableName (1)
  - Frontend: Testing Library violations (43), unused imports (4)
  - Updated 8 backend files, 15+ frontend test files
  - Backend: 266 tests pass, 93.03% coverage
  - Frontend: 260/264 tests pass (4 flaky tests documented in docs/flaky_tests.md)
  - ESLint: 0 errors, 0 warnings ✅
- TICKET-068 - Global Error Handling in ApplicationController ✅ (2025-11-04)
  - Added rescue_from handlers for RecordNotFound, RecordInvalid, ParameterMissing
  - Controllers now use save!/update!/find (raising exceptions) instead of if/else blocks
  - Consistent error responses: `{ error: "..." }` (404, 400), `{ errors: [...] }` (422)
  - Updated 4 controller actions (Children, Donations, Donors, Projects)
  - 4 comprehensive tests covering all exception types
  - Backend: 267 tests pass, 91.5% coverage
- TICKET-067 - Standardize API Response Wrapping with Presenters ✅ (2025-11-04)
  - Fixed 60% inconsistency → 100% consistent presenter usage across all endpoints
  - All single-resource endpoints now return `{ resource: {...} }` format
  - Updated 11 controller actions (Donors, Children, Donations)
  - Enhanced DonorPresenter, ChildPresenter with can_be_deleted field
  - Fixed CollectionPresenter options passing for include_sponsorships support
  - Backend: 263 tests pass, 91.9% coverage
  - Frontend: 263 tests pass
- TICKET-050 - Children Page Search & Pagination ✅ (2025-11-03)
  - Debounced search TextField (300ms delay, Ransack name_cont filter)
  - Pagination UI component (10 items per page)
  - ChildForm consistency improvements (remove Cancel button, full-width Submit)
  - Integrated useDebouncedValue and usePagination hooks
  - 27 tests passing (23 ChildrenPage + 4 ChildForm)
  - Completes UI standardization across all management pages
- TICKET-070 - Stripe CSV Import Foundation ✅ (2025-11-02)
  - Production-ready StripePaymentImportService with 17 tests, 95.46% coverage
  - StripeInvoice abstraction (1-to-many relationship for multi-child sponsorships)
  - Smart field selection (Nickname primary, Description fallback)
  - 5-tier pattern matching (sponsorship, general, campaign, email, unmapped)
  - Transaction-wrapped, error-handled, idempotent imports
  - PERMANENT code - reused by TICKET-026 (webhooks) and TICKET-071 (batch import)
- TICKET-065 - Move Business Logic to Backend (displayable_email) ✅ (2025-10-31)
- TICKET-064 - Smart Sponsorship Detection & Backend Logic ✅ (2025-10-31)
- TICKET-032 - Custom Hooks Library (useDebouncedValue, usePagination, useRansackFilters) ✅ (2025-10-29)

**Current Focus:** Donor export complete (TICKET-088)
**Next Feature:** TICKET-092 (Child uniqueness validation) or TICKET-093 (Project icons)

**See [docs/project/README.md](docs/project/README.md#current-status) for detailed status**

---

## 🎯 Quick Links

### For Developers
- [Active Tickets](tickets/README.md) - Current work items and backlog
- [Development Conventions](CLAUDE.md) - AI coding guidelines and TDD workflow
- [Setup Guide](CLAUDE.md#development-environment-setup) - Environment configuration

### For Project Planning
- [Feature Roadmap](docs/project/roadmap.md) - Implementation timeline
- [Data Models](docs/project/data-models.md) - Database design
- [API Reference](docs/project/api-endpoints.md) - Endpoint documentation

### For Deployment
- [Tech Stack](docs/project/tech-stack.md) - Infrastructure components
- [Deployment Guide](docs/project/deployment.md) - Production setup

---

## 📝 Project Vision

A secure web application to track donations for a children's home and school organization, managing:

- **General Donations** - One-time and recurring contributions
- **Project-Based Donations** - Campaign-specific fundraising
- **Child Sponsorship Program** - Monthly sponsorships with automated tracking
- **Missed Payment Detection** - Automated alerts for overdue payments

---

## 🏗️ Current Architecture

```
DonationTracker/
├── donation_tracker_api/       # Rails 8.0.2 API (port 3001)
├── donation_tracker_frontend/  # React 19 + TypeScript (port 3000)
├── docs/project/              # Modular project documentation
├── tickets/                   # Active work items
├── CLAUDE.md                  # AI development conventions
└── docker-compose.yml         # Service orchestration
```

See [docs/project/README.md](docs/project/README.md) for complete architecture details.

---

*For development workflow and conventions, see [CLAUDE.md](CLAUDE.md)*
