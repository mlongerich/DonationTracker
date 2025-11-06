## [TICKET-024] Separate Test and Development Database Environments

**Status:** ✅ Complete (2025-11-06)
**Priority:** 🔴 High
**Dependencies:** None

### User Story
As a developer, I want separate database environments for Cypress E2E tests and local development so that manual testing doesn't pollute automated test data and cause flaky tests.

### Problem Statement
The test environment infrastructure exists but is **incorrectly configured**:
- **Cypress tests use wrong API**: Tests call `localhost:3001` (dev) instead of `localhost:3002` (test)
- **Profile system broken**: `api-e2e` service has `profiles: [e2e]` but no npm scripts activate it
- **Database name mismatch**: docker-compose uses `donation_tracker_test` but database.yml uses `donation_tracker_api_test`
- **Missing npm scripts**: No scripts to start test environment and run E2E tests
- **Inconsistent API URLs**: Some tests hardcode URLs, others use `Cypress.env('devApiUrl')`

### Current State Analysis ✅

**What's Already Implemented:**
- ✅ Test database configured in `database.yml` (`donation_tracker_api_test`)
- ✅ `api-e2e` Docker service on port 3002 with `RAILS_ENV=test` (docker-compose.yml:101-129)
- ✅ Cypress configured with `testApiUrl` env var (cypress.config.ts:8)
- ✅ Test cleanup endpoint exists (`DELETE /api/test/cleanup`)
- ✅ Database cleaner gem installed (`database_cleaner-active_record`)
- ✅ RSpec uses transactional fixtures and truncates tables before suite

**What's Broken:**
- ❌ Cypress tests call `http://localhost:3001` (dev API) instead of `http://localhost:3002` (test API)
- ❌ Database naming inconsistency: `donation_tracker_test` (docker) vs `donation_tracker_api_test` (Rails)
- ❌ `api-e2e` service requires `--profile e2e` flag but npm scripts don't use it
- ❌ No convenient way to start test environment and run Cypress
- ❌ Cleanup endpoint uses `devApiUrl` instead of `testApiUrl`

### Acceptance Criteria
- [x] Test database configured in `config/database.yml`
- [x] `api-e2e` Docker service on port 3002 with `RAILS_ENV=test`
- [x] Database names aligned between docker-compose and database.yml
- [x] Cypress tests use `testApiUrl` consistently (not `devApiUrl`)
- [x] npm scripts start test environment and run Cypress
- [x] Development database isolated from test runs
- [x] Documentation updated with test vs dev environment usage
- [x] Verification tests confirm environment isolation

### Implementation Plan

#### 1. Fix Database Name Alignment
**Problem:** docker-compose.yml uses `donation_tracker_test` but database.yml uses `donation_tracker_api_test`

**Solution:** Update docker-compose.yml to match Rails convention
```yaml
# docker-compose.yml:111
- DATABASE_URL=postgresql://postgres:password@postgres:5432/donation_tracker_api_test
```

#### 2. Add npm Scripts for E2E Environment
**Problem:** No convenient way to start test environment and run Cypress

**Solution:** Add scripts to `package.json`
```json
"cypress:e2e": "docker-compose --profile e2e up -d && cypress run && docker-compose --profile e2e down",
"cypress:e2e:open": "docker-compose --profile e2e up -d && cypress open"
```

#### 3. Update Cypress Config for Environment-Aware baseUrl
**Problem:** Cypress always uses `localhost:3000` which points to dev API

**Solution:** Update `cypress.config.ts` to use test API
```typescript
baseUrl: 'http://localhost:3000',
env: {
  apiUrl: 'http://localhost:3002', // Use test API by default
},
```

#### 4. Update All Cypress Tests to Use testApiUrl
**Problem:** Tests hardcode `localhost:3001` or use `Cypress.env('devApiUrl')`

**Solution:** Find/replace in all `.cy.ts` files
- `http://localhost:3001` → `${Cypress.env('testApiUrl')}`
- `Cypress.env('devApiUrl')` → `Cypress.env('testApiUrl')`

**Files to update:**
- `cypress/support/commands.ts` (cleanup command)
- `cypress/e2e/donation-filtering.cy.ts` (hardcoded URLs)
- Any other test files using dev API

#### 5. Update Documentation
**Problem:** No documentation on test vs dev environments

**Solution:** Add section to CLAUDE.md "Development Commands"
```markdown
### E2E Testing (Isolated Test Environment)
docker-compose --profile e2e up -d  # Start test API on port 3002
npm run cypress:e2e                 # Run E2E tests
npm run cypress:e2e:open            # Open Cypress UI
docker-compose --profile e2e down   # Stop test API
```

#### 6. Write Verification Tests
**Problem:** No tests to confirm environment isolation

**Solution:** Add test to verify dev and test databases are separate
- Create donor via dev API (port 3001)
- Verify donor does NOT appear in test API (port 3002)

### Files Changed
- [x] `docker-compose.yml` - Fix database name (line 111, 141)
- [x] `donation_tracker_frontend/package.json` - Add E2E scripts
- [x] `donation_tracker_frontend/cypress.config.ts` - Update default API URL
- [x] `donation_tracker_frontend/cypress/support/commands.ts` - Use testApiUrl
- [x] `donation_tracker_frontend/cypress/e2e/*.cy.ts` - Replace hardcoded URLs (6 files)
- [x] `CLAUDE.md` - Document E2E test environment usage
- [x] `donation_tracker_frontend/cypress/e2e/environment-isolation.cy.ts` - Verification test

### Implementation Summary

**Fixed Configuration (No Code Changes Required):**
- Test infrastructure was 80% complete but misconfigured
- Main issue: Cypress tests called dev API (port 3001) instead of test API (port 3002)

**Changes Made:**
1. **Database alignment**: Updated docker-compose.yml DATABASE_URL to match database.yml naming
2. **Cypress config**: Added default `apiUrl` pointing to test environment
3. **Test file updates**: Updated 6 Cypress test files to use `${Cypress.env('testApiUrl')}`
4. **npm scripts**: Added `cypress:e2e`, `cypress:e2e:open`, `cypress:e2e:down`
5. **Verification test**: Created `environment-isolation.cy.ts` to verify database separation
6. **Documentation**: Updated CLAUDE.md with E2E testing section

**Results:**
- ✅ All E2E tests pass with isolated test database
- ✅ Dev and test databases confirmed separate
- ✅ No more test data pollution in manual development workflow

### Benefits
- ✅ **Reliable tests**: Test data never pollutes dev database
- ✅ **Faster development**: Can manually test without breaking E2E tests
- ✅ **Better confidence**: E2E tests run in clean, isolated environment
- ✅ **Professional practice**: Industry standard approach

### Related Issues
- TICKET-023: Donor filtering Cypress test failing due to data pollution (RESOLVED by this ticket)
- TICKET-091: Admin CSV import GUI will need E2E tests (depends on this ticket)

### Notes
- Infrastructure was 80% complete but misconfigured
- Main issue: Cypress tests were calling dev API instead of test API
- Simple fix: Update URLs and database name alignment
