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
- `docs/BACKLOG.md` - Future features
- `docs/` - Detailed documentation (optional reference)
- `scripts/` - Testing & validation tools

---

## 📋 Ticket & Task Management System

### Workflow

1. **New idea during work?** → Add to docs/BACKLOG.md, run `/compact`
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

**ALWAYS update docs/DonationTracking.md and CLAUDE.md before ANY commit**

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
- **Backend**: RSpec, Factory Bot, SimpleCov
- **Frontend**: Jest, React Testing Library, Cypress

#### E2E Test Infrastructure

**Environment Isolation:**
- E2E tests run against isolated API on port 3002 (test environment)
- Separate test database prevents contamination of development data
- Health check endpoint: `GET /api/health` ensures API readiness before tests start

**Reliability Features:**
- Wait script (`scripts/wait-for-api.sh`) polls health endpoint before Cypress runs
- Increased rack timeout (30s) for database-heavy cleanup operations
- npm script: `npm run cypress:e2e` handles full lifecycle (start → wait → test → cleanup)
- Expected pass rate: 100% (58/58 tests) with no flakiness

**See:** docs/TESTING.md for detailed E2E infrastructure documentation

---

## 🎯 Thin Vertical Slice Development

### Core Principle

**Build complete features one at a time through all layers** (model → API → frontend) rather than all models first, then all APIs, etc.

### Each Slice Includes

1. **Model**: Domain object with validations
2. **API Layer**: RESTful endpoint
3. **Frontend**: React component
4. **Tests**: Unit and integration tests at each layer
5. **Documentation**: Update docs/DonationTracking.md and CLAUDE.md

### Slice Selection

**Prioritize:**
- Immediate business value
- Minimal dependencies
- Can complete in 1-3 days
- Builds incrementally

---

## 🐳 Containerization

**Development Environment:** Docker + Docker Compose

**See:** docs/project/tech-stack.md for ports, Colima setup, and development commands

---

## 🎯 Code Quality Standards

### Backend (Rails)

- **RuboCop**: Style guide enforcement, **Brakeman**: Security scanning, **Bullet**: N+1 query detection
  - **Word Arrays**: Prefer `%w[]` syntax over `[""]` for arrays of simple strings (Style/WordArray)
  - Example: `%w[donations sponsorships]` not `["donations", "sponsorships"]`
  - Enforced incrementally (RuboCop catches violations as files are edited)
- **Class documentation**: YARD-style comments required (purpose, responsibilities, usage, @see tags)
- **Convention**: Follow Rails patterns

#### Class Documentation Standards

**All classes and modules require documentation comments** to improve maintainability and onboarding.

**Required Elements:**
1. **Purpose**: One-sentence description of what the class does
2. **Responsibilities**: Key features/capabilities (if complex)
3. **Usage Example**: Simple `@example` block with realistic code
4. **Related Classes**: `@see` tags for discoverability

**Format (YARD style):**
```ruby
# frozen_string_literal: true

# Handles CRUD operations for donors via REST API endpoints.
#
# This controller provides:
# - Index endpoint with pagination and filtering (Ransack)
# - Create endpoint with validation and smart email matching
# - Show, Update, Delete endpoints with soft-delete support
#
# All responses use DonorPresenter for consistent JSON formatting.
#
# @example Create a new donor
#   POST /api/donors
#   { "donor": { "name": "John Doe", "email": "john@example.com" } }
#
# @see DonorPresenter for response format
# @see DonorService for email matching logic
# @see PaginationConcern for pagination helpers
module Api
  class DonorsController < ApplicationController
    # ...
  end
end
```

**Best Practices:** Present tense, concise, update with changes, add `@see` tags

**Applies to:** Controllers, Models, Services, Presenters, Concerns, Jobs/Mailers

**See:** TICKET-042

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

**Benefits:** Happy path focus, consistent errors, proper HTTP codes

**Implementation Status:** ✅ All controllers now follow this pattern (TICKET-068, TICKET-094)

**See:** TICKET-068 (pattern established), TICKET-094 (SponsorshipsController fixed)

#### Service Object Patterns

**ALL services use instance methods for consistency (TICKET-037).**

