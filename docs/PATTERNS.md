# Code Patterns & Implementation Examples

*Detailed code examples and implementation patterns for the Donation Tracker project*

---

## Rails Backend Patterns

### Service Object Patterns

Rails services should follow consistent patterns based on complexity:

#### Class Methods (Stateless, Simple Operations)

Use for simple, stateless operations that don't require instance variables.

**When to use:**
- Simple data transformations
- Stateless lookup operations
- No multi-step workflows

**Example:**
```ruby
class DonorService
  def self.find_or_update_by_email(attributes, timestamp)
    donor = Donor.find_by(email: attributes[:email])

    if donor
      donor.update(
        name: attributes[:name],
        updated_at: timestamp
      )
    else
      donor = Donor.create(
        email: attributes[:email],
        name: attributes[:name],
        created_at: timestamp,
        updated_at: timestamp
      )
    end

    donor
  end
end
```

#### Instance Methods (Stateful, Complex Operations)

Use for complex operations with multiple steps that benefit from storing state.

**When to use:**
- Multi-step workflows
- Complex validation logic
- Operations requiring state tracking
- Need to extract private helper methods

**Example: DonorMergeService**
```ruby
# Service for merging multiple donor records into a single donor.
# Handles field selection, validation, and transactional merge operations.
class DonorMergeService
  attr_reader :donor_ids, :field_selections, :donors, :errors

  def initialize(donor_ids:, field_selections:)
    @donor_ids = donor_ids
    @field_selections = field_selections
    @donors = []
    @errors = []
  end

  def merge
    validate_inputs!
    load_donors
    perform_merge_transaction
  rescue ActiveRecord::RecordInvalid => e
    @errors << e.message
    nil
  end

  private

  def validate_inputs!
    raise ArgumentError, "Must provide at least 2 donors to merge" if donor_ids.size < 2
    raise ArgumentError, "Field selections required" if field_selections.blank?
  end

  def load_donors
    @donors = Donor.where(id: donor_ids).to_a
    raise ArgumentError, "One or more donors not found" if donors.size != donor_ids.size
  end

  def perform_merge_transaction
    ActiveRecord::Base.transaction do
      primary_donor = build_merged_donor
      merge_donations
      archive_duplicate_donors
      primary_donor
    end
  end

  def build_merged_donor
    primary_donor = donors.first
    field_selections.each do |field, donor_id|
      source_donor = donors.find { |d| d.id == donor_id.to_i }
      primary_donor[field] = source_donor[field] if source_donor
    end
    primary_donor.save!
    primary_donor
  end

  def merge_donations
    duplicate_ids = donors[1..].map(&:id)
    Donation.where(donor_id: duplicate_ids).update_all(donor_id: donors.first.id)
  end

  def archive_duplicate_donors
    donors[1..].each(&:discard)
  end
end
```

**Benefits:**
1. **State Management**: Instance variables track operation state
2. **Maintainability**: Private methods reduce complexity per method
3. **Testability**: Can test individual private methods if needed
4. **Readability**: Clear flow with descriptive method names
5. **Complexity Reduction**: Target <10 flog score per method

---

### Controller Concerns Pattern

Extract repeated logic across controllers into reusable concerns following DRY principles.

#### PaginationConcern

**Purpose:** Standardize pagination across all API endpoints using Kaminari.

**Implementation:**
```ruby
# app/controllers/concerns/pagination_concern.rb
module PaginationConcern
  extend ActiveSupport::Concern

  # Apply pagination to a collection
  # @param collection [ActiveRecord::Relation] The collection to paginate
  # @param per_page [Integer] Number of items per page (default: 25)
  # @return [ActiveRecord::Relation] Paginated collection
  def paginate_collection(collection, per_page: 25)
    page = params[:page]&.to_i || 1
    collection.page(page).per(per_page)
  end

  # Generate pagination metadata for API responses
  # @param paginated_collection [ActiveRecord::Relation] Kaminari paginated collection
  # @return [Hash] Pagination metadata
  def pagination_meta(paginated_collection)
    {
      total_count: paginated_collection.total_count,
      total_pages: paginated_collection.total_pages,
      current_page: paginated_collection.current_page,
      per_page: paginated_collection.limit_value
    }
  end
end
```

**Usage:**
```ruby
class Api::DonorsController < ApplicationController
  include PaginationConcern

  def index
    donors = paginate_collection(Donor.all.order(name: :asc))

    render json: {
      donors: donors,
      meta: pagination_meta(donors)
    }
  end
end
```

