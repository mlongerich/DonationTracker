# Claude Development Conventions & Best Practices

*Guidelines for maintaining consistent development practices in the Donation Tracker project*

**Note:** This file is loaded at Claude Code startup and must be self-contained. Links to `/docs` provide optional deep-dives but are not required for daily development.

---

## 🏗️ Project Structure & Repository Strategy

### Monorepo with Service Separation

- **Single repository** containing both backend and frontend
- **Service-separated commits** for clear development history
- **Independent development** workflows per service
- **Atomic feature commits** when features span both services

### Directory Structure

Key locations:
- `donation_tracker_api/` - Rails API backend
- `donation_tracker_frontend/` - React frontend
- `tickets/` - Active work items (see tickets/README.md for template)
- `BACKLOG.md` - Future features
- `docs/` - Detailed documentation (optional reference)
- `scripts/` - Testing & validation tools

---

## 📋 Ticket & Task Management System

### Workflow

1. **New idea during work?** → Add to BACKLOG.md, run `/compact`
2. **Starting new work?** → Create ticket in tickets/TICKET-XXX-name.md
3. **Implementing?** → Follow TDD workflow
4. **Done?** → Update ticket, commit with ticket reference

### Ticket Template

```markdown
## [TICKET-XXX] Title

**Status:** 🔵 In Progress | ✅ Complete
**Priority:** 🔴 High | 🟡 Medium | 🟢 Low

### User Story
As a [user], I want [goal] so that [benefit].

### Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
```

---

## 📝 Commit Message Conventions

### Required Prefixes

- `backend:` - Rails API changes, models, controllers, gems
- `frontend:` - React components, TypeScript, styling
- `docker:` - Container configuration
- `docs:` - Documentation updates
- `feat:` - Cross-cutting features
- `fix:` - Bug fixes
- `chore:` - Maintenance tasks

### Format

```
<prefix>: <concise description>

- Detailed explanation
- Why this change was necessary
- Breaking changes or migration notes

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### ⚠️ MANDATORY PRE-COMMIT RULE

**ALWAYS update DonationTracking.md and CLAUDE.md before ANY commit**

---

## 🧪 Test-Driven Development (TDD)

### Strict TDD Workflow

1. **Red**: Write ONLY ONE failing test
   - Must fail for the right reason
   - Descriptive name (reads like plain English)
2. **Green**: Write minimal code to pass test
   - No over-engineering
3. **Refactor**: When ALL tests pass, improve code OR tests
4. **Repeat**

### One Expectation Rule

- Each test should make only ONE assertion
- Helps identify specific failures quickly
- Makes tests more readable

### Test Verification: "Intentional Breaking" Technique

**Problem:** Tests that pass immediately may be false positives (broken test, always passes).

**Solution:** Verify tests fail for the RIGHT reason before trusting them.

**Workflow:**

1. Write test (expect RED phase)
2. **If test passes immediately** → VERIFY IT'S VALID:
   - Temporarily break implementation (e.g., change `open={open}` to `open={false}`)
   - Run test again
3. **Test should FAIL** ✅ (proves test catches bugs)
4. **Restore implementation**
5. **Test should PASS** ✅ (implementation correct)

**When to use:**
- Test passes during RED phase
- Using existing libraries (MUI, React Router)
- Testing props/state with default behavior
- Uncertain if test exercises code

**Benefits:** Catches false positives early, ensures regression prevention

### Bug Prevention Protocol

- **Any bug found MUST have test written FIRST**
- Follow full TDD cycle for bug fixes
- Test ensures bug cannot resurface

### Test Requirements

- **All models**: Validation and relationship tests
- **All API endpoints**: Request/response tests
- **All user-facing features**: Unit tests AND E2E tests (Cypress)
- **Coverage**: 90% backend, 80% frontend (Jest), 100% user flows (Cypress)

**Testing Frameworks:**
- **Backend**: RSpec, Factory Bot, Faker, SimpleCov, Shoulda Matchers
- **Frontend**: Jest, Vitest, React Testing Library, Cypress, MSW

**Commands:**
```bash
# Backend
docker-compose exec api bundle exec rspec

