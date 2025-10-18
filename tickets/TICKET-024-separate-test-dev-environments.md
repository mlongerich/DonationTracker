## [TICKET-024] Separate Test and Development Database Environments

**Status:** 📋 Planned
**Priority:** 🔴 High
**Dependencies:** None

### User Story
As a developer, I want separate database environments for Cypress E2E tests and local development so that manual testing doesn't pollute automated test data and cause flaky tests.

### Problem Statement
Currently, Cypress E2E tests run against the same database as local development (localhost:3001). This causes:
- **Data pollution**: Manual testing creates records that interfere with Cypress tests
- **Flaky tests**: Tests may pass/fail depending on what data exists from manual testing
- **Test isolation issues**: Cannot guarantee clean slate for each test run
- **Confidence loss**: Cannot trust E2E test results

### Acceptance Criteria
- [ ] Create separate test database configuration (e.g., `donation_tracker_test`)
- [ ] Rails test environment uses test database
- [ ] Cypress tests run against test API endpoint (e.g., `RAILS_ENV=test`)
- [ ] Development database remains isolated for manual testing
- [ ] Database cleanup between tests works reliably
- [ ] Docker Compose supports both environments
- [ ] Documentation updated with environment setup instructions

### Technical Approach

#### Option 1: Separate Database Names
- **Development**: `donation_tracker_development`
- **Test**: `donation_tracker_test`
- Rails already supports this via `config/database.yml`

#### Option 2: Separate Docker Services
- Run two Rails API containers:
  - `api` on port 3001 (development)
  - `api-test` on port 3002 (test environment)
- Cypress configured to use port 3002
- Complete isolation

#### Option 3: Database Cleaner with Transactions
- Use DatabaseCleaner gem with transaction strategy
- Wrap each Cypress test in database transaction
- Rollback after each test

### Recommended Solution
**Hybrid Approach:**
1. Use separate database names (Option 1) - simplest
2. Run Rails in test mode for Cypress: `RAILS_ENV=test rails s -p 3002`
3. Docker Compose has two API services
4. Cypress points to `http://localhost:3002`

### Implementation Plan
1. Update `config/database.yml` to ensure test database is configured
2. Create `docker-compose.test.yml` for test environment
3. Add npm script: `npm run cypress:test` that starts test API
4. Update Cypress baseUrl to use test environment
5. Add database seeding for test data
6. Document how to run tests vs development

### Files to Change
- `docker-compose.yml` - Add test API service
- `donation_tracker_frontend/package.json` - Add test scripts
- `donation_tracker_frontend/cypress.config.ts` - Add test environment config
- `donation_tracker_api/config/database.yml` - Verify test config
- `CLAUDE.md` - Document environment separation

### Benefits
- **Reliable tests**: No more data pollution
- **Faster development**: Can manually test without breaking CI
- **Better confidence**: Trust E2E test results
- **Professional practice**: Industry standard approach

### Related Issues
- TICKET-023: Donor filtering Cypress test failing due to data pollution
- Future tickets with E2E tests will benefit

### Notes
- This should have been set up from the beginning
- Critical for maintaining test reliability as project grows
- Will prevent future debugging sessions like TICKET-023