#### RansackFilterable

**Purpose:** Standardize search/filter functionality using Ransack gem.

**Implementation:**
```ruby
# app/controllers/concerns/ransack_filterable.rb
module RansackFilterable
  extend ActiveSupport::Concern

  # Build Ransack query from params[:q]
  # @param scope [ActiveRecord::Relation] The base scope to filter
  # @return [ActiveRecord::Relation] Filtered scope
  def apply_ransack_filters(scope)
    return scope unless params[:q].present?

    @q = scope.ransack(params[:q])
    @q.result
  end
end
```

**Usage:**
```ruby
class Api::DonorsController < ApplicationController
  include PaginationConcern
  include RansackFilterable

  def index
    scope = Donor.kept  # Only non-archived donors
    filtered_scope = apply_ransack_filters(scope)
    donors = paginate_collection(filtered_scope.order(name: :asc))

    render json: {
      donors: donors,
      meta: pagination_meta(donors)
    }
  end
end
```

**Benefits:**
- **DRY**: Single source of truth for common logic
- **Testability**: Concerns can be tested in isolation with anonymous controllers
- **Reusability**: Same concerns used across Donors, Donations, Projects controllers
- **Maintainability**: Changes to pagination/filtering logic apply everywhere
- **Rails Convention**: Standard pattern for cross-cutting functionality

---

### Global Error Handling Pattern (TICKET-068)

**Purpose:** Provide consistent error responses across all API endpoints with proper HTTP status codes.

**Problem Solved:**
- Controllers were using if/else blocks for save/update validation
- Inconsistent error response formats across endpoints
- HTTP 500 errors for expected failures (not found, validation errors)
- Duplicate error handling logic in every controller action

**Implementation:**

```ruby
# app/controllers/application_controller.rb
class ApplicationController < ActionController::API
  rescue_from ActiveRecord::RecordNotFound, with: :render_not_found
  rescue_from ActiveRecord::RecordInvalid, with: :render_unprocessable_entity
  rescue_from ActionController::ParameterMissing, with: :render_bad_request

  private

  # Returns { error: "message" } with 404 status
  def render_not_found(exception)
    render json: { error: exception.message }, status: :not_found
  end

  # Returns { errors: [...] } with 422 status
  def render_unprocessable_entity(exception)
    render json: { errors: exception.record.errors.full_messages },
           status: :unprocessable_entity
  end

  # Returns { error: "message" } with 400 status
  def render_bad_request(exception)
    render json: { error: exception.message }, status: :bad_request
  end
end
```

**Controller Pattern (Before):**
```ruby
def create
  child = Child.new(child_params)
  if child.save
    render json: { child: ChildPresenter.new(child).as_json }, status: :created
  else
    render json: { errors: child.errors.full_messages }, status: :unprocessable_entity
  end
end

def update
  child = Child.find(params[:id])
  if child.update(child_params)
    render json: { child: ChildPresenter.new(child).as_json }
  else
    render json: { errors: child.errors.full_messages }, status: :unprocessable_entity
  end
end
```

**Controller Pattern (After):**
```ruby
def create
  child = Child.new(child_params)
  child.save!  # Raises RecordInvalid on validation failure
  render json: { child: ChildPresenter.new(child).as_json }, status: :created
end

def update
  child = Child.find(params[:id])  # Raises RecordNotFound if not found
  child.update!(child_params)  # Raises RecordInvalid on validation failure
  render json: { child: ChildPresenter.new(child).as_json }
end
```

**Benefits:**
- ✅ Controllers focus on happy path (no if/else blocks for validation)
- ✅ Consistent error format across all endpoints
- ✅ Proper HTTP status codes (404, 422, 400 instead of 500)
- ✅ Global handlers catch exceptions automatically
- ✅ 5-10 lines removed per controller action
- ✅ Single source of truth for error response structure

**Error Response Formats:**
```json
// 404 Not Found
{
  "error": "Couldn't find Child with 'id'=999"
}

// 422 Unprocessable Entity
{
  "errors": [
    "Name can't be blank",
    "Email is invalid"
  ]
}

// 400 Bad Request
{
  "error": "param is missing or the value is empty: child"
}
```

**When to Use:**
- All controller actions that create/update records
- Use `save!`/`update!` instead of `save`/`update`
- Use `find` instead of `find_by` when record must exist
- Let global handlers catch and format exceptions

**See:** TICKET-068, `app/controllers/application_controller.rb`

---

### Presenter/Decorator Pattern

**Purpose:** Extract view-specific logic and JSON formatting from models/controllers.