# Frontend Unit
docker-compose exec frontend npm test

# Frontend E2E
docker-compose exec frontend npm run cypress:run
```

---

## 🎯 Thin Vertical Slice Development

### Core Principle

**Build complete features one at a time through all layers** (model → API → frontend) rather than all models first, then all APIs, etc.

### Each Slice Includes

1. **Model**: Domain object with validations
2. **API Layer**: RESTful endpoint
3. **Frontend**: React component
4. **Tests**: Unit and integration tests at each layer
5. **Documentation**: Update DonationTracking.md and CLAUDE.md

### Slice Selection

**Prioritize:**
- Immediate business value
- Minimal dependencies
- Can complete in 1-3 days
- Builds incrementally

---

## 🐳 Containerization

### Development Environment

```bash
# Start all services
docker-compose up

# Service access
docker-compose exec api bash      # Rails console
docker-compose exec frontend sh   # React debugging
```

### Service Ports

- PostgreSQL: 5432
- Redis: 6379
- Rails API: 3001
- React Frontend: 3000

### Colima Resource Requirements (macOS)

```bash
colima start --cpu 4 --memory 6 --disk 100
```

**Minimum:** 6GB RAM, 4 CPUs (default 2GB/2CPU insufficient)

---

## 🎯 Code Quality Standards

### Backend (Rails)

- **RuboCop**: Style guide enforcement
- **Brakeman**: Security scanning
- **Bullet**: N+1 query detection
- **No comments**: Self-documenting code
- **Convention**: Follow Rails patterns

#### Global Error Handling

**ApplicationController** provides global exception handlers for consistent error responses:

```ruby
# app/controllers/application_controller.rb
class ApplicationController < ActionController::API
  rescue_from ActiveRecord::RecordNotFound, with: :render_not_found
  rescue_from ActiveRecord::RecordInvalid, with: :render_unprocessable_entity
  rescue_from ActionController::ParameterMissing, with: :render_bad_request

  # Returns { error: "message" } with 404
  # Returns { errors: [...] } with 422
  # Returns { error: "message" } with 400
end
```

**Controller Pattern (use save!/update!/find):**

```ruby
# Use save! instead of if/else
def create
  child = Child.new(child_params)
  child.save!  # Raises RecordInvalid if validation fails
  render json: { child: ChildPresenter.new(child).as_json }, status: :created
end

# Use update! instead of if/else
def update
  child = Child.find(params[:id])  # Raises RecordNotFound if not found
  child.update!(child_params)  # Raises RecordInvalid if validation fails
  render json: { child: ChildPresenter.new(child).as_json }
end
```

**Benefits:**
- ✅ Controllers focus on happy path (no if/else blocks)
- ✅ Consistent error format across all endpoints
- ✅ Proper HTTP status codes (404, 422, 400 instead of 500)
- ✅ Global handlers catch exceptions automatically

**See:** TICKET-068 (Global Error Handling)

#### Service Object Patterns

**Class Methods (Stateless, Simple):**
```ruby
class DonorService
  def self.find_or_update_by_email(attributes, timestamp)
    # Simple stateless logic
  end
end
```

**Instance Methods (Stateful, Complex):**
```ruby
class DonorMergeService
  def initialize(donor_ids:, field_selections:)
    @donor_ids = donor_ids
    @field_selections = field_selections
  end

  def merge
    validate_inputs!
    load_donors
    perform_merge_transaction
  end

  private

  def validate_inputs!
    # Extract validation logic
  end

  def perform_merge_transaction
    # Extract transaction logic
  end
