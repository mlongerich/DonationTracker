## [TICKET-108] Fix E2E Test Infrastructure Flakiness

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Effort:** M (Medium - 3-4 hours)
**Created:** 2025-11-12
**Dependencies:** None

### User Story
As a developer, I want E2E tests to run reliably in full suite mode so that CI/CD pipelines don't have false failures and we can trust test results.

### Problem Statement
E2E tests pass consistently when run individually but fail intermittently when run as a full suite (15 specs). This indicates infrastructure-level timing issues, not test logic problems.

**Symptoms:**
- `children-sponsorship.cy.ts`: beforeEach hook fails with "socket hang up" on `DELETE /api/test/cleanup`
- `donation-filtering.cy.ts`: Random test timeouts during full suite run
- Both specs pass 100% when run individually

**Impact:**
- False negatives in CI/CD
- Developer time wasted investigating "failures" that aren't real
- Reduced confidence in E2E test suite

### Root Causes

#### 1. API Server Readiness
Docker container may not be fully ready when Cypress starts hitting endpoints between specs.

#### 2. Database Cleanup Timing
`/api/test/cleanup` endpoint may timeout when multiple specs try to clean database in quick succession.

#### 3. Resource Contention
Running 15 specs sequentially may exhaust Docker resources (connections, memory).

#### 4. Race Conditions
State leakage between specs when cleanup doesn't complete before next spec starts.

### Acceptance Criteria

- [ ] Full E2E suite runs reliably (3+ consecutive successful runs)
- [ ] No "socket hang up" errors on cleanup endpoint
- [ ] Tests pass at same rate individually and in suite (95%+ pass rate)
- [ ] Add health check for E2E API server before Cypress starts
- [ ] Increase cleanup endpoint timeout if needed
- [ ] Document E2E infrastructure requirements

### Technical Approach

#### Option 1: Sequential Spec Execution (Quick Fix)
Force Cypress to run specs one at a time to reduce resource contention.

```json
// cypress.config.ts
{
  "experimentalMemoryManagement": true,
  "numTestsKeptInMemory": 0
}
```

Run with: `cypress run --config numTestsKeptInMemory=0`

**Pros:** Simple, immediate fix
**Cons:** Slower test runs (~4-5min total)

#### Option 2: API Health Check (Better Fix)
Add health check before Cypress starts to ensure E2E API is ready.

```bash
# package.json
"cypress:e2e": "cd .. && docker-compose --profile e2e up -d && ./scripts/wait-for-api.sh && cd donation_tracker_frontend && cypress run"
```

```bash
# scripts/wait-for-api.sh
#!/bin/bash
echo "Waiting for E2E API..."
for i in {1..30}; do
  if curl -f http://localhost:3002/api/health > /dev/null 2>&1; then
    echo "E2E API ready!"
    exit 0
  fi
  echo "Attempt $i/30 failed, retrying..."
  sleep 2
done
echo "E2E API failed to start"
exit 1
```

**Pros:** Proper solution, ensures API readiness
**Cons:** Requires backend health endpoint

#### Option 3: Increase Cleanup Timeout (Complementary)
Increase timeout for cleanup endpoint to handle load.

```ruby
# donation_tracker_api/config/environments/e2e.rb
# Rack timeout for long-running cleanup operations
config.rack_timeout.service_timeout = 30 # seconds (default is 15)
```

**Pros:** Handles database-heavy cleanup operations
**Cons:** Masks underlying performance issues

### Recommended Solution

**Combine Options 2 + 3:**
1. Add health check endpoint: `GET /api/health` (returns 200 when Rails ready)
2. Add `wait-for-api.sh` script to ensure API readiness
3. Increase cleanup timeout to 30s in E2E environment
4. Document infrastructure requirements in `docs/TESTING.md`

### Implementation Steps