#### BasePresenter

Abstract base class for all presenters:

```ruby
# app/presenters/base_presenter.rb
class BasePresenter
  attr_reader :object

  def initialize(object)
    @object = object
  end

  def as_json(options = {})
    raise NotImplementedError, "Subclasses must implement #as_json"
  end
end
```

#### CollectionPresenter

Wraps collections with item-specific presenters:

```ruby
# app/presenters/collection_presenter.rb
class CollectionPresenter
  attr_reader :collection, :presenter_class

  def initialize(collection, presenter_class)
    @collection = collection
    @presenter_class = presenter_class
  end

  def as_json(options = {})
    collection.map { |item| presenter_class.new(item).as_json(options) }
  end
end
```

#### DonationPresenter

Formats donation JSON responses with computed fields:

```ruby
# app/presenters/donation_presenter.rb
class DonationPresenter < BasePresenter
  def as_json(options = {})
    {
      id: object.id,
      amount: object.amount,
      donation_date: object.donation_date,
      donor_id: object.donor_id,
      donor_name: object.donor&.name,  # Computed field
      project_id: object.project_id,
      created_at: object.created_at,
      updated_at: object.updated_at
    }
  end
end
```

**Usage:**
```ruby
class Api::DonationsController < ApplicationController
  def index
    donations = Donation.includes(:donor).all

    render json: {
      donations: CollectionPresenter.new(donations, DonationPresenter).as_json
    }
  end

  def show
    donation = Donation.includes(:donor).find(params[:id])

    render json: DonationPresenter.new(donation).as_json
  end
end
```

**When to use:**
- Complex JSON structures
- Computed fields from multiple models
- View-specific formatting logic
- Conditional field inclusion

**Benefits:**
- **Separation of Concerns**: View logic separate from business logic
- **Testability**: Easy to test JSON formatting in isolation
- **Reusability**: Same presenter used across multiple endpoints
- **Maintainability**: Single place to update JSON structure

---

### Stripe CSV Import Pattern (TICKET-070)

**Context:** StripePaymentImportService imports 1,303 historical Stripe transactions from CSV export.

**Challenge:** Multi-child sponsorships appear as multiple CSV rows with same `Transaction ID` (e.g., "Wan" and "Orawan" both share charge `ch_123`). Donations table originally had unique constraint on `stripe_charge_id`, causing duplicate key violations.

**Solution:** Introduced `stripe_invoices` abstraction layer with 1-to-many relationship (one invoice → multiple donations).

**Schema Design:**
```ruby
# stripe_invoices table
- stripe_invoice_id (string, unique) - Maps to Stripe Transaction ID
- stripe_charge_id (string)          - Also Transaction ID (for now)
- stripe_customer_id (string)
- stripe_subscription_id (string)
- total_amount_cents (integer)
- invoice_date (date)

# donations table (updated)
- stripe_invoice_id (string, FK)     - References stripe_invoices.stripe_invoice_id
- stripe_charge_id (string)          - No longer unique
- stripe_customer_id (string)
- stripe_subscription_id (string)
```

**Multi-Child Sponsorship Idempotency:**

Multi-child sponsorships in the CSV appear as **separate rows** with the **same Transaction ID** but different children:
- Row 7: Transaction ID `ch_1H4U4A`, Child "Wan"
- Row 8: Transaction ID `ch_1H4U4A`, Child "Orawan"

**Idempotency Requirements:**
1. ✅ Same invoice + same child → Skip (duplicate)
2. ✅ Same invoice + different child → Import (multi-child sponsorship)
3. ✅ Different invoice + different child → Import (separate donations)

**Key Implementation Detail:**

`child_id` is a **virtual attribute** (`attr_accessor`) on Donation model, NOT a database column. It triggers `auto_create_sponsorship_from_child_id` callback which creates the sponsorship and sets `sponsorship_id`.

Therefore, idempotency checks CANNOT use `child_id` directly - must check via sponsorship relationship:

```ruby
# WRONG - child_id is not in database
Donation.exists?(stripe_invoice_id: txn_id, child_id: child.id)

# CORRECT - check via sponsorship relationship
Donation
  .joins(:sponsorship)
  .where(stripe_invoice_id: txn_id)
  .where(sponsorships: { child_id: child.id })
  .exists?
```

**Service Pattern:**