end
```

**When to use:**
- **Class methods**: Simple, stateless operations
- **Instance methods**: Multi-step workflows, complex validation, state tracking

#### Stripe CSV Import Pattern

**Pattern:** StripePaymentImportService handles CSV import with `stripe_invoices` abstraction for 1-to-many relationships.

**Key Insights:**
- Multi-child sponsorships share same invoice ID but different children
- Idempotency: Check via sponsorship relationship, NOT child_id (virtual attribute)
- Transaction-wrapped for data integrity

**See:** docs/PATTERNS.md for full schema design and implementation details (TICKET-070)

#### Stripe CSV Batch Import Pattern (TICKET-071)

**Temporary code** until TICKET-026 webhooks complete. Maps CSV description text to projects using 10-step pattern matching (general, campaign, invoices, named items).

**Key Insight:** Generic descriptions (phone numbers, "Subscription creation") → "General Donation" system project.

**See:** docs/PATTERNS.md for full pattern order and implementation (TICKET-071)

#### Controller Concerns

**When to extract:**
- Logic duplicated in 2+ controllers
- Cross-cutting functionality (pagination, filtering)
- Would reduce duplication by 20+ lines

**Implemented Concerns:**
- `PaginationConcern` - Kaminari pagination (default 25/page)
  - `paginate_collection(collection)`
  - `pagination_meta(paginated_collection)`
- `RansackFilterable` - Query building
  - `apply_ransack_filters(scope)`

**Usage:**
```ruby
class Api::DonorsController < ApplicationController
  include PaginationConcern
  include RansackFilterable

  def index
    scope = Donor.all
    filtered = apply_ransack_filters(scope)
    donors = paginate_collection(filtered.order(name: :asc))
    render json: { donors: donors, meta: pagination_meta(donors) }
  end
end
```

#### Presenter Pattern

**Purpose:** Extract view-specific logic from models/controllers

**Pattern:**
```ruby
class DonationPresenter < BasePresenter
  def as_json(options = {})
    {
      id: object.id,
      amount: object.amount,
      donor_name: object.donor&.name,  # Computed field
      # ... other fields
    }
  end
end

# Usage in controller
CollectionPresenter.new(donations, DonationPresenter).as_json
```

**When to use:** Complex JSON structures, computed fields, multiple model aggregation

#### Database Indexing Strategy

**Index Guidelines:**
- Index columns in WHERE clauses (filtering)
- Index columns in ORDER BY (sorting)
- Index foreign keys for JOINs
- Use composite indexes for multi-column queries

**When to Add:**
1. Column in WHERE clause with >1000 rows
2. Column in ORDER BY frequently
3. Foreign keys (Rails doesn't auto-index!)
4. Uniqueness validation queries

**Naming:**
- Single: `index_table_on_column`
- Composite: `index_table_on_column1_and_column2`

**Monitoring:** Use Bullet gem, `EXPLAIN` queries, `pg_stat_user_indexes`

#### Data Retention & Cascade Delete

**Policy:** Prevent accidental data loss

**Pattern (Applied to Donor, Child, Project models):**
```ruby
class Donor < ApplicationRecord
  include Discard::Model  # Soft delete support

  has_many :donations, dependent: :restrict_with_exception
  has_many :sponsorships, dependent: :restrict_with_exception

  def can_be_deleted?
    donations.empty? && sponsorships.empty?
  end
end

class Project < ApplicationRecord
  has_many :donations, dependent: :restrict_with_exception
  has_many :sponsorships, dependent: :restrict_with_exception

  def can_be_deleted?
    !system? && donations.empty? && sponsorships.empty?
  end
end
```

**Implementation Details:**
- **Soft Delete (Archive)**: Donor is marked as discarded (`discarded_at` timestamp), all associations preserved
- **Hard Delete (Permanent)**: Prevented if any donations or sponsorships exist (raises `DeleteRestrictionError`)
- **Rails 8**: Use `dependent: :restrict_with_exception` (not `restrict_with_error`)
- **Frontend Integration**: API returns `can_be_deleted` field via Presenter

**See:** TICKET-062 (Donor), TICKET-038 (Project), TICKET-049 (Child)

### Frontend (React)

- **ESLint**: React, accessibility, TypeScript rules
- **Prettier**: Code formatting
- **TypeScript**: Strict mode
- **Mobile-first**: Responsive components
- **Axios**: Standardized API client

#### Error Boundary Pattern

**Purpose:** Catch React component errors and display user-friendly error UI instead of blank screen

**Implementation:**
```tsx
// src/index.tsx - Root level wrapper
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

