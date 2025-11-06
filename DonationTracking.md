# Donation Tracker - Project Specifications

*Technical requirements and system design for children's home donation management*

---

## 📖 Documentation

- **[Project Overview](docs/project/README.md)** - Status, architecture, quick start
- **[Data Models](docs/project/data-models.md)** - Database schema and relationships
- **[API Endpoints](docs/project/api-endpoints.md)** - Complete REST API reference
- **[Tech Stack](docs/project/tech-stack.md)** - Frameworks, tools, versions
- **[Development Roadmap](docs/project/roadmap.md)** - Vertical slice implementation plan
- **[Deployment Guide](docs/project/deployment.md)** - Production infrastructure

---

## 🚀 Project Status

**Last Updated:** 2025-11-06

**Latest Milestones:**
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

**Current Focus:** Bug fixes and testing infrastructure improvements complete (TICKET-078)
**Next Feature:** TICKET-052 (Sponsorship Donation Linking) or TICKET-066 (useChildren hook refactoring)

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