```ruby
class StripePaymentImportService
  def import
    ActiveRecord::Base.transaction do
      # Create/find StripeInvoice (allows multiple donations per invoice)
      StripeInvoice.find_or_create_by!(stripe_invoice_id: txn_id) do |invoice|
        # Set invoice metadata only on create
      end

      child_names.each do |child_name|
        child = Child.find_or_create_by!(name: child_name)

        # Check if donation exists for THIS child + invoice (idempotency)
        existing = Donation
          .joins(:sponsorship)
          .where(stripe_invoice_id: txn_id, sponsorships: { child_id: child.id })
          .exists?

        next if existing # Skip duplicate

        Donation.create!(
          child_id: child.id,  # Virtual attr - triggers sponsorship creation
          stripe_invoice_id: txn_id
        )
      end
    end
  end
end
```

**Key Design Decisions:**

1. **Idempotency:** Check per-child donation via sponsorship relationship, NOT just StripeInvoice
2. **Virtual Attribute:** `child_id` is `attr_accessor`, triggers callback to create sponsorship
3. **Multi-Child Support:** Same invoice can have multiple donations for different children
4. **Data Integrity:** StripeInvoice created once, reused by all children

**Implementation Notes:**

- 18 comprehensive tests covering all 3 idempotency scenarios
- Strict TDD: RED → GREEN → refactor, one test at a time
- Bug fix: Original implementation only checked StripeInvoice, causing multi-child duplicates

**See:** TICKET-070, `app/services/stripe_payment_import_service.rb`, `app/models/stripe_invoice.rb`

---

### Stripe CSV Batch Import Pattern (TICKET-071)

**Code Lifecycle:** MVP - Temporary Until Webhooks (TICKET-026)
- Rake task (`rails stripe:import_csv`) is used repeatedly with new CSV exports
- `StripeCsvBatchImporter` provides orchestration until webhooks complete
- Delete ONLY AFTER TICKET-026 (webhooks) is complete and stable
- Core service (`StripePaymentImportService`) is PERMANENT - reused by webhooks

**Project Mapping Context:** CSV import must map description text to projects. Some descriptions are generic (phone numbers, "Subscription creation") and should map to "General Donation" system project rather than creating named projects.

**Pattern Order (first match wins):**
1. **Blank/empty** → "General Donation"
2. **General monthly donation** (`$X - General Monthly Donation`) → "General Donation"
3. **Campaign** (`Donation for Campaign 123`) → "Campaign 123" project
4. **Invoice** (`Invoice ABC-123`) → "General Donation"
5. **Email address** (`user@example.com`) → "General Donation"
6. **All numbers** (`66826191275`) → "General Donation"
7. **Subscription creation** → "General Donation"
8. **Payment app** (`Captured via Payment app`) → "General Donation"
9. **Stripe app** (`Payment for Stripe App`) → "General Donation"
10. **Named items** (e.g., "Tshirt", "Jacket", "Kidz Club") → Create named project for admin review (TICKET-027)

**Implementation:**
```ruby
def find_or_create_project
  description_text = get_description_text

  # 1. Blank/empty → General Donation
  return general_donation if description_text.blank?

  # 2-5. Existing patterns (general, campaign, invoice, email)
  return general_donation if description_text.match(GENERAL_PATTERN)
  return campaign_project if description_text.match(CAMPAIGN_PATTERN)
  return general_donation if description_text.match(/Invoice [A-Z0-9-]+/i)
  return general_donation if description_text.match(EMAIL_PATTERN)

  # 6-9. Enhanced patterns (TICKET-071)
  return general_donation if description_text.match(/\A\d+\z/)  # All numbers
  return general_donation if description_text.match(/Subscription creation/i)
  return general_donation if description_text.match(/Captured via Payment app/i)
  return general_donation if description_text.match(/Payment for Stripe App/i)

  # 10. Named projects - create for admin review
  Project.find_or_create_by!(title: description_text[0, 100])
end
```

**Results (1,225 donations):**
- ✅ 395 donations → "General Donation" (enhanced pattern matching)
- ✅ 9 named projects created (Tshirt, Jacket, Bag, Book, etc.)
- ✅ 0 UNMAPPED projects (all patterns working correctly)

**See:** TICKET-071, `app/services/stripe_payment_import_service.rb#find_or_create_project`

---

## Frontend React Patterns

### TypeScript Type Organization

#### Central Type Definitions

All shared types live in `src/types/` with barrel export pattern.

**File Structure:**
```
src/types/
├── index.ts          # Barrel export
├── donor.ts          # Donor domain types
├── donation.ts       # Donation domain types
├── project.ts        # Project domain types
├── child.ts          # Child domain types
├── sponsorship.ts    # Sponsorship domain types
├── pagination.ts     # Pagination metadata types
└── api.ts            # API response wrapper types
```

