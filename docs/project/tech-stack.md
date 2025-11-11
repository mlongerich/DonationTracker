# Tech Stack

*Frameworks, tools, and versions*

---

## Frontend

**Framework:** React 19.1.1
**Language:** TypeScript 5.x (strict mode)
**UI Library:** Material-UI (MUI) v7
**Date Pickers:** MUI X Date Pickers v8.12.0 with dayjs v1.11.18
**HTTP Client:** Axios with interceptors
**Routing:** React Router v6
**Build Tool:** Create React App (react-scripts)

**Testing:**
- Jest v27.5.1 (unit/integration tests)
- React Testing Library v16.3.0
- Cypress v13.17.0 (E2E tests)
- Vitest v1.6.1 (modern alternative)
- MSW v2.0.0 (API mocking)

**Code Quality:**
- ESLint with React, TypeScript, and accessibility plugins
- Prettier for formatting
- TypeScript compiler

---

## Backend

**Framework:** Rails 8.0.2
**Language:** Ruby 3.4.2
**API Mode:** JSON API only (no views)
**Database:** PostgreSQL 15
**Cache:** Redis

**Key Gems:**
- `discard` v1.3 - Soft delete with `discarded_at`
- `kaminari` v1.2 - Pagination
- `ransack` v4.2 - Search and filtering
- `paper_trail` v15.2 - Audit trail
- `pact` v1.65 - Contract testing

**Testing:**
- RSpec v3.13 (unit/integration tests)
- Factory Bot v6.5 - Test data generation
- Faker v3.5 - Realistic test data
- SimpleCov v0.22 - Code coverage (90% minimum)
- Shoulda Matchers v6.4 - Validation testing
- Database Cleaner v2.0 - Test isolation
- WebMock v3.24 + VCR v6.3 - HTTP mocking

**Code Quality:**
- RuboCop v1.69 - Style guide enforcement
- Brakeman v6.2 - Security scanner
- Reek v6.5 - Code smell detection
- RubyCritic v4.10 - Quality reports
- Skunk v0.5 - Cost metrics
- Bullet v8.0 - N+1 query detection

---

## Infrastructure

**Containerization:** Docker + Docker Compose

**Services & Ports:**
- PostgreSQL 15-alpine (port 5432)
- Redis 7-alpine (port 6379)
- Rails API (port 3001) → `donation_tracker_api_development` database
- Rails E2E Test API (port 3002) → `donation_tracker_api_test` database (isolated)
- React Frontend (port 3000)

**Development Tools:**
- Git with pre-commit hooks
- TDD bash testing framework
- Hot reload (WATCHPACK_POLLING=300ms)

**macOS Development (Colima):**
- Minimum requirements: 6GB RAM, 4 CPU cores
- Setup command: `colima start --cpu 4 --memory 6 --disk 100`
- Default 2GB/2CPU is insufficient for full stack

---

## Planned Additions

**Authentication:** Google OAuth (Devise + omniauth-google-oauth2)
**Payments:** Stripe with webhooks
**Hosting:** Digital Ocean with HTTPS
**Background Jobs:** Sidekiq + Redis
**Email:** SendGrid or similar

---

## Version Requirements

**Minimum Versions:**
- Docker: 20.10+
- Docker Compose: 2.0+
- Node.js: 18+ (for frontend development)
- Ruby: 3.4+ (for backend development)

**Recommended Development Environment:**
- macOS with Colima (6GB RAM, 4 CPU cores)
- Ubuntu 22.04+ (for deployment)
- VS Code with Ruby/TypeScript extensions

---

## Development Commands

### Backend

```bash
# Rails console
docker-compose exec api rails console

# Run tests
docker-compose exec api bundle exec rspec

# Code quality
docker-compose exec api bundle exec rubocop
docker-compose exec api bundle exec reek app/
docker-compose exec api bundle exec rubycritic --no-browser app/
docker-compose exec api bundle exec skunk
```

### Frontend

```bash
# Unit tests (Jest)
docker-compose exec frontend npm test
docker-compose exec frontend npm run vitest
docker-compose exec frontend npm run vitest:ui

# E2E tests (Cypress) - Development mode
docker-compose exec frontend npm run cypress:run
docker-compose exec frontend npm run cypress:open

# Linting
docker-compose exec frontend npm run lint
```

### E2E Testing (Isolated Test Environment)

**Environment Isolation:**
- Development API (port 3001) → `donation_tracker_api_development` database
- Test API (port 3002) → `donation_tracker_api_test` database (isolated, cleaned before each run)

**Commands:**
```bash
# Start test API on port 3002 (isolated test database)
cd donation_tracker_frontend
docker-compose --profile e2e up -d

# Run E2E tests (headless)
npm run cypress:e2e

# Run E2E tests with UI
npm run cypress:e2e:open

# Stop test API when done
npm run cypress:e2e:down
# OR: docker-compose --profile e2e down
```

**Why Isolated Environment?**
- E2E tests should NOT pollute development database
- Test database cleaned via `/api/test/cleanup` endpoint before each run
- Cypress uses `testApiUrl` environment variable (`localhost:3002`)

**See:** TICKET-024 for complete implementation details

### Pre-commit Scripts

```bash
bash scripts/check-documentation.sh           # Documentation reminder
bash scripts/pre-commit-backend.sh           # RuboCop + Brakeman + RSpec
bash scripts/pre-commit-frontend.sh          # ESLint + Prettier + TypeScript + Jest
bash scripts/install-native-hooks.sh         # Install hooks
bash scripts/recover-backup.sh               # View/restore backups
```

---

## Related Documentation

- **[Development Roadmap](roadmap.md)** - Feature timeline
- **[Deployment](deployment.md)** - Infrastructure setup
- **[CLAUDE.md](../../CLAUDE.md)** - Development conventions
