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

**Pattern:** Use `save!`/`update!`/`find` instead of if/else for consistent error responses

**ApplicationController rescue handlers:**
- `RecordNotFound` → 404 `{ error: "message" }`
- `RecordInvalid` → 422 `{ errors: [...] }`
- `ParameterMissing` → 400 `{ error: "message" }`

**Benefits:** Happy path focus, automatic error responses, proper HTTP codes

**See:** docs/PATTERNS.md for controller examples, TICKET-068, TICKET-094

#### Admin Controller Pattern

**Purpose:** Web interface for admin operations (CSV import, bulk operations)

**Key Features:** Reuses service layer, binary file handling, timeout-aware (120s), returns status counts

**See:** docs/PATTERNS.md for implementation example, TICKET-091

#### Service Object Patterns

**ALL services use instance methods for consistency (TICKET-037).**

**When to use:**
- Multi-step workflows (2+ steps)
- Internal state tracking (instance variables)
- Private helper methods needed (3+)
- Complex conditional logic

**Pattern:** Initialize with params, call public method, use private helpers for steps

**See:** docs/PATTERNS.md for DonorService example (130 lines, 10+ methods)

#### Stripe CSV Import Patterns (TICKET-070, TICKET-110, TICKET-111, TICKET-134)

**PERMANENT:** StripePaymentImportService - Idempotency (subscription_id + child_id), status determination, metadata-first extraction, duplicate detection, email fallback handling

**Email Fallback Logic (TICKET-134):**
- Priority 1: `Cust Email` (primary customer email)
- Priority 2: `Billing Details Email` (fallback when Cust Email empty - handles 121 rows)
- Priority 3: Anonymous email generation (when both empty - handles 138 rows via DonorService)

**TEMPORARY:** StripeCsvBatchImporter - Status counting, error tracking (delete after CSV import)

**See:** docs/PATTERNS.md for implementation details

#### Donor CSV Export Pattern (TICKET-088)

**Purpose:** Export donor contact info and donation statistics to CSV (13 columns: contact fields + aggregates)

**Key Features:**
- SQL aggregates (SUM/COUNT/MAX) to avoid N+1 queries
- Hides @mailinator.com emails (anonymous donors)
- Exports only final merged records (excludes merged_into_id not null)
- Ransack filter support (respects search and include_discarded params)

**Service Pattern:** Class method (stateless), uses Ruby CSV library with `send_data` in controller

**See:** docs/PATTERNS.md for full implementation code

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

**When to use:** Complex JSON structures, computed fields, multiple model aggregation

**Pattern:** Presenter class with `as_json` method, use `CollectionPresenter` for arrays

**See:** docs/PATTERNS.md for implementation examples

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

**Pattern:** Soft delete (`discarded_at`), hard delete prevented if associations exist (`dependent: :restrict_with_exception`)

**Applied to:** Donor, Child, Project models (all have `can_be_deleted?` method)

**See:** docs/PATTERNS.md for implementation, TICKET-062, TICKET-038, TICKET-049

#### Donor Contact Information Patterns (TICKET-100)

**Validation:** phonelib (US/international), validates_zipcode (country-aware), all fields optional

**Anonymous Email Generation:** Unique email from contact info prevents duplicate anonymous donors
- **Priority:** phone > address > name → `anonymous-5551234567@mailinator.com`

**CSV Import Data Preservation:** Delete blank fields from update hash (preserves existing values)

**Factory Traits:** `:with_phone`, `:with_address`, `:with_full_contact`

**See:** docs/PATTERNS.md for implementation code and validation examples

#### Authentication & Authorization (TICKET-008)

**Pattern:** Google OAuth2 + JWT tokens for single-tenant admin application

**Authentication Flow:**
1. User clicks "Sign in with Google" on `/login`
2. Frontend redirects to `/auth/google_oauth2`
3. OmniAuth handles OAuth, validates @projectsforasia.com domain
4. Backend generates JWT (30-day expiration)
5. Backend redirects to frontend `/auth/callback?token=...&user=...`
6. Frontend stores JWT in localStorage
7. Frontend includes `Authorization: Bearer <token>` on all API requests
8. Backend middleware validates JWT, sets `@current_user`

**Key Components:**
- `AuthController` - Google OAuth + dev login endpoints
- `ApplicationController` - JWT authentication middleware
- `JsonWebToken` - Encode/decode service (30-day expiration)

**Domain Restriction:** Only @projectsforasia.com emails (403 Forbidden for others)

**Dev Login:** `GET /auth/dev_login` - Seeded admin user for development/E2E testing

**Protected Endpoints:** All `/api/*` routes except `/api/health`, `/auth/*`, `/rails/health`

**See:** docs/PATTERNS.md for implementation code, TICKET-008

### Frontend (React)

- **ESLint**: React, accessibility, TypeScript rules
- **Prettier**: Code formatting
- **TypeScript**: Strict mode
- **Mobile-first**: Responsive components
- **Axios**: Standardized API client

#### Authentication Pattern (TICKET-008)