#### Domain Type Examples

**Donor Types (`src/types/donor.ts`):**
```typescript
/**
 * Represents a donor who contributes to the organization.
 */
export interface Donor {
  id: number;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  discarded_at?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Form data for creating/editing donors.
 * Omits system-generated fields.
 */
export interface DonorFormData {
  name: string;
  email: string;
  phone?: string;
  address?: string;
}

/**
 * Result of merging multiple donors.
 */
export interface DonorMergeResult {
  success: boolean;
  merged_donor?: Donor;
  errors?: string[];
}
```

**Pagination Types (`src/types/pagination.ts`):**
```typescript
/**
 * Pagination metadata returned by API endpoints.
 */
export interface PaginationMeta {
  total_count: number;
  total_pages: number;
  current_page: number;
  per_page: number;
}

/**
 * Generic paginated API response wrapper.
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}
```

**API Response Types (`src/types/api.ts`):**
```typescript
import { Donor } from './donor';
import { Donation } from './donation';
import { PaginationMeta } from './pagination';

/**
 * API response for donors list endpoint.
 */
export interface DonorsApiResponse {
  donors: Donor[];
  meta: PaginationMeta;
}

/**
 * API response for donations list endpoint.
 */
export interface DonationsApiResponse {
  donations: Donation[];
  meta: PaginationMeta;
}
```

#### Barrel Export Pattern

**`src/types/index.ts`:**
```typescript
// Domain types
export * from './donor';
export * from './donation';
export * from './project';
export * from './child';
export * from './sponsorship';

// Utility types
export * from './pagination';
export * from './api';
```

**Usage in Components:**
```typescript
// Clean imports from single source
import { Donor, DonorFormData, PaginationMeta } from '../types';

const DonorForm: React.FC = () => {
  const [formData, setFormData] = useState<DonorFormData>({
    name: '',
    email: ''
  });

  // ...
};
```

**Best Practices:**
- Never duplicate type definitions across files
- Import from `'../types'` using barrel export
- Use `interface` for object shapes
- Use `type` for unions, primitives, or composed types
- Add JSDoc comments for complex types
- Group related types by domain

---

### Shared Component Pattern

#### When to Extract a Shared Component

- Logic is duplicated in 2+ components
- Component has clear, well-defined interface
- Behavior is consistent across usages
- Would reduce code duplication by 50+ lines

#### DonorAutocomplete Component

**Purpose:** Reusable autocomplete for donor selection with debounced search.

**Extracted from:** DonationForm, DonationList (100+ lines duplicated)

**Features:**
- Debounced search (300ms)
- Loading states
- Email hiding in dropdown
- Configurable size and required state

**Implementation:**
```typescript
// src/components/DonorAutocomplete.tsx
import React, { useState, useEffect } from 'react';
import { Autocomplete, TextField, CircularProgress } from '@mui/material';
import { Donor } from '../types';
import api from '../api/client';

interface DonorAutocompleteProps {
  value: Donor | null;
  onChange: (donor: Donor | null) => void;
  label?: string;
  size?: 'small' | 'medium';
  required?: boolean;
}

const DonorAutocomplete: React.FC<DonorAutocompleteProps> = ({
  value,
  onChange,
  label = 'Donor',
  size = 'medium',
  required = false,
}) => {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<Donor[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Debounced search effect
  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(() => {
      fetchDonors(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, open]);

  const fetchDonors = async (query: string) => {
    setLoading(true);
    try {
      const response = await api.get('/donors', {
        params: {
          q: { name_or_email_cont: query },
          page: 1,
          per_page: 50,
        },
      });
      setOptions(response.data.donors);
    } catch (error) {
      console.error('Failed to fetch donors:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Autocomplete
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      value={value}
      onChange={(_, newValue) => onChange(newValue)}
      onInputChange={(_, newInputValue) => setSearchQuery(newInputValue)}
      options={options}
      getOptionLabel={(option) => option.name}
      loading={loading}
      size={size}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          required={required}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
};

export default DonorAutocomplete;
```

**Usage:**
```typescript
// In DonationForm.tsx
import DonorAutocomplete from './DonorAutocomplete';

const DonationForm: React.FC = () => {
  const [selectedDonor, setSelectedDonor] = useState<Donor | null>(null);

  return (
    <DonorAutocomplete
      value={selectedDonor}
      onChange={setSelectedDonor}
      size="small"
      required
    />
  );
};
```