**Features:**
- Catches render errors, lifecycle errors, constructor errors
- Shows user-friendly error message with "Try Again" and "Reload Page" buttons
- Displays error details (stack trace) in development mode only
- Hides technical details in production
- Supports custom fallback UI via `fallback` prop
- Logs errors to console (ready for Sentry/LogRocket integration)

**Limitations (use try-catch for these):**
- Event handlers (use try-catch)
- Asynchronous code (use .catch())
- Server-side rendering errors
- Errors in ErrorBoundary itself

**Granular Error Boundaries (optional):**
```tsx
// Page-level for better isolation
<ErrorBoundary fallback={<CustomErrorMessage />}>
  <DonorsPage />
</ErrorBoundary>
```

**Manual Testing:**
```tsx
// Temporarily add to any page
import ErrorTrigger from '../components/ErrorTrigger';

<ErrorTrigger />  // Click button to test ErrorBoundary
```

**See:** TICKET-036 for full implementation details

#### TypeScript Type Organization

**Central Type Definitions:**
- All shared types in `src/types/`
- Barrel export pattern (`src/types/index.ts`)
- Organize by domain: `donor.ts`, `donation.ts`, `project.ts`, `pagination.ts`

**Best Practices:**
- Never duplicate type definitions
- Import from `'../types'` using barrel export
- Use `interface` for object shapes
- Use `type` for unions/primitives
- Add JSDoc comments

**Example:**
```typescript
// src/types/donor.ts
export interface Donor {
  id: number;
  name: string;
  email: string;
  discarded_at?: string | null;
}

// src/components/DonorForm.tsx
import { Donor } from '../types';
```

**Type Files:**
- `src/types/donor.ts` - Donor, DonorFormData, DonorMergeResult
- `src/types/donation.ts` - Donation, DonationFormData
- `src/types/project.ts` - Project, ProjectType, ProjectFormData
- `src/types/pagination.ts` - PaginationMeta, PaginatedResponse
- `src/types/api.ts` - API response types
- `src/types/index.ts` - Barrel export

#### Shared Component Pattern

**When to Extract:**
- Logic duplicated in 2+ components
- Clear, well-defined interface
- Consistent behavior across usages
- Reduces duplication by 50+ lines

**TDD Approach:**
1. Write tests first (strict TDD)
2. Minimal implementation
3. Refactor duplicates in existing components
4. Verify integration

**Example:** DonorAutocomplete
- Extracted from: DonationForm, DonationList
- Features: Debounced search, loading states, configurable
- Interface: `value`, `onChange`, `label`, `size`, `required`

```tsx
<DonorAutocomplete
  value={selectedDonor}
  onChange={setSelectedDonor}
  size="small"
  required
/>
```

#### MUI Component Sizing

**Standard:** All form inputs use `size="small"` (40px height vs 56px default)

**Applies to:** TextField, Autocomplete, DatePicker, Select

```tsx
<TextField label="Name" size="small" />
<DonorAutocomplete value={donor} onChange={setDonor} size="small" />
```

**See:** TICKET-025

#### Form Component Pattern

**Standard:** All form components follow consistent UX patterns for maintainability

**Button Configuration:**
- **No Cancel button** - Forms embedded in pages (user can navigate away naturally)
- **Submit button:** Full-width, primary color (`variant="contained" color="primary" fullWidth`)
- **Placement:** Bottom of form

**Example (ChildForm, DonationForm):**
```tsx
<Box component="form" onSubmit={handleSubmit}>
  {/* Form fields */}
  <TextField label="Name" size="small" fullWidth required />

  {/* Submit button */}
  <Button type="submit" variant="contained" color="primary" fullWidth>
    {initialData ? 'Update' : 'Create'}
  </Button>
</Box>
```

**Props:**
- `onSubmit: (data: FormData) => Promise<void>` - Required
- `initialData?: FormData` - Optional (edit mode if provided)
- ~~`onCancel`~~ - Removed (not needed for embedded forms)