**Instance Pattern (Standard):**
```ruby
# Example: DonorService (130 lines, 10+ private methods)
class DonorService
  def initialize(donor_attributes:, transaction_date:, stripe_customer_id: nil)
    @donor_attributes = donor_attributes
    @transaction_date = transaction_date
    @stripe_customer_id = stripe_customer_id
    @lookup_email = nil
    @existing_donor = nil
  end

  def find_or_update
    if stripe_customer_id_lookup_possible?
      find_by_stripe_customer_id_or_email
    else
      find_by_email
    end
  end

  private

  def stripe_customer_id_lookup_possible?
    stripe_customer_id.present?
  end

  def find_by_email
    normalize_email
    find_existing_donor
    create_or_update_donor
  end

  def normalize_email
    @lookup_email = donor_attributes[:email].presence || generate_anonymous_email
  end

  # ... additional private methods for each step
end

# Usage:
service = DonorService.new(
  donor_attributes: { name: "John", email: "john@example.com" },
  transaction_date: Time.current,
  stripe_customer_id: "cus_123" # optional
)
result = service.find_or_update
# => { donor: <Donor>, created: true }
```

**When to use instance pattern:**
- Multi-step workflows (2+ steps)
- Internal state tracking (instance variables)
- Private helper methods needed (3+)
- Complex conditional logic
- Multiple responsibilities

#### Stripe CSV Import Patterns

**StripePaymentImportService (TICKET-070, TICKET-110 - PERMANENT):**
- **Idempotency**: subscription_id + child_id (sponsorships), charge_id + project_id (projects)
- **Status determination**: Maps Stripe status (succeeded, failed, refunded, canceled) → donation status enum
- **Metadata-first extraction**: child_id/project_id from metadata (webhooks), fallback to nickname/description parsing (CSV)
- **Duplicate detection**: Flags duplicate subscriptions (same child, different subscription_id) as needs_attention
- Transaction-wrapped for data integrity

**StripeCsvBatchImporter (TICKET-071, TICKET-110 - TEMPORARY):**
- **Status-based counting**: succeeded_count, failed_count, needs_attention_count (tracks donation status)
- **Error tracking**: Service exceptions (not status failures) go into errors array with row numbers
- Maps CSV description → projects (10-step pattern matching)
- Delete after CSV import complete

**See:** docs/PATTERNS.md for implementation details

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

**Implementation:** Soft delete (`discarded_at`), hard delete prevented if associations exist (`restrict_with_exception`)

**See:** TICKET-062, TICKET-038, TICKET-049

#### Donor Contact Information Patterns

**Phone & Address Validation (TICKET-100):**
- **Phone validation:** Uses `phonelib` gem with US/international format support
- **Zip code validation:** Uses `validates_zipcode` gem with country-aware validation (auto-pads 4-digit US codes)
- **All fields optional:** No required contact info (supports anonymous donors)

**Pattern:**
```ruby
class Donor < ApplicationRecord
  validates :phone, phone: { possible: true, allow_blank: true }
  validates_zipcode :zip_code, country_code: :country
  validates :state, length: { is: 2 }, allow_blank: true
  validates :country, length: { is: 2 }, allow_blank: true

  def full_address
    [address_line1, address_line2, city, state, zip_code, country]
      .compact.reject(&:blank?).join(", ")
  end
end
```

**Anonymous Email Generation (Prevents Duplicate Anonymous Donors):**
- **Problem:** Multiple anonymous donors with different contact info collapse into single "Anonymous@mailinator.com"
- **Solution:** Generate unique email from contact information
- **Priority:** phone > address > name

**Implementation (must match in both Donor model and DonorService):**
```ruby
# app/models/donor.rb - set_defaults callback
if email.blank?
  if phone.present?
    sanitized_phone = phone.gsub(/\D/, "")
    self.email = "anonymous-#{sanitized_phone}@mailinator.com"
  elsif address_line1.present? || city.present?
    address_parts = [address_line1, city].compact.reject(&:blank?)
    sanitized_address = address_parts.join("-").gsub(/\s+/, "").downcase
    self.email = "anonymous-#{sanitized_address}@mailinator.com"
  else
    clean_name = name.gsub(/\s+/, "")
    self.email = "#{clean_name}@mailinator.com"
  end
end
```

**Data Preservation on CSV Import (Blank Updates):**
- **Problem:** CSV import with blank phone/address overwrites existing donor data
- **Solution:** Delete blank fields from update hash before updating

**Pattern:**
```ruby
class DonorService
  def self.build_update_attributes(donor_attributes, transaction_date)
    update_attrs = donor_attributes.merge(last_updated_at: transaction_date)

    # Delete blank fields to preserve existing values
    update_attrs.delete(:name) if donor_attributes[:name].blank?
    update_attrs.delete(:phone) if donor_attributes[:phone].blank?
    update_attrs.delete(:address_line1) if donor_attributes[:address_line1].blank?
    # ... all address fields

    update_attrs
  end
end
```