**Benefits:**
- DRY principle adherence
- Single source of truth for behavior
- Easier to add features (update once, affects all usages)
- Better testability (test component once, not in every usage)
- Type safety with exported interfaces

---

### React Router Multi-Page Architecture

**Implemented:** TICKET-030 (2025-10-20)

#### File Structure
```
src/
├── App.tsx                    # Router configuration (~30 lines)
├── pages/                     # Page components with state management
│   ├── DonorsPage.tsx        # Donor CRUD + search + merge (16 tests)
│   ├── DonorsPage.test.tsx
│   ├── DonationsPage.tsx     # Donation CRUD + filtering (8 tests)
│   ├── DonationsPage.test.tsx
│   ├── ProjectsPage.tsx      # Project CRUD (5 tests)
│   ├── ProjectsPage.test.tsx
│   ├── ChildrenPage.tsx      # Child sponsorship management
│   └── ChildrenPage.test.tsx
├── components/
│   ├── Layout.tsx            # Shared layout with Outlet (3 tests)
│   ├── Layout.test.tsx
│   ├── Navigation.tsx        # AppBar navigation (4 tests)
│   └── Navigation.test.tsx
└── types/                    # Centralized TypeScript types
```

#### Routing Configuration

```typescript
// src/App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import Layout from './components/Layout';
import DonorsPage from './pages/DonorsPage';
import DonationsPage from './pages/DonationsPage';
import ProjectsPage from './pages/ProjectsPage';
import ChildrenPage from './pages/ChildrenPage';
import theme from './theme';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/donations" replace />} />
              <Route path="donations" element={<DonationsPage />} />
              <Route path="donors" element={<DonorsPage />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="children" element={<ChildrenPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App;
```

#### Layout Component

```typescript
// src/components/Layout.tsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import { Container } from '@mui/material';
import Navigation from './Navigation';

const Layout: React.FC = () => {
  return (
    <>
      <Navigation />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Outlet />  {/* Page components render here */}
      </Container>
    </>
  );
};

export default Layout;
```

#### Navigation Component

```typescript
// src/components/Navigation.tsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { AppBar, Toolbar, Button, Typography } from '@mui/material';

const Navigation: React.FC = () => {
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Donation Tracker
        </Typography>
        <Button
          component={NavLink}
          to="/donations"
          color="inherit"
          sx={{ '&.active': { backgroundColor: 'rgba(255,255,255,0.1)' } }}
        >
          Donations
        </Button>
        <Button
          component={NavLink}
          to="/donors"
          color="inherit"
          sx={{ '&.active': { backgroundColor: 'rgba(255,255,255,0.1)' } }}
        >
          Donors
        </Button>
        <Button
          component={NavLink}
          to="/projects"
          color="inherit"
          sx={{ '&.active': { backgroundColor: 'rgba(255,255,255,0.1)' } }}
        >
          Projects
        </Button>
        <Button
          component={NavLink}
          to="/children"
          color="inherit"
          sx={{ '&.active': { backgroundColor: 'rgba(255,255,255,0.1)' } }}
        >
          Children
        </Button>
      </Toolbar>
    </AppBar>
  );
};

export default Navigation;
```

#### Page Component Pattern

```typescript
// src/pages/DonorsPage.tsx
import React, { useState, useEffect } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Donor, PaginationMeta } from '../types';
import api from '../api/client';
import DonorList from '../components/DonorList';
import DonorForm from '../components/DonorForm';

const DonorsPage: React.FC = () => {
  // Page-level state management (no Context API needed yet)
  const [donors, setDonors] = useState<Donor[]>([]);
  const [editingDonor, setEditingDonor] = useState<Donor | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Data fetching at page level
  useEffect(() => {
    fetchDonors();
  }, [currentPage, searchQuery]);

  const fetchDonors = async () => {
    try {
      const response = await api.get('/donors', {
        params: {
          page: currentPage,
          q: { name_or_email_cont: searchQuery },
        },
      });
      setDonors(response.data.donors);
      setPaginationMeta(response.data.meta);
    } catch (error) {
      console.error('Failed to fetch donors:', error);
    }
  };

  const handleCreateDonor = async (formData: DonorFormData) => {
    try {
      await api.post('/donors', { donor: formData });
      fetchDonors();
    } catch (error) {
      console.error('Failed to create donor:', error);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Donor Management
      </Typography>

      <DonorForm onSubmit={handleCreateDonor} />

      <DonorList
        donors={donors}
        onEdit={setEditingDonor}
        onDelete={fetchDonors}
        pagination={paginationMeta}
        onPageChange={setCurrentPage}
      />
    </Box>
  );
};

export default DonorsPage;
```