**AuthContext + useAuth Hook:**
- Manages `user`, `token`, `isAuthenticated` state in React Context
- `login(token, user)` - Stores in localStorage, updates state
- `logout()` - Clears localStorage, resets state
- Usage: `const { user, isAuthenticated, logout } = useAuth();`

**API Client Interceptor:**
- Request: Adds `Authorization: Bearer <token>` header
- Response: Auto-logout on 401 (redirects to `/login`)

**Protected Routes:**
- `ProtectedRoute` component wraps all authenticated pages
- Redirects to `/login` if not authenticated
- Uses React Router `Navigate` component

**Login Page:**
- Google OAuth button → `/auth/google_oauth2`
- Dev login button (development only) → `/auth/dev_login`

**Callback Page:**
- Extracts `token` and `user` from URL query params
- Calls `login(token, user)` from AuthContext
- Redirects to home page

**E2E Authentication:**
- `cy.login()` command uses `/auth/dev_login` endpoint
- `cy.visit()` auto-injects auth tokens into localStorage

**See:** docs/PATTERNS.md for implementation code, TICKET-008, authentication.cy.ts

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

#### StandardDialog Pattern

**Purpose:** Generic dialog wrapper that eliminates boilerplate, ensures consistent UX

**Features:** Close button (X), standard sizing/padding, integrated Snackbar error handling

**Props:** `open`, `onClose`, `title`, `children`, `error?`, `onErrorClose?`, `maxWidth?`

**Usage:** Wrap form in `<StandardDialog>`, handle API errors in parent with `error` state

**Benefits:** Eliminates 60-80 lines per dialog, single source of truth for UX

**Current Usage:** SponsorshipModal, QuickDonorCreateDialog, QuickEntityCreateDialog (tabs)

**See:** docs/PATTERNS.md for usage example, TICKET-127

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

**Button Configuration:**
- **Submit:** Full-width, primary (`variant="contained" color="primary" fullWidth`)
- **Cancel:** Conditional - only in EDIT mode for inline page forms
  - CREATE mode: NO Cancel (user navigates away)
  - EDIT mode: YES Cancel (exits edit mode, `color="error"`)
  - Modal/Dialog: NO Cancel (dialog has close X)

**Props:**
- `onSubmit: (data: FormData) => Promise<void>` - Required
- `initialData?: FormData` - Optional (edit mode if provided)
- `onCancel?: () => void` - Optional (shows only when BOTH provided)

**Implemented:** DonationForm, ChildForm, ProjectForm, DonorForm, SponsorshipForm

**ProjectForm — Sponsorship Type Restriction (TICKET-123):**
- Sponsorship project type is **not available** in the create form (backend rejects direct donations to sponsorship projects via `sponsorship_project_must_have_sponsorship_id` validation)
- When editing an existing sponsorship project, the type shows as disabled ("Sponsorship - system managed")
- Seeds.rb includes `find_or_create_by!` for "General Donation" system project (ensures it exists on fresh setup)

**DonationForm — Error Handling:**
- API errors displayed in a dismissable Alert (previously silent)
- Parses both `errors: [...]` arrays and `error: "..."` strings from backend responses

**See:** docs/PATTERNS.md for examples, TICKET-050, TICKET-127, TICKET-123

#### React Hooks Best Practices

**useCallback for Fetch Functions:**
- Always wrap fetch functions in `useCallback` to stabilize references
- Include all dependencies (setState functions are stable, no need to include)
- Prevents infinite loops in useEffect

**Common Pitfalls:**
- ❌ Don't disable exhaustive-deps - fix root cause
- ❌ Avoid object/array deps (destructure primitives)

**Async Prop Updates:**
- Use `useEffect` for async props (modals receiving API data)
- Initialize with safe defaults, update in useEffect when prop changes

**See:** docs/PATTERNS.md for examples, TICKET-097, TICKET-100

#### Custom Hooks Library

**When to Create:**
- Logic duplicated in 2+ components, complex stateful logic, reduces 20+ lines

**Types:** Utility hooks (debounce, pagination, filters), Entity hooks (data fetching with consistent return signature)

**Pattern:** All entity hooks return `{ items, loading, error, paginationMeta, fetchItems, ...actions }`

**Location:** `src/hooks/` with barrel export

**See:** docs/PATTERNS.md for full hook list and API (TICKET-032, TICKET-066, TICKET-099)

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

#### Quick Create Dialog Pattern (TICKET-021)

**When to Use:** Create related entity mid-workflow without leaving page (prevents data loss)

**Pattern:** Icon button + dialog (dialog handles API, form returns data)

**Features:** Pre-fill support, auto-selection, error handling (Snackbar), form reset (dialogKey), API in dialog

**Variants:** Single entity (QuickDonorCreateDialog), Tabbed multi-entity (QuickEntityCreateDialog)

**See:** docs/PATTERNS.md for implementation code

#### React Router Multi-Page Architecture

**Pattern:** App.tsx (router) → Layout (Outlet) → Pages (state)