**Factory Traits:** `:with_phone`, `:with_address`, `:with_full_contact`

**See:** TICKET-100, docs/PATTERNS.md for factory examples

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

**Features:** Catches render/lifecycle errors, user-friendly UI, dev-only stack traces, custom fallback support

**Limitations:** Use try-catch for event handlers, async code, SSR errors

**See:** TICKET-036

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

**Example:** DonorAutocomplete, DonationFilters
- DonorAutocomplete: Extracted from DonationForm, DonationsPage
- DonationFilters: Extracted from DonationsPage (TICKET-096)
- Features: Debounced search, loading states, date validation, configurable
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

#### List Component Pattern (Pure Presentation)

**Standard:** All List components are pure presentation (no filter state)

**Pattern:**

```typescript
// ✅ Correct: Pure presentation
const DonationList: React.FC<{ donations: Donation[] }> = ({ donations }) => {
  return <Stack>{donations.map(d => <Card>...</Card>)}</Stack>;
};

// ❌ Incorrect: Mixed concerns
const DonationList = ({ donations, onFilterChange }) => {
  const [filter, setFilter] = useState('');  // ❌ State in List
  return <><Filters /><Stack>...</Stack></>;  // ❌ Filters in List
};
```

**Implemented:**
- DonationList (TICKET-096) - Pure presentation
- ChildList - Pure presentation
- DonorList - Pure presentation
- ProjectList - Pure presentation
- SponsorshipList - Pure presentation

**Filter Pattern:**
- Filters in separate component (e.g., DonationFilters)
- Page manages filter state
- Page passes filtered data to List

**See:** TICKET-096 (DonationList refactor)

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

#### React Hooks Best Practices