#### Best Practices

- **Keep App.tsx minimal** - Only router configuration, providers stay at app level
- **Page-level state** - Each page manages its own state (useState, useEffect)
- **No Context API yet** - Not needed until state sharing across pages is required
- **Index route redirect** - `/` redirects to primary page (`/donations`)
- **Browser navigation** - Back/forward buttons work automatically with React Router
- **E2E testing** - Always add Cypress navigation tests for new routes
- **MUI integration** - Use `component={NavLink}` for styled navigation buttons
- **Active state styling** - Use `&.active` selector for current route highlighting

#### Benefits

- **Single Responsibility**: Each page handles one domain (donors, donations, projects)
- **Maintainability**: Easy to find and modify code (318 lines → 3 focused pages)
- **Scalability**: Simple to add new pages (Settings, Reports, Analytics)
- **User Experience**: URL-based routing, browser back/forward navigation
- **Testing**: Can test pages independently with proper mocks
- **Performance**: Can implement lazy loading if needed later

---

## Data Retention & Cascade Delete Policy

**Policy:** Prevent accidental data loss by restricting deletion of models with dependent records.

### Implementation Pattern

**Project Model Example (TICKET-038):**

```ruby
class Project < ApplicationRecord
  has_many :donations, dependent: :restrict_with_exception
  has_many :sponsorships, dependent: :restrict_with_exception

  before_destroy :prevent_system_project_deletion

  def can_be_deleted?
    !system? && donations.empty? && sponsorships.empty?
  end

  private

  def prevent_system_project_deletion
    if system?
      errors.add(:base, "System projects cannot be deleted")
      throw(:abort)
    end
  end
end
```

**Deletion Rules:**

- **System projects**: Cannot be deleted (enforced by `before_destroy` callback)
- **Projects with donations**: Cannot be deleted (raises `ActiveRecord::DeleteRestrictionError`)
- **Projects with sponsorships**: Cannot be deleted (raises `ActiveRecord::DeleteRestrictionError`)
- **Empty projects**: Can be deleted safely

**Note:** Rails 8 uses `dependent: :restrict_with_exception` (not `restrict_with_error`)

### Frontend Integration

**API includes computed fields via ProjectPresenter:**

```ruby
class ProjectPresenter < BasePresenter
  def as_json(options = {})
    {
      id: object.id,
      title: object.title,
      description: object.description,
      donations_count: object.donations.count,
      sponsorships_count: object.sponsorships.count,
      can_be_deleted: object.can_be_deleted?  # Computed field
    }
  end
end
```

**React component shows/hides delete button:**

```tsx
<Button
  variant="contained"
  color="error"
  disabled={!project.can_be_deleted}
  onClick={() => handleDelete(project.id)}
>
  Delete
</Button>

{!project.can_be_deleted && (
  <Typography variant="caption" color="error">
    Cannot delete: {project.donations_count} donations,
    {project.sponsorships_count} sponsorships
  </Typography>
)}
```

**Benefits:**