**Key Components:**
- `BrowserRouter` wraps Routes
- `Layout` component renders `<Outlet />` for page content
- Index route redirects to default page

**Best Practices:** Keep App.tsx minimal (routing only), page-level state, E2E tests for all routes

**See:** docs/PATTERNS.md for full implementation examples

#### AdminPage Tab Organization

**Purpose:** Group administrative/configuration features separately from operational pages

**Current Structure (as of TICKET-119, TICKET-091):**
- **Tab 0**: Pending Review - Donations needing attention (TICKET-111)
- **Tab 1**: CSV - Donor export + Stripe CSV import (TICKET-088, TICKET-091)
- **Tab 2**: Projects - Project CRUD and archive management (TICKET-119)

**Pattern:** Section components (e.g., `ProjectsSection`, `PendingReviewSection`) are self-contained with:
- Own state management (useState, useEffect)
- Own CRUD handlers
- No props from AdminPage (fully independent)
- Own success/error notifications

**Navigation:** Admin features accessed via `/admin` route, not standalone pages

**Benefits:**
- Clear separation: Operational pages (Donations, Donors, Children, Sponsorships) vs Admin
- Reduced top navigation clutter
- Grouped administrative functionality
- Maintains full feature accessibility

**See:** TICKET-119 for Projects migration pattern

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

**Option 1: Environment Variable (recommended)**
```bash
SKIP_DOC_CHECK=1 git commit -m "hotfix: urgent bug fix"
```

**Option 2: Bypass All Hooks (use sparingly)**
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

**Deployment:**
```bash
# Automated deployment (detects changes, dry-run first)
bash scripts/deploy.sh --dry-run           # Preview deployment
bash scripts/deploy.sh                     # Deploy (prompts for confirmation)
bash scripts/deploy.sh --force-backend     # Force backend deployment
bash scripts/deploy.sh --force-frontend    # Force frontend deployment

# Health checks
bash scripts/health-check.sh full          # Full system check
bash scripts/health-check.sh api           # Backend only
bash scripts/health-check.sh frontend      # Frontend only

# Rollback
bash scripts/rollback.sh backend           # Rollback backend
bash scripts/rollback.sh frontend          # Rollback frontend
```

**See:** deployment/AUTOMATED-DEPLOYMENT.md for complete deployment guide, TICKET-138

---

## 🎨 UI/UX Guidelines

### Design Principles

**Mobile-first**, **WCAG 2.1 AA** compliance, optimize for slow connections, clear navigation/errors, semantic HTML, proper ARIA labels

---

## 🔒 Security Requirements

**Authentication:** Google OAuth2 with domain restriction (@projectsforasia.com only), JWT tokens (30-day expiration), all API routes protected except `/auth/*` and `/api/health`

**Backend:** Input validation, parameterized queries, XSS protection, rate limiting, never commit secrets, JWT secret in credentials/ENV

**Frontend:** Sanitize inputs, JWT in localStorage, auto-logout on 401, HTTPS enforced, CSP headers

**Keys:** master.key local only, environment variables for deployment (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, JWT_SECRET_KEY), audit git history

**See:** TICKET-008 for authentication implementation, TICKET-136 for production OAuth setup

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

## 🔄 Production Deployment

**Status:** ✅ **LIVE** - https://donations.projectsforasia.com (TICKET-136, TICKET-137)

**Production Environment:**
- **Server:** DigitalOcean Droplet (1GB RAM, 1 vCPU, Singapore) - $7.20/month
- **Stack:** Docker Compose + PostgreSQL 15 + Rails 8 + React 18 + Nginx
- **SSL:** Let's Encrypt (auto-renewal)
- **Auth:** Google OAuth (Internal - @projectsforasia.com only)

**Deployment Method:** Docker Compose (simpler, matches dev environment)

**Resource Optimization:**
- Single-mode Puma: `WEB_CONCURRENCY=0`, `RAILS_MAX_THREADS=2`
- Memory limits: Postgres 256MB, API 220MB, 1GB swap
- No Redis/Sidekiq (saves ~30-50MB RAM)
- Result: Runs smoothly on 1GB RAM

**Key Files:**
- `docker-compose.prod.yml` - Production config
- `deployment/DEPLOYMENT-DOCKER.md` - Complete deployment guide
- `docs/OAUTH2-SETUP.md` - Google OAuth setup

**Nginx Pattern:**
- Specific backend routes (`/auth/google_oauth2`, `/api/`) proxy to `127.0.0.1:3001`
- Frontend catch-all: `try_files $uri $uri/ /index.html` (React Router)
- **Critical:** Specific routes BEFORE catch-all
- Upload limit: `client_max_body_size 50M` (CSV imports)

**See:** `deployment/DEPLOYMENT-DOCKER.md`, `TICKET-137`, `TICKET-136`

---

*This document is updated as practices evolve*
*Last updated: 2026-02-18*
*Current: 933 lines (34.5% reduction from 1,425 lines)*
*Target: 900-1000 lines for optimal Claude Code performance (self-contained essentials with mature pattern library)*