**useCallback for Fetch Functions:**
- Always wrap fetch functions in `useCallback` to stabilize references
- Include all dependencies used inside the callback
- Prevents infinite loops in useEffect hooks
- No need to include setState functions (they're stable by default)

**Pattern:**
```typescript
const fetchData = useCallback(async () => {
  const response = await apiClient.get('/api/data', {
    params: { page: currentPage, filter: searchQuery }
  });
  setData(response.data.items);
  setPaginationMeta(response.data.meta);
}, [currentPage, searchQuery, setPaginationMeta]); // ✅ Include all dependencies

useEffect(() => {
  fetchData();
}, [fetchData]); // ✅ Safe to include - stable reference
```

**Common Pitfalls:**
- ❌ Don't disable exhaustive-deps - fix the root cause instead
- ❌ Avoid object/array deps that recreate every render (destructure primitives)
- ✅ setState functions don't need to be in deps (stable by React)

**See:** TICKET-097 (ESLint exhaustive-deps fix)

**Async Prop Updates:**
- Use `useEffect` for props that load asynchronously (modals/dialogs receiving API data)
- Initialize state with safe defaults, update in useEffect when prop changes
- **Bug fix (TICKET-100):** DonorMergeModal initialized with `donors[0]?.id || 0` → sent `0` to API → 500 error
- **Solution:** Initialize with `0`, add `useEffect(() => { if (donors.length > 0) setField(donors[0].id) }, [donors])`

#### Custom Hooks Library

**When to Create:**
- Logic duplicated in 2+ components, complex stateful logic, reduces 20+ lines

**Implemented Hooks:**
- **Utility Hooks:**
  - `useDebouncedValue` - Debounce input values (300ms default)
  - `usePagination` - Pagination state management
  - `useRansackFilters` - Ransack query building
- **Entity Hooks (Data Fetching):**
  - `useChildren` - Fetch children with sponsorships, search, pagination
  - `useDonors` - Fetch donors with archive/restore, search, pagination
  - `useDonations` - Fetch donations with filters (date, donor, payment method)
  - `useSponsorships` - Fetch sponsorships with end action, search, pagination
  - `useProjects` - Fetch projects with archive support, pagination

**Pattern (Entity Hooks):**
```typescript
// Consistent return signature across all entity hooks
const {
  items,              // Array of entities
  loading,            // Boolean loading state
  error,              // Error string or null
  paginationMeta,     // Pagination metadata
  fetchItems,         // Fetch function with options
  // ...entity-specific actions (archive, restore, end, etc.)
} = useEntityHook();

// Usage in page components
useEffect(() => {
  fetchItems({
    page: currentPage,
    perPage: 10,
    search: debouncedQuery,
    // ...entity-specific filters
  });
}, [currentPage, debouncedQuery, fetchItems]);
```

**Benefits:**
- Consistent data fetching across all pages
- Centralized error handling and loading states
- Reusable across components
- Easy to test in isolation
- Reduces page component complexity

**Location:** `src/hooks/` with barrel export

**See:** docs/PATTERNS.md for full API and code examples (TICKET-032, TICKET-066, TICKET-099)

#### Grouped Autocomplete with Type Badges & Gender Icons

**Purpose:** Visual clarity for autocomplete options with multiple entity types (children vs projects) and child gender

**Pattern:**
```typescript
<Autocomplete
  groupBy={(option) => option.type === 'project' ? 'Projects' : 'Children'}
  renderOption={(props, option) => (
    <li {...props}>
      <Chip label={option.type === 'child' ? 'Child' : option.project_type} />
      {option.type === 'child' && (option.gender === 'girl' ? <Girl /> : <Boy />)}
      {option.name}
    </li>
  )}
/>
```

**Features:**
- Grouped results ("Children" and "Projects" sections)
- Type badges (Child/General/Campaign)
- Gender icons (Boy/Girl, null defaults to Boy)
- Child gender field: Optional (boy/girl/null) with full validation

**See:** TICKET-052, docs/PATTERNS.md for full implementation

#### Currency Utilities (DRY Pattern)

**Purpose:** Single source of truth for currency conversion between cents (database) and dollars (display)

**Why Cents?** Industry standard (Stripe, PayPal), avoids floating-point errors, integer math accuracy

**Implementation:**
```typescript
// src/utils/currency.ts
export const formatCurrency = (cents: number): string => {
  return `$${(cents / 100).toFixed(2)}`;  // 10000 → "$100.00"
};

export const parseCurrency = (dollars: string | number): number => {
  return Math.round(parseFloat(String(dollars)) * 100);  // "100" → 10000
};
```

**Usage:**
- **Forms:** `parseCurrency(amount)` - Convert input to cents for API
- **Display:** `formatCurrency(donation.amount)` - Format cents as dollars

**See:** TICKET-071

#### Quick Create Dialog Pattern (Modal Entity Creation)

**Purpose:** Create entities (donors, projects, children) without leaving current page, preserving form state

**When to Use:**
- User needs to create related entity mid-workflow (e.g., creating donation but donor doesn't exist)
- Prevents context switching and data loss from page navigation
- Follows "Add Sponsor" pattern from Children page

**Pattern (Icon Button + Dialog):**
```tsx
// Icon button next to autocomplete
<Box sx={{ display: 'flex', gap: 1 }}>
  <DonorAutocomplete value={donor} onChange={setDonor} size="small" />
  <IconButton aria-label="create donor" onClick={() => setDialogOpen(true)}>
    <AddIcon />
  </IconButton>
</Box>

// Dialog component handles API calls and error states
const QuickDonorCreateDialog: React.FC<Props> = ({ open, onClose, onSuccess, preFillData }) => {
  // Error state in dialog, form only returns data
  // Auto-select created entity via onSuccess callback
  // Snackbar for 422 validation + network errors
};
```

**Key Features:**
- **Pre-fill Support:** Pass search input to dialog
- **Auto-selection:** Created entity immediately selected in autocomplete
- **Error Handling:** 422 validation + network errors via Snackbar
- **Form Reset:** `dialogKey` pattern resets forms on close
- **API in Dialog:** Dialog handles API calls, form only returns data

**Variants:**
- **Single Entity:** QuickDonorCreateDialog (one form)
- **Tabbed Multi-Entity:** QuickEntityCreateDialog (Child/Project tabs with separate error states)

**See:** docs/PATTERNS.md for full implementation code (TICKET-021)

#### React Router Multi-Page Architecture

**Pattern:** App.tsx (router) → Layout (Outlet) → Pages (state)

**Implementation:**
```tsx
// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/donors" replace />} />
          <Route path="donors" element={<DonorsPage />} />
          <Route path="donations" element={<DonationsPage />} />
          <Route path="children" element={<ChildrenPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

// src/components/Layout.tsx
import { Outlet } from 'react-router-dom';

function Layout() {
  return (
    <>
      <Navigation />
      <Outlet /> {/* Pages render here */}
    </>
  );
}
```

**Best Practices:**
- Keep App.tsx minimal (routing only), page-level state, index route redirects, E2E tests for all routes

**See:** docs/PATTERNS.md for full code examples

### Pre-commit Requirements

**Before committing:**

1. **Documentation Update Rule**: Update docs/DonationTracking.md and CLAUDE.md
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

#### Documentation Check Bypass Options

**Pre-commit hook validates documentation updates** for CLAUDE.md, DonationTracking.md, README.md, and ticket files when TICKET-XXX detected in changes.

**Bypass when appropriate:**
- Hotfixes requiring immediate deployment
- Work-in-progress commits
- Doc-only changes
- Cases where docs truly don't need updating

**Option 1: Environment Variable (one-off)**
```bash
SKIP_DOC_CHECK=1 git commit -m "hotfix: urgent bug fix"
```

**Option 2: Commit Message Tag (documented exception)**
```bash
git commit -m "wip: partial implementation [skip-docs]"
```

**Option 3: Bypass All Hooks (use sparingly)**
```bash
git commit --no-verify -m "your commit message"
```

**See:** TICKET-126 for implementation details

---

## 🚀 Development Workflow

### Feature Development (Vertical Slice)

1. **Plan**: Select next slice (business value, minimal dependencies)
2. **TDD Model**: Write failing tests, minimal code
3. **TDD API**: Write failing tests, minimal endpoint
4. **TDD Frontend**: Write failing tests, minimal component
5. **Integration**: E2E testing across layers
6. **Documentation**: Update docs/DonationTracking.md and CLAUDE.md
7. **Demo**: Show feature, gather feedback

### Branch Strategy

- **main/master**: Production-ready
- **feature/name**: Development branches
- **Direct commits**: OK for single-developer
- **Service separation**: Maintain in commits

---

## 📚 Development Commands

**Backend Testing:**
```bash
# Run all backend tests (isolated test environment)
bash scripts/test-backend.sh

# Run specific test file
bash scripts/test-backend.sh spec/models/donation_spec.rb

# Run specific test line
bash scripts/test-backend.sh spec/models/donation_spec.rb:227
```

**IMPORTANT:** Always use `scripts/test-backend.sh` to ensure `RAILS_ENV=test` is set. Running `docker-compose exec api bundle exec rspec` directly will use development environment and pollute your development database.

**See:** docs/project/tech-stack.md for complete command reference including:
- Backend commands (rails console, rubocop, reek, rubycritic)
- Frontend commands (npm test, vitest, cypress, lint)
- E2E testing (isolated test environment on port 3002)
- Pre-commit scripts (documentation, backend, frontend, hooks, recovery)

---

## 🎨 UI/UX Guidelines

### Design Principles

**Mobile-first**, **WCAG 2.1 AA** compliance, optimize for slow connections, clear navigation/errors, semantic HTML, proper ARIA labels

---

## 🔒 Security Requirements

**Backend:** Input validation, parameterized queries, XSS protection, rate limiting, never commit secrets

**Frontend:** Sanitize inputs, secure token storage, HTTPS, CSP headers

**Keys:** master.key local only, environment variables for deployment, audit git history

---

## 📊 Monitoring & Debugging

**Logging:** Structured JSON, levels (DEBUG/INFO/WARN/ERROR), no sensitive data

**Performance:** Bullet gem (N+1), API response times, bundle sizes, container resources

---

## 🎯 Token Usage Optimization

*For efficient Claude Code interactions*

**Response Verbosity:** Minimal explanations, skip preambles, 1-sentence confirmations, explain "why" only when asked

**Tool Usage:** Batch operations, avoid re-reading files, targeted grep/glob, run tests only when needed

---

## 📖 Detailed Documentation

**Optional deep-dives** (Claude can read these when needed, but CLAUDE.md is self-contained):

- **docs/ARCHITECTURE.md** - Diagrams, workflows, service architecture
- **docs/PATTERNS.md** - Code examples, concerns, presenters, React Router
- **docs/TESTING.md** - Framework setup, testing stack, code smell tools
- **docs/DOCKER.md** - Container configuration, troubleshooting
- **docs/CLAUDE-BEST-PRACTICES.md** - Token optimization, maintenance
- **docs/project/** - data-models.md, tech-stack.md, api-endpoints.md, roadmap.md

---

## 🔄 Deployment Considerations

**See:** docs/project/deployment.md for complete production readiness checklist including:
- Testing requirements (unit, E2E, QA)
- Security checklist (SSL, firewall, secrets, audits)
- Infrastructure setup (env vars, migrations, backups, monitoring)
- Application configuration (database seeding, Stripe webhooks, email, error tracking)

---

*This document is updated as practices evolve*
*Last updated: 2025-11-28*
*Target: 900-1000 lines for optimal Claude Code performance (self-contained essentials with mature pattern library)*
