# Testing Methodology & Philosophy

*Comprehensive testing guidelines, workflows, and best practices for the Donation Tracker project*

---

## Test-Driven Development (TDD) - 2025 Enhanced Methodology

### Strict TDD Workflow (Single Test Rule)

1. **Red**: Write ONLY ONE failing test at a time
   - No multiple tests during red phase
   - Must fail for the right reason
   - Clear, descriptive test name (reads like plain English)

2. **Green**: Write minimal code to make ONLY that test pass
   - No over-engineering
   - Simplest possible implementation

3. **Refactor**: When ALL tests are passing, improve code OR tests
   - **Code Refactoring**: Check for code smells and design pattern opportunities
   - **Test Refactoring**: Improve clarity, remove duplication, better organization
   - **Functionality Preservation**: Must maintain all existing functionality during refactoring
   - **Convention Adherence**: Ensure established patterns are followed

4. **Repeat**: Continue with next single test

### One Expectation Rule

- Each test should make only ONE assertion
- Helps identify specific failures quickly
- Makes tests more readable and focused
- Example: Test validation separately from business logic

**Example:**
```ruby
# Bad: Multiple assertions in one test
it "validates donor attributes" do
  donor = Donor.new
  expect(donor).not_to be_valid
  expect(donor.errors[:name]).to include("can't be blank")
  expect(donor.errors[:email]).to include("can't be blank")
end

# Good: One assertion per test
it "requires a name" do
  donor = Donor.new(email: "test@example.com")
  expect(donor).not_to be_valid
end

it "includes error message for missing name" do
  donor = Donor.new(email: "test@example.com")
  donor.valid?
  expect(donor.errors[:name]).to include("can't be blank")
end

it "requires an email" do
  donor = Donor.new(name: "John Doe")
  expect(donor).not_to be_valid
end
```

---

## Test Verification: "Intentional Breaking" Technique

### The Problem