- Prevents accidental data loss
- Clear user feedback on why deletion is blocked
- Backend enforcement (can't bypass via API)
- Frontend UX optimization (hide impossible actions)

**Related Patterns:**

- Donor soft delete (TICKET-001) uses `Discard` gem with `dependent: :restrict_with_exception`
- See docs/project/data-models.md for database schema and indexing strategy

---

### Custom Hooks Library (TICKET-032, TICKET-066)

**Purpose:** Extract and reuse stateful logic across components

**When to Create Custom Hooks:**
- Logic duplicated in 2+ components
- Complex stateful logic (useState + useEffect combinations)
- Would reduce duplication by 20+ lines
- Clear, reusable interface

**Hook Location:** `src/hooks/` with barrel export in `src/hooks/index.ts`

**Implemented Hooks:**

**1. `useDebouncedValue<T>(value: T, delay: number = 300): T`**
- Debounces value changes to prevent excessive API calls
- Returns debounced value that updates after delay
- Use case: Search inputs, filter fields

```tsx
const [searchQuery, setSearchQuery] = useState('');
const debouncedQuery = useDebouncedValue(searchQuery, 300);

useEffect(() => {
  // API call only fires after 300ms of no typing
  fetchResults(debouncedQuery);
}, [debouncedQuery]);
```

**2. `usePagination(initialPage: number = 1)`**
- Manages pagination state and handlers
- Returns: `currentPage`, `setCurrentPage`, `paginationMeta`, `setPaginationMeta`, `handlePageChange`, `resetToFirstPage`
- Use case: List pages (DonorsPage, DonationsPage)

```tsx
const { currentPage, paginationMeta, setPaginationMeta, handlePageChange, resetToFirstPage } = usePagination();

// Reset to page 1 when search changes
useEffect(() => {
  resetToFirstPage();
}, [debouncedQuery, resetToFirstPage]);

// MUI Pagination component
<Pagination count={paginationMeta.total_pages} page={currentPage} onChange={handlePageChange} />
```

**3. `useRansackFilters()`**
- Manages Ransack query filter state
- Returns: `filters`, `setFilter`, `clearFilters`, `buildQueryParams`
- Use case: Pages with MULTIPLE filters (DonationsPage with date range + donor filter)
- **Not recommended** for single-filter scenarios (use direct query building instead)

```tsx
const { setFilter, buildQueryParams } = useRansackFilters();

// Update filters
useEffect(() => {
  setFilter('date_gteq', startDate);
  setFilter('date_lteq', endDate);
  setFilter('donor_id_eq', donorId);
}, [startDate, endDate, donorId, setFilter]);

// Build query params
const params = { page: currentPage, per_page: 10, ...buildQueryParams() };
```

**4. `useChildren()`**
- Manages children data fetching with sponsorships, pagination, and search
- Returns: `children`, `sponsorships`, `loading`, `error`, `paginationMeta`, `fetchChildren`, `refetch`
- Use case: ChildrenPage (eliminated 69 lines of duplication)

```tsx
const { children, sponsorships, loading, error, paginationMeta, fetchChildren } = useChildren();

// Fetch with filters
useEffect(() => {
  fetchChildren({
    includeSponsorship: true,
    includeDiscarded: showArchived,
    page: currentPage,
    perPage: 10,
    search: debouncedQuery,
  });
}, [showArchived, currentPage, debouncedQuery, fetchChildren]);

// Refetch after mutations
const handleCreate = async (data) => {
  await apiClient.post('/api/children', { child: data });
  fetchChildren({ includeSponsorship: true, includeDiscarded: showArchived });
};
```

**Benefits:**
- Centralized data fetching logic
- Automatic sponsorship map building
- Built-in loading and error states
- Pagination metadata management
- Fixes bugs where handlers ignored filters

---

### React Router Multi-Page Architecture

**File Structure:**
```
src/
├── App.tsx                    # Router configuration
├── pages/                     # Page components (state management)
│   ├── DonorsPage.tsx
│   ├── DonationsPage.tsx
│   └── ProjectsPage.tsx
├── components/
│   ├── Layout.tsx            # Shared layout with Outlet
│   └── Navigation.tsx        # AppBar navigation
└── types/                    # Centralized types
```

**Pattern:**
```tsx
// src/App.tsx
<BrowserRouter>
  <Routes>
    <Route path="/" element={<Layout />}>
      <Route index element={<Navigate to="/donations" replace />} />
      <Route path="donations" element={<DonationsPage />} />
      <Route path="donors" element={<DonorsPage />} />
    </Route>
  </Routes>
</BrowserRouter>

// src/components/Layout.tsx
const Layout = () => (
  <Container maxWidth="sm">
    <Navigation />
    <Outlet />  {/* Pages render here */}
  </Container>
);
```

**Best Practices:**
- Keep App.tsx minimal (router only)
- Page-level state (useState, useEffect)
- No Context API yet (not needed)
- Index route redirects to primary page
- E2E tests for all routes
- Use `component={NavLink}` for MUI buttons

---

### Native Git Hooks (No Stashing!)

**Why:** Pre-commit framework caused data loss via failed unstashing

**Key Features:**
- ✅ No stashing - unstaged changes remain in working directory
- ✅ Automatic backups - every commit creates `.git/backups/` backup
- ✅ Recovery tool - `bash scripts/recover-backup.sh`

**Installation:**
```bash
bash scripts/install-native-hooks.sh
```

**Recovery:**
```bash
# View backups
bash scripts/recover-backup.sh

# Apply backup
bash scripts/recover-backup.sh .git/backups/pre-commit_YYYYMMDD_HHMMSS.patch
```

**Backup System:**
- 3 files per commit: unstaged patch, staged patch, untracked list
- Keeps last 20 backups
- Stored in `.git/backups/` (not tracked)

---

*Last updated: 2025-11-04*