**Rationale:**
- Embedded forms don't need Cancel (user navigates away via page links)
- Full-width Submit button is more prominent and mobile-friendly
- Consistent across DonationForm, ChildForm, ProjectForm

**See:** TICKET-050 (ChildForm consistency improvements)

#### Custom Hooks Library

**When to Create:**
- Logic duplicated in 2+ components, complex stateful logic, reduces 20+ lines

**Implemented:** `useDebouncedValue`, `usePagination`, `useRansackFilters`, `useChildren`

**Location:** `src/hooks/` with barrel export

**See:** docs/PATTERNS.md for full API and code examples (TICKET-032, TICKET-066)

#### Currency Utilities (DRY Pattern)

**Purpose:** Single source of truth for currency conversion between cents (database) and dollars (display)

**Why Cents?**
- Industry standard (Stripe, PayPal, all payment processors)
- Avoids floating-point precision errors
- Integer math is accurate (no $10.999 issues)
- Future-proof for Stripe webhooks (send cents)

**Implementation:**
```typescript
// src/utils/currency.ts
export const formatCurrency = (cents: number): string => {
  return `$${(cents / 100).toFixed(2)}`;
};

export const parseCurrency = (dollars: string | number): number => {
  return Math.round(parseFloat(String(dollars)) * 100);
};
```

**Usage:**
```typescript
// Forms (input: dollars → output: cents)
import { parseCurrency } from '../utils/currency';
await createDonation({
  amount: parseCurrency(amount), // "100" → 10000 cents
});

// Display (input: cents → output: formatted string)
import { formatCurrency } from '../utils/currency';
<Typography>{formatCurrency(donation.amount)}</Typography> // 10000 → "$100.00"
```

**Files using parseCurrency:**
- DonationForm.tsx (line 57)
- SponsorshipForm.tsx (line 33)

**Files using formatCurrency:**
- DonationList.tsx (line 190)
- ChildList.tsx (line 57)
- SponsorshipList.tsx (line 43)

**Tests:** 4 passing tests in `currency.test.ts`

**See:** TICKET-071 (currency standardization)

#### React Router Multi-Page Architecture

**Pattern:** App.tsx (router) → Layout (Outlet) → Pages (state)

**Best Practices:**
- Keep App.tsx minimal, page-level state, index route redirects, E2E tests for all routes

**See:** docs/PATTERNS.md for file structure and full code examples

### Pre-commit Requirements

**Before committing:**

1. **Documentation Update Rule**: Update DonationTracking.md and CLAUDE.md
2. All tests pass (`bundle exec rspec`, `npm test`)
3. Linting passes (RuboCop, ESLint)
4. Security passes (Brakeman)
5. Coverage meets thresholds (90% backend, 80% frontend)
6. Code smell analysis (Reek)
7. Quality metrics (RubyCritic ≥95)

#### Native Git Hooks (No Stashing!)

**Key Features:** No stashing (prevents data loss), automatic backups in `.git/backups/`, recovery tool

**Install:** `bash scripts/install-native-hooks.sh`
**Recover:** `bash scripts/recover-backup.sh`

**See:** docs/PATTERNS.md for full backup system details

---

## 🚀 Development Workflow

### Feature Development (Vertical Slice)

1. **Plan**: Select next slice (business value, minimal dependencies)
2. **TDD Model**: Write failing tests, minimal code
3. **TDD API**: Write failing tests, minimal endpoint
4. **TDD Frontend**: Write failing tests, minimal component
5. **Integration**: E2E testing across layers
6. **Documentation**: Update DonationTracking.md and CLAUDE.md
7. **Demo**: Show feature, gather feedback

### Branch Strategy

- **main/master**: Production-ready
- **feature/name**: Development branches
- **Direct commits**: OK for single-developer
- **Service separation**: Maintain in commits

---

## 📚 Development Commands

### Backend

```bash
docker-compose exec api rails console
docker-compose exec api bundle exec rspec
docker-compose exec api bundle exec rubocop
docker-compose exec api bundle exec reek app/
docker-compose exec api bundle exec rubycritic --no-browser app/
docker-compose exec api bundle exec skunk
```

