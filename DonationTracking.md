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

**Last Updated:** 2025-11-04

**Latest Milestones:**
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

**Current Focus:** Code quality improvements complete (TICKET-067, TICKET-068)
**Next Feature:** TICKET-066 (useChildren hook refactoring) or TICKET-071 (Stripe CSV batch import)

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
