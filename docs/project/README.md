# Donation Tracker - Project Overview

*Children's Home Donation Tracking System*

---

## 🚀 Current Status

**Last Updated:** 2025-10-19

**Latest Milestone:** TICKET-044 - Extract Shared TypeScript Types ✅

**Active Development:** Preparing for TICKET-010 (Children & Basic Sponsorship Tracking)

### Recent Completions

- ✅ **TICKET-044** (2025-10-19): Extract Shared TypeScript Types - Centralized type definitions
- ✅ **TICKET-009** (2025-10-19): Project-Based Donations - Full CRUD with routing
- ✅ **TICKET-017** (2025-10-16): Donor Autocomplete Search - ~100x performance improvement
- ✅ **TICKET-016** (2025-10-18): Donation List Filtering & Date Range with MUI X DatePickers
- ✅ **TICKET-015** (2025-10-17): Donation List Pagination with Kaminari

See [tickets/README.md](../../tickets/README.md) for complete ticket history.

---

## 📖 Project Vision

A secure web application to track donations for a children's home and school organization. The system manages:

- **General Donations**: One-time and recurring contributions
- **Project-Based Donations**: Campaign-specific fundraising
- **Child Sponsorship Program**: Monthly recurring sponsorships with automated tracking
- **Missed Payment Detection**: Automated alerts for overdue sponsorship payments

---

## 🏗️ Architecture Overview

### Monorepo Structure

```
DonationTracker/
├── donation_tracker_api/       # Rails 8.0.2 API (port 3001)
├── donation_tracker_frontend/  # React 19 + TypeScript (port 3000)
├── docker-compose.yml          # Service orchestration
├── scripts/                    # Pre-commit hooks & testing
├── docs/project/              # Project documentation
├── tickets/                   # Active work items
└── CLAUDE.md                  # AI development conventions
```

### Services

- **PostgreSQL 15**: Port 5432
- **Redis**: Port 6379
- **Rails API**: Port 3001 (dev), 3002 (e2e tests)
- **React Frontend**: Port 3000

### Current Data Models

**Implemented:**
- `User` - Username-based authentication (TDD demo)
- `Donor` - Email uniqueness, soft delete, merge tracking, audit trail
- `Donation` - Amount validation, date validation, belongs_to donor/project
- `Project` - Title, type enum (general/campaign/sponsorship), system flag

**Planned (TICKET-010):**
- `Child` - Name, age, photo_url, bio, location
- `Sponsorship` - Links donor + child + project, monthly_amount, active status

See [data-models.md](data-models.md) for detailed schema.

---

## ✅ Completed Features

### Infrastructure
- ✅ Docker Compose with hot reload (WATCHPACK_POLLING)
- ✅ Isolated E2E test environment (api-e2e service)
- ✅ CORS configuration via environment variables
- ✅ Service-separated Git commits

### Backend (Rails API)
- ✅ Rails 8.0.2 + Ruby 3.4.2
- ✅ Comprehensive testing: RSpec, Factory Bot, Faker, SimpleCov, VCR
- ✅ Code quality: RuboCop, Brakeman, Reek, RubyCritic, Skunk
- ✅ Donor CRUD with search (Ransack), pagination (Kaminari), soft delete (Discard)
- ✅ Donor merge with field-level selection + transaction safety
- ✅ CSV import via rake task (Stripe format support)
- ✅ Donation CRUD with date range filtering
- ✅ Project CRUD with system project protection
- ✅ Presenter pattern for API responses
- ✅ Controller concerns for pagination/filtering

### Frontend (React + TypeScript)
- ✅ React 19.1.1 with TypeScript strict mode
- ✅ Testing: Jest, React Testing Library, Cypress, Vitest
- ✅ Material-UI v7 mobile-first components
- ✅ MUI X Date Pickers v8 with dayjs adapter
- ✅ Centralized TypeScript types (`src/types/`)
- ✅ Donor management UI with search, pagination, archive/restore
- ✅ Donor merge modal with field selection
- ✅ Donor autocomplete with debounced API search
- ✅ Donation form with amount/date/donor/project selection
- ✅ Donation list with pagination and filtering
- ✅ Project management page with full CRUD
- ✅ React Router with /projects route

### Quality Assurance
- ✅ TDD-driven pre-commit hooks (13 passing tests)
- ✅ Documentation update enforcement
- ✅ Backend: RuboCop + Brakeman + RSpec
- ✅ Frontend: ESLint + Prettier + TypeScript + Jest
- ✅ Test coverage: 64 RSpec + 51 Jest + 114 Cypress tests

---

## 🎯 Development Philosophy

### Thin Vertical Slices
Build complete features through all layers (model → API → UI → tests) one at a time, delivering working functionality incrementally.

### Test-Driven Development
Strict TDD workflow: Red → Green → Refactor, one test at a time. See [CLAUDE.md](../../CLAUDE.md#tdd-workflow).

### Service-Separated Commits
```bash
backend: <description>    # Rails API changes
frontend: <description>   # React component changes
docs: <description>       # Documentation updates
```

---

## 📚 Related Documentation

- **[Data Models](data-models.md)** - Complete database schema
- **[API Endpoints](api-endpoints.md)** - REST API reference
- **[Tech Stack](tech-stack.md)** - Frameworks, tools, versions
- **[Development Roadmap](roadmap.md)** - Vertical slice plan
- **[Deployment](deployment.md)** - Production requirements
- **[Active Tickets](../../tickets/README.md)** - Current work items
- **[Development Conventions](../../CLAUDE.md)** - AI coding guidelines

---

## 🚀 Quick Start

```bash
# Clone and start services
git clone <repo-url>
cd DonationTracker
docker-compose up

# Verify services
curl http://localhost:3001  # Rails API
curl http://localhost:3000  # React frontend

# Run tests
docker-compose exec api bundle exec rspec
docker-compose exec frontend npm test
```

See [CLAUDE.md - Development Environment Setup](../../CLAUDE.md#development-environment-setup) for full setup guide.

---

## 📞 Support

- **Issues**: Create tickets in `tickets/` directory
- **Conventions**: See [CLAUDE.md](../../CLAUDE.md)
- **Backlog**: See [BACKLOG.md](../../BACKLOG.md)