### Frontend

```bash
docker-compose exec frontend npm test
docker-compose exec frontend npm run vitest
docker-compose exec frontend npm run vitest:ui
docker-compose exec frontend npm run cypress:run
docker-compose exec frontend npm run cypress:open
docker-compose exec frontend npm run lint
```

### Pre-commit Scripts

```bash
bash scripts/check-documentation.sh           # Documentation reminder
bash scripts/pre-commit-backend.sh           # RuboCop + Brakeman + RSpec
bash scripts/pre-commit-frontend.sh          # ESLint + Prettier + TypeScript + Jest
bash scripts/install-native-hooks.sh         # Install hooks
bash scripts/recover-backup.sh               # View/restore backups
```

---

## 🎨 UI/UX Guidelines

### Design Principles

- **Mobile-first**: Design for small screens first
- **Accessibility**: WCAG 2.1 AA compliance
- **Performance**: Optimize for slow connections
- **Usability**: Clear navigation, error messaging

### Component Standards

- All components responsive
- Semantic HTML elements
- Proper ARIA labels
- Screen reader testing

---

## 🔒 Security Requirements

### Backend Security

- Input validation on all endpoints
- SQL injection prevention (parameterized queries)
- XSS protection headers
- Rate limiting
- **Never commit master.key or credentials**

### Frontend Security

- Sanitize user inputs
- Secure API token storage
- HTTPS enforcement
- Content Security Policy headers

### Key Management

- **Rails master.key**: Local only, never in version control
- **Environment variables**: Deployment-specific secrets
- **Git history**: Audit for accidentally committed secrets

---

## 📊 Monitoring & Debugging

### Logging Standards

- Structured logging (JSON)
- Log levels: DEBUG, INFO, WARN, ERROR
- No sensitive data in logs

### Performance Monitoring

- Database queries (Bullet gem)
- API response times
- Frontend bundle sizes
- Container resource usage

---

## 🎯 Token Usage Optimization

*For efficient Claude Code interactions*

### Response Verbosity

- Minimal explanations unless requested
- Skip preambles ("Sure, I'll help...")
- Confirm completion in 1 sentence max
- Explain "why" only when asked/critical

### Tool Usage

- Batch related operations
- Avoid re-reading files already in context
- Use targeted grep/glob vs reading full files
- Run tests only when asked or after changes

---

## 📖 Detailed Documentation

**Optional deep-dives** (Claude can read these when needed, but CLAUDE.md is self-contained):

### docs/ARCHITECTURE.md
- Project structure diagrams (Mermaid)
- Ticket management workflow
- TDD workflow visualization
- Vertical slice diagram
- Pre-commit hooks flow
- Service architecture

### docs/PATTERNS.md
- Full service object code examples
- Controller concerns implementations
- Presenter pattern details
- Complete React Router examples
- Shared component extraction guide
- Cascade delete policy details

### docs/TESTING.md
- Testing framework setup
- Backend testing stack details
- Frontend testing stack details
- Code smell detection tools
- Design pattern registry
- Test refactoring guidelines

### docs/DOCKER.md
- Container configuration
- Colima setup details
- Troubleshooting guides
- Common issues/solutions

### docs/CLAUDE-BEST-PRACTICES.md
- Token optimization strategies
- CLAUDE.md maintenance guidelines
- Context management tools
- File size best practices

### docs/project/
- data-models.md - Database schema, current indexes
- tech-stack.md - Framework versions
- api-endpoints.md - API documentation
- roadmap.md - Feature planning

---

## 🔄 Deployment Considerations

### Production Readiness Checklist

- [ ] All tests passing
- [ ] Security audit completed
- [ ] Environment variables configured
- [ ] Database migrations tested
- [ ] SSL certificates configured
- [ ] Backup strategy implemented
- [ ] Monitoring systems active

---

*This document is updated as practices evolve*
*Last updated: 2025-11-04*
*Target: 700-800 lines for optimal Claude Code performance (self-contained essentials)*