Tests that pass immediately without implementation may be false positives:
- Test might be broken and always pass (doesn't actually test anything)
- Test might be testing the wrong thing
- Provides false confidence in test suite

### The Solution

Verify tests fail for the RIGHT reason before trusting them.

### Workflow

1. **Write test** (RED phase expected)
2. **If test passes immediately** → VERIFY IT'S VALID:
   - Temporarily break the implementation intentionally
   - Example: Change `open={open}` to `open={false}`
   - Run test again
3. **Test should FAIL** with broken implementation ✅
   - If fails: Test is valid, catches the bug
   - If passes: Test is broken, rewrite it
4. **Restore correct implementation**
5. **Test should PASS** again ✅

### Example: Frontend Component Test

```tsx
// Test: "renders dialog when open is true"
it('renders dialog when open is true', () => {
  render(<Modal open={true} />);
  expect(screen.getByText(/title/i)).toBeInTheDocument();
});

// Step 1: Test passes immediately (suspicious!)
// Step 2: Intentionally break implementation
<Dialog open={false}>  // Changed from open={open}

// Step 3: Run test again
// ✅ Test FAILS - proves test is valid

// Step 4: Restore correct implementation
<Dialog open={open}>

// Step 5: Run test again
// ✅ Test PASSES - implementation is correct
```

### Example: Backend Model Test

```ruby
# Test: "validates email format"
it "rejects invalid email format" do
  donor = Donor.new(name: "John", email: "invalid-email")
  expect(donor).not_to be_valid
end

# Step 1: Test passes immediately
# Step 2: Temporarily remove validation
# validates :email, format: { with: URI::MailTo::EMAIL_REGEXP }  # Comment out

# Step 3: Run test again
# ✅ Test FAILS - proves test is checking validation

# Step 4: Restore validation
# validates :email, format: { with: URI::MailTo::EMAIL_REGEXP }

# Step 5: Run test again
# ✅ Test PASSES - validation is working
```

### When to Use

- Test passes immediately during RED phase
- Using existing components/libraries (MUI, React Router)
- Testing props/state that might have default behavior
- Any time you're uncertain if test is actually exercising code

### Benefits

- Catches false positive tests early
- Ensures tests will catch regressions
- Builds confidence in test suite quality
- Documents that tests were properly validated

---

## Bug Prevention Protocol

### Test-First Bug Fixes

**Rule:** Any bug found MUST have a test written FIRST

**Workflow:**
1. **Bug Discovery**: User reports issue or bug found during development
2. **Write Failing Test**: Create test that reproduces the bug
3. **Fix Implementation**: Write minimal code to make test pass
4. **Refactor**: Clean up code if needed
5. **Verify**: Ensure original bug is fixed and no regressions

**Example:**

```ruby
# Bug Report: Donor merge fails when primary donor is discarded

# Step 1: Write failing test
RSpec.describe DonorMergeService do
  it "raises error when primary donor is discarded" do
    primary = create(:donor, :discarded)
    duplicate = create(:donor)

    service = DonorMergeService.new(
      donor_ids: [primary.id, duplicate.id],
      field_selections: { name: primary.id }
    )

    expect { service.merge }.to raise_error(ArgumentError, /primary donor is archived/)
  end
end

# Step 2: Test fails (reproduces bug)
# Step 3: Fix implementation
def validate_inputs!
  # ... existing validations ...
  primary_donor = donors.first
  raise ArgumentError, "Primary donor is archived" if primary_donor.discarded?
end

# Step 4: Test passes
# Step 5: Bug cannot resurface in future
```

### Benefits

- **Regression Prevention**: Test ensures bug cannot resurface
- **Documentation**: Test documents the bug and fix
- **Confidence**: Future refactoring won't reintroduce the bug

---

## Backend Testing Stack

### Frameworks & Tools

| Tool | Purpose | Version |
|------|---------|---------|
| **RSpec** | Primary testing framework | Latest |
| **Factory Bot** | Test data generation | Latest |
| **Faker** | Realistic test data | Latest |
| **SimpleCov** | Coverage reporting | Latest |
| **Shoulda Matchers** | Clean model validations | Latest |
| **Database Cleaner** | Test isolation | Latest |
| **WebMock + VCR** | HTTP request mocking | Latest |

### Coverage Requirements

- **Minimum**: 90% code coverage
- **Target**: 95%+ coverage
- **Critical paths**: 100% coverage

### RSpec Testing Hierarchy

```ruby
# 1. Model Tests (most important)
RSpec.describe Donor, type: :model do
  describe "validations" do
    it "requires a name" do
      donor = Donor.new(email: "test@example.com")
      expect(donor).not_to be_valid
    end

    it "requires an email" do
      donor = Donor.new(name: "John Doe")
      expect(donor).not_to be_valid
    end

    it "validates email format" do
      donor = Donor.new(name: "John", email: "invalid")
      expect(donor).not_to be_valid
    end
  end

  describe "associations" do
    it "has many donations" do
      association = Donor.reflect_on_association(:donations)
      expect(association.macro).to eq(:has_many)
    end
  end
end

# 2. Request Tests (API endpoints)
RSpec.describe "/api/donors", type: :request do
  describe "POST /api/donors" do
    it "creates a donor with valid attributes" do
      post "/api/donors", params: {
        donor: { name: "John Doe", email: "john@example.com" }
      }
      expect(response).to have_http_status(:created)
    end

    it "returns error for invalid attributes" do
      post "/api/donors", params: { donor: { name: "" } }
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "GET /api/donors" do
    it "returns paginated donors" do
      create_list(:donor, 30)
      get "/api/donors", params: { page: 1 }

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json['donors'].size).to eq(25)  # Default per_page
      expect(json['meta']['total_count']).to eq(30)
    end
  end
end

# 3. Service Object Tests
RSpec.describe DonorMergeService do
  describe "#merge" do
    it "merges two donors successfully" do
      donor1 = create(:donor, name: "John Doe")
      donor2 = create(:donor, name: "Jane Doe")

      service = DonorMergeService.new(
        donor_ids: [donor1.id, donor2.id],
        field_selections: { name: donor1.id, email: donor2.id }
      )

      result = service.merge
      expect(result).to be_a(Donor)
      expect(Donor.kept.count).to eq(1)
    end
  end
end
```

### RSpec Best Practices

- **Descriptive Test Names**: Should read like plain English documentation
- **No Nested Scenarios**: Avoid complex setup, prefer focused individual tests
- **Factory Over Fixtures**: Use Factory Bot for maintainable test data
- **Integration Over Controller**: Focus on request specs rather than controller specs
- **Shared Examples**: Group common behavior testing patterns

---

## Frontend Testing Stack

### Frameworks & Tools

| Tool | Purpose | Version |
|------|---------|---------|
| **Jest** | Unit testing framework | v27.5.1 (via react-scripts) |
| **Vitest** | Modern testing alternative | v1.6.1 |
| **React Testing Library** | Component testing | v16.3.0 |
| **Cypress** | End-to-end testing | v13.17.0 |
| **MSW** | API mocking | v2.0.0 |

### Coverage Requirements

- **Unit Tests (Jest)**: 80% minimum
- **E2E Tests (Cypress)**: 100% of user flows
- **Critical Features**: MUST have both unit AND E2E tests

### Frontend TDD Workflow with Continuous E2E Validation

**CRITICAL: Every frontend change must follow this workflow to prevent late-stage rewrites**

1. 🔴 **RED**: Write failing Jest unit test
2. 🟢 **GREEN**: Write minimal code to pass Jest test
3. 🔵 **REFACTOR**: Improve code quality (Jest still passing)
4. 🧪 **RUN CYPRESS**: Immediately verify E2E test passes
5. 👁️ **MANUAL CHECK**: Visual browser verification
6. ✅ **COMPLETE**: Only then move to next feature/test

**If Cypress fails**: STOP and fix immediately. Do not continue with broken UX.

### Testing Commands

```bash
# Unit Tests (run first)
npm test                     # Jest unit tests (watch mode)
npm run test:coverage        # Jest with coverage report

# E2E Tests (run after unit tests pass)
npm run cypress:run          # Headless mode (CI-style)
npm run cypress:open         # Interactive mode (debugging)

# Alternative frameworks
npm run vitest               # Modern Vitest
npm run vitest:ui            # Vitest visual dashboard
```

### Jest Testing Patterns

```typescript
// 1. Component Unit Tests
describe('DonorForm', () => {
  it('submits form with valid data', async () => {
    const mockSubmit = jest.fn();
    render(<DonorForm onSubmit={mockSubmit} />);

    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(mockSubmit).toHaveBeenCalledWith({
      name: 'John Doe',
      email: 'john@example.com'
    });
  });

  it('displays validation error for empty name', async () => {
    render(<DonorForm onSubmit={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(screen.getByText(/name is required/i)).toBeInTheDocument();
  });
});

// 2. Integration Tests with MSW
import { setupServer } from 'msw/node';
import { rest } from 'msw';

const server = setupServer(
  rest.get('/api/donors', (req, res, ctx) => {
    return res(ctx.json({
      donors: [
        { id: 1, name: 'John Doe', email: 'john@example.com' }
      ],
      meta: { total_count: 1, current_page: 1 }
    }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('DonorList integration', () => {
  it('fetches and displays donors from API', async () => {
    render(<DonorList />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });
});
```

### Cypress E2E Testing Patterns

```typescript
// cypress/e2e/donors.cy.ts
describe('Donor Management', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/donors');
  });

  it('creates a new donor', () => {
    cy.get('input[name="name"]').type('John Doe');
    cy.get('input[name="email"]').type('john@example.com');
    cy.contains('button', 'Submit').click();

    // Verify donor appears in list
    cy.contains('John Doe').should('be.visible');
  });

  it('edits an existing donor', () => {
    // Assume donor exists
    cy.contains('John Doe').parent().find('button[aria-label="Edit"]').click();

    cy.get('input[name="name"]').clear().type('Jane Doe');
    cy.contains('button', 'Save').click();

    cy.contains('Jane Doe').should('be.visible');
    cy.contains('John Doe').should('not.exist');
  });

  it('archives a donor', () => {
    cy.contains('John Doe').parent().find('button[aria-label="Archive"]').click();

    // Confirm dialog
    cy.contains('button', 'Confirm').click();

    // Donor should disappear from list
    cy.contains('John Doe').should('not.exist');
  });

  it('navigates between pages', () => {
    cy.contains('a', 'Donations').click();
    cy.url().should('include', '/donations');

    cy.contains('a', 'Donors').click();
    cy.url().should('include', '/donors');
  });
});
```

### Testing Philosophy

- **Jest**: Fast feedback on logic/component behavior (with mocked APIs)
  - Tests component rendering
  - Tests user interactions
  - Tests state management
  - Mocks external dependencies

- **Cypress**: Real user validation (catches visual bugs, integration issues Jest mocks hide)
  - Tests complete user workflows
  - Tests real API integration
  - Tests navigation and routing
  - Visual regression testing

- **Every user-facing feature MUST have both** unit tests AND E2E tests

- **Run Cypress continuously**, not just before commits - prevents big surprises

### E2E Test Infrastructure

**Environment Isolation:**
- E2E tests run against isolated test API on port 3002
- Separate test database (`donation_tracker_api_test`)
- Development API remains on port 3001 (untouched during E2E runs)
- Frontend runs on port 3000 for both development and E2E tests

**Health Check & Startup Sequence:**
- Health endpoint: `GET /api/health` returns `{ "status": "ok", "timestamp": "..." }`
- Wait script: `scripts/wait-for-api.sh` polls health endpoint (30 attempts, 2s intervals)
- npm script sequence: `docker-compose up → wait-for-api.sh → cypress run → docker-compose down`
- API typically ready in 8-10 seconds (4-5 health check attempts)

**Timeout Configuration:**
- Test environment rack timeout: 30 seconds (increased from default 15s)
- Handles database-heavy cleanup operations (`DELETE /api/test/cleanup`)
- Prevents "socket hang up" errors during test suite runs

**Reliability:**
- Full suite: 58 tests across 15 spec files
- Expected pass rate: 100% (58/58 passing)
- No flakiness when infrastructure is properly configured
- Cleanup endpoint clears all test data between spec files

**Running E2E Tests:**
```bash
# Full suite (recommended)
npm run cypress:e2e

# Interactive mode (debugging)
npm run cypress:e2e:open

# Stop E2E environment
npm run cypress:e2e:down
```

**Troubleshooting:**
- If "socket hang up" errors occur: Verify health endpoint returns 200 OK
- If tests timeout: Check rack timeout is set to 30s in `config/environments/test.rb`
- If cleanup fails: Ensure test environment allows `DELETE /api/test/cleanup`
- If API won't start: Check Docker logs: `docker-compose logs api-e2e`

---

## Contract Testing - Deferred

### Status

Contract testing (Pact) has been deferred until a microservice architecture split is implemented.

### Rationale

- **Monorepo architecture**: Both frontend and backend are developed/deployed together
- **Comprehensive RSpec tests**: Complete API endpoint coverage with request specs
- **Cypress E2E tests**: Validate real frontend→backend integration
- **Single developer**: No need for independent service versioning

### Future Consideration

Reintroduce contract testing when services are:
- Managed by separate teams
- Deployed independently
- Require API compatibility verification across teams

---

## Test Requirements Checklist

### Backend Requirements

- [ ] All models have comprehensive validation tests
- [ ] All models have relationship tests
- [ ] All API endpoints have request/response tests
- [ ] All service objects have unit tests
- [ ] All edge cases covered
- [ ] 90% minimum code coverage
- [ ] No pending/skipped tests

### Frontend Requirements

- [ ] All user-facing components have Jest unit tests
- [ ] All user-facing features have Cypress E2E tests
- [ ] All critical user flows have E2E tests
- [ ] All form validations tested
- [ ] All API integrations tested
- [ ] 80% minimum Jest coverage
- [ ] 100% of user flows covered by Cypress

### Quality Gates

All tests must pass before:
- Committing code
- Creating pull requests
- Merging to main branch
- Deploying to production

---

## Code Smell Detection & Quality Analysis

### Automated Analysis Tools

| Tool | Purpose | Version |
|------|---------|---------|
| **Reek** | Code smell detection | v6.5.0 |
| **RubyCritic** | Quality reporting | v4.10.0 |
| **Skunk** | Cost metric calculation | v0.5.4 |
| **Bullet** | N+1 query detection | v8.0.8 |

### Usage Commands

```bash
# Check code smells in specific file
bundle exec reek app/models/donor.rb

# Generate quality report for directory
bundle exec rubycritic --no-browser app/models/

# Check cost metrics (requires SimpleCov data)
bundle exec skunk

# Check for N+1 queries (automatically in test suite)
bundle exec rspec  # Bullet runs during tests
```

### Quality Metrics

- **RubyCritic Score**: Maintain ≥95 (current: 100.0 ✅)
- **Reek**: No new code smells introduced
- **Skunk**: Cost should not increase significantly
- **Bullet**: Zero N+1 queries

### Refactoring Guidelines

1. **Identify High-Priority Areas**
   - Run `bundle exec skunk` to find high-complexity, low-coverage areas
   - Focus on files with worst cost metrics first

2. **Use Established Patterns**
   - Service Objects for complex business logic
   - Presenters for view-specific logic
   - Concerns for cross-cutting functionality

3. **Incremental Approach**
   - Make small, safe changes
   - Ensure all tests pass after each change
   - Commit frequently

4. **Test Coverage First**
   - Add tests before refactoring
   - Ensure 90%+ coverage on target code
   - Use tests as safety net

---

*Last updated: 2025-11-12*