#### 1. Add Health Endpoint (Backend)
```ruby
# donation_tracker_api/config/routes.rb
get '/api/health', to: 'health#index'

# donation_tracker_api/app/controllers/health_controller.rb
class HealthController < ApplicationController
  def index
    render json: { status: 'ok', timestamp: Time.current }
  end
end
```

#### 2. Create Wait Script
```bash
#!/bin/bash
# scripts/wait-for-api.sh
API_URL="${E2E_API_URL:-http://localhost:3002}"
MAX_ATTEMPTS=30
SLEEP_SECONDS=2

echo "Waiting for E2E API at $API_URL/api/health..."
for i in $(seq 1 $MAX_ATTEMPTS); do
  if curl -sf "$API_URL/api/health" > /dev/null; then
    echo "✅ E2E API ready (attempt $i/$MAX_ATTEMPTS)"
    exit 0
  fi
  echo "⏳ Attempt $i/$MAX_ATTEMPTS failed, retrying in ${SLEEP_SECONDS}s..."
  sleep $SLEEP_SECONDS
done

echo "❌ E2E API failed to start after $MAX_ATTEMPTS attempts"
exit 1
```

#### 3. Update npm Script
```json
// donation_tracker_frontend/package.json
{
  "scripts": {
    "cypress:e2e": "cd .. && docker-compose --profile e2e up -d && bash scripts/wait-for-api.sh && cd donation_tracker_frontend && cypress run; EXIT_CODE=$?; cd .. && docker-compose --profile e2e down && exit $EXIT_CODE"
  }
}
```

#### 4. Increase Cleanup Timeout
```ruby
# donation_tracker_api/config/environments/e2e.rb
Rails.application.configure do
  # ... existing config ...

  # Increase timeout for cleanup operations
  config.rack_timeout = 30 if defined?(Rack::Timeout)
end
```

#### 5. Document Requirements
Add to `docs/TESTING.md`:
- E2E API must respond to `/api/health` before tests start
- Cleanup endpoint has 30s timeout for database operations
- Docker Compose profile `e2e` runs isolated API on port 3002

### Testing Strategy

```bash
# Test 1: Run full suite 3 times consecutively
npm run cypress:e2e
npm run cypress:e2e
npm run cypress:e2e

# Expected: All 3 runs pass (58/58 tests passing)

# Test 2: Run problematic specs individually
npx cypress run --spec "cypress/e2e/children-sponsorship.cy.ts"
npx cypress run --spec "cypress/e2e/donation-filtering.cy.ts"

# Expected: Both pass (17/17 tests total)

# Test 3: Verify health check
curl http://localhost:3002/api/health
# Expected: {"status":"ok","timestamp":"2025-11-12T..."}
```

### Files to Create

**Backend:**
- `donation_tracker_api/app/controllers/health_controller.rb`

**Scripts:**
- `scripts/wait-for-api.sh` (make executable: `chmod +x`)

**Documentation:**
- Update `docs/TESTING.md` (E2E infrastructure section)

### Files to Modify

**Backend:**
- `donation_tracker_api/config/routes.rb` (add health endpoint)
- `donation_tracker_api/config/environments/e2e.rb` (increase timeout)

**Frontend:**
- `donation_tracker_frontend/package.json` (update cypress:e2e script)

### Expected Results

**Before Fix:**
- Full suite: 47/58 passing (81%)
- Individual runs: 58/58 passing (100%)
- Flakiness: 2 specs fail intermittently

**After Fix:**
- Full suite: 58/58 passing (100%)
- Individual runs: 58/58 passing (100%)
- Flakiness: Eliminated

### Related Tickets

- Identified during TICKET-097 (ESLint exhaustive-deps fix)
- Documented in `docs/FLAKY_TESTS.md` (2025-11-12 entry)

### Notes

- This is infrastructure-level flakiness, not test logic issues
- Both failing specs pass consistently when run individually
- Health check pattern is industry standard for E2E test reliability
- Consider adding metrics/logging to cleanup endpoint for future debugging
