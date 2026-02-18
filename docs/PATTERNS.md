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

### Admin Controller Pattern

**Purpose:** Web interface for administrative operations (CSV import, bulk operations)

**Implementation:**
```ruby
# app/controllers/api/admin_controller.rb
class AdminController < ApplicationController
  def import_stripe_payments
    temp_file = Tempfile.new(['stripe_import', '.csv'])
    temp_file.binmode  # Binary mode for non-UTF-8 CSV files
    temp_file.write(params[:file].read)
    temp_file.rewind

    importer = StripeCsvBatchImporter.new(temp_file.path)
    result = importer.import

    render json: {
      success_count: result[:succeeded_count],
      skipped_count: result[:skipped_count],
      failed_count: result[:failed_count],
      needs_attention_count: result[:needs_attention_count]
    }
  rescue StandardError => e
    render json: { error: "Import failed: #{e.message}" }, status: :internal_server_error
  ensure
    temp_file&.close
    temp_file&.unlink
  end
end
```

**Key Features:**
- Reuses existing service layer (StripeCsvBatchImporter)
- Binary file handling (`binmode`) for encoding compatibility (handles non-UTF-8 CSV files)
- Timeout-aware (frontend uses 120s timeout for large imports)
- Returns detailed status counts (succeeded/skipped/failed/needs_attention)
- Proper cleanup (`ensure` block closes and deletes temp file)

**Frontend Integration:**
```typescript
// AdminPage.tsx - CSV import section
const handleFileUpload = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post('/api/admin/import_stripe_payments', formData, {
    timeout: 120000, // 2 minutes for large files
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  // Show results to user
  console.log(`Success: ${response.data.success_count}, Skipped: ${response.data.skipped_count}`);
};
```

**See:** TICKET-091 (Stripe CSV import GUI)

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

### Authentication & Authorization (TICKET-008)

**Pattern:** Google OAuth2 + JWT tokens for single-tenant admin application

#### Backend Authentication

**AuthController (OAuth + Dev Login):**
```ruby
# app/controllers/auth_controller.rb
class AuthController < ApplicationController
  skip_before_action :authenticate_request, only: [:google_oauth2, :dev_login]

  def google_oauth2
    auth = request.env["omniauth.auth"]

    # Domain restriction: Only @projectsforasia.com emails
    unless auth.info.email.end_with?("@projectsforasia.com")
      render json: { error: "Access denied. Only @projectsforasia.com email addresses are allowed." }, status: :forbidden
      return
    end

    user = User.find_or_initialize_by(provider: auth.provider, uid: auth.uid)
    user.update!(email: auth.info.email, name: auth.info.name, avatar_url: auth.info.image)

    token = JsonWebToken.encode({ user_id: user.id })

    user_data = { id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url }

    # Redirect to frontend callback with token and user data
    frontend_url = ENV.fetch("FRONTEND_URL", "http://localhost:3000")
    redirect_to "#{frontend_url}/auth/callback?token=#{token}&user=#{CGI.escape(user_data.to_json)}", allow_other_host: true
  end

  def dev_login
    # Development/E2E testing only - uses seeded admin user
    user = User.find_by!(provider: "google_oauth2", uid: "admin_test_uid")
    token = JsonWebToken.encode({ user_id: user.id })
    user_data = { id: user.id, email: user.email, name: user.name }

    frontend_url = ENV.fetch("FRONTEND_URL", "http://localhost:3000")
    redirect_to "#{frontend_url}/auth/callback?token=#{token}&user=#{CGI.escape(user_data.to_json)}", allow_other_host: true
  end
end
```

**ApplicationController (JWT Middleware):**
```ruby
# app/controllers/application_controller.rb
class ApplicationController < ActionController::API
  before_action :authenticate_request

  private

  def authenticate_request
    header = request.headers['Authorization']
    token = header.split(' ').last if header
    decoded = JsonWebToken.decode(token)
    @current_user = User.find(decoded[:user_id])
  rescue ActiveRecord::RecordNotFound, JWT::DecodeError
    render json: { error: 'Authorization token missing or invalid' }, status: :unauthorized
  end
end
```

**JWT Service:**
```ruby
# app/services/json_web_token.rb
class JsonWebToken
  SECRET_KEY = Rails.application.credentials.jwt_secret_key || ENV['JWT_SECRET_KEY']

  def self.encode(payload, exp = 30.days.from_now)
    payload[:exp] = exp.to_i
    JWT.encode(payload, SECRET_KEY)
  end

  def self.decode(token)
    decoded = JWT.decode(token, SECRET_KEY)[0]
    HashWithIndifferentAccess.new(decoded)
  end
end
```

**OmniAuth Configuration:**
```ruby
# config/initializers/omniauth.rb
OmniAuth.config.allowed_request_methods = [:get, :post]  # CRITICAL for GET requests
OmniAuth.config.logger = Rails.logger
OmniAuth.config.silence_get_warning = true if Rails.env.production?

Rails.application.config.middleware.use OmniAuth::Builder do
  provider :google_oauth2,
           ENV["GOOGLE_CLIENT_ID"],
           ENV["GOOGLE_CLIENT_SECRET"],
           {
             scope: "email,profile",
             prompt: "select_account",
             image_aspect_ratio: "square",
             image_size: 50,
             access_type: "online",
             name: "google_oauth2"
           }
end
```

**Authentication Flow:**
1. User clicks "Sign in with Google" on `/login`
2. Frontend redirects to `/auth/google_oauth2`
3. OmniAuth handles Google OAuth dance
4. Backend validates email domain (@projectsforasia.com)
5. Backend generates JWT (30-day expiration)
6. Backend redirects to frontend `/auth/callback?token=...&user=...`
7. Frontend stores JWT in localStorage
8. Frontend includes `Authorization: Bearer <token>` on all API requests
9. Backend middleware validates JWT and sets `@current_user`

**Dev Login (Development/E2E):**
- Endpoint: `GET /auth/dev_login`
- Uses seeded admin user (admin@projectsforasia.com, uid: admin_test_uid)
- Generates real JWT token
- Available in development/test environments only
- Accessible via "Dev Login" button on LoginPage

**Protected Endpoints:**
- All `/api/*` routes require authentication
- Exceptions: `/api/health`, `/auth/*`, `/rails/health`
- 401 response for missing/invalid tokens

**Domain Restriction:**
- Only @projectsforasia.com emails allowed
- Enforced in AuthController before user creation
- Returns 403 Forbidden for unauthorized domains

**See:** TICKET-008 for full implementation details

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

### Frontend Authentication Pattern (TICKET-008)

**Pattern:** AuthContext + useAuth Hook + API Interceptors + Protected Routes

#### AuthContext + useAuth Hook

**Implementation:**
```typescript
// src/contexts/AuthContext.tsx
import React, { createContext, useState, useContext, ReactNode } from 'react';

interface User {
  id: number;
  email: string;
  name: string;
  avatar_url?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem('auth_user');
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('auth_token')
  );

  const login = (token: string, user: User) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
    setToken(token);
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

#### API Client Interceptor

**Implementation:**
```typescript
// src/api/client.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001',
});

// Request interceptor: Add Authorization header
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: Auto-logout on 401
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

#### Protected Routes

**Implementation:**
```typescript
// src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
```

**Usage in App.tsx:**
```typescript
// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DonorsPage from './pages/DonorsPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/donors" replace />} />
            <Route path="donors" element={<ProtectedRoute><DonorsPage /></ProtectedRoute>} />
            <Route path="donations" element={<ProtectedRoute><DonationsPage /></ProtectedRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
```

#### Login Page

**Implementation:**
```typescript
// src/pages/LoginPage.tsx
import React from 'react';
import { Box, Button, Container, Typography, Divider } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import DeveloperModeIcon from '@mui/icons-material/DeveloperMode';

const LoginPage: React.FC = () => {
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  const handleGoogleSignIn = () => {
    window.location.href = `${apiUrl}/auth/google_oauth2`;
  };

  const handleDevLogin = () => {
    window.location.href = `${apiUrl}/auth/dev_login`;
  };

  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <Container maxWidth="sm">
      <Box sx={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography component="h1" variant="h4" gutterBottom>
          Donation Tracker
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Sign in to continue
        </Typography>

        <Button
          variant="contained"
          size="large"
          startIcon={<GoogleIcon />}
          onClick={handleGoogleSignIn}
          fullWidth
        >
          Sign in with Google
        </Button>

        {isDevelopment && (
          <>
            <Divider sx={{ my: 3, width: '100%' }}>OR</Divider>
            <Button
              variant="outlined"
              size="large"
              startIcon={<DeveloperModeIcon />}
              onClick={handleDevLogin}
              fullWidth
              color="secondary"
            >
              Dev Login (Development Only)
            </Button>
          </>
        )}
      </Box>
    </Container>
  );
};

export default LoginPage;
```

#### Auth Callback Page

**Implementation:**
```typescript
// src/pages/AuthCallbackPage.tsx
import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CircularProgress, Box, Typography } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const AuthCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    const userJson = searchParams.get('user');

    if (token && userJson) {
      try {
        const user = JSON.parse(decodeURIComponent(userJson));
        login(token, user);
        navigate('/');
      } catch (error) {
        console.error('Failed to parse user data:', error);
        navigate('/login');
      }
    } else {
      navigate('/login');
    }
  }, [searchParams, login, navigate]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 8 }}>
      <CircularProgress />
      <Typography sx={{ mt: 2 }}>Signing you in...</Typography>
    </Box>
  );
};

export default AuthCallbackPage;
```

#### E2E Authentication Helper

**Implementation:**
```typescript
// cypress/support/commands.ts
declare global {
  namespace Cypress {
    interface Chainable {
      login(): Chainable<void>;
    }
  }
}

Cypress.Commands.add('login', () => {
  cy.request({
    method: 'GET',
    url: `${Cypress.env('apiUrl')}/auth/dev_login`,
    followRedirect: false,
  }).then((response) => {
    const redirectUrl = new URL(response.headers.location);
    const token = redirectUrl.searchParams.get('token');
    const userJson = redirectUrl.searchParams.get('user');

    if (token && userJson) {
      Cypress.env('auth_token', token);
      Cypress.env('auth_user', userJson);
    }
  });
});

// cypress/support/e2e.ts - Auto-inject auth into cy.visit()
Cypress.Commands.overwrite('visit', (originalFn, url, options) => {
  return originalFn(url, {
    ...options,
    onBeforeLoad(win) {
      const authToken = Cypress.env('auth_token');
      const authUser = Cypress.env('auth_user');
      if (authToken && authUser) {
        win.localStorage.setItem('auth_token', authToken);
        win.localStorage.setItem('auth_user', authUser);
      }
    },
  });
});
```

**Usage in Tests:**
```typescript
// cypress/e2e/donors.cy.ts
describe('Donors Page', () => {
  beforeEach(() => {
    cy.login();  // Authenticate before each test
    cy.visit('/donors');  // Auth auto-injected
  });

  it('displays donor list', () => {
    cy.get('[data-testid="donor-list"]').should('exist');
  });
});
```

**See:** TICKET-008, authentication.cy.ts for E2E tests

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

### Quick Create Dialog Pattern (Modal Entity Creation)

**Purpose:** Create entities (donors, projects, children) without leaving current page, preserving parent form state.

**When to Use:**
- User creating donation but donor doesn't exist yet
- Prevents context switching and data loss
- Modal workflow for related entity creation

#### Single Entity Dialog

**Pattern:** QuickDonorCreateDialog (one form)

**Implementation:**
```tsx
// src/components/QuickDonorCreateDialog.tsx
import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, Snackbar, Alert } from '@mui/material';
import DonorForm from './DonorForm';
import { DonorFormData, Donor } from '../types';
import apiClient from '../api/client';

interface QuickDonorCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (donor: Donor) => void;
  preFillData?: Partial<DonorFormData>;
}

const QuickDonorCreateDialog: React.FC<QuickDonorCreateDialogProps> = ({
  open,
  onClose,
  onSuccess,
  preFillData,
}) => {
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: DonorFormData) => {
    try {
      const response = await apiClient.post('/api/donors', { donor: data });
      onSuccess(response.data.donor); // Auto-select in parent autocomplete
      onClose();
    } catch (err: any) {
      // Handle 422 validation errors and network errors
      if (err.response?.status === 422) {
        const errors = err.response.data.errors;
        setError(Array.isArray(errors) ? errors.join(', ') : errors);
      } else {
        setError('Failed to create donor. Please try again.');
      }
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Donor</DialogTitle>
        <DialogContent>
          <DonorForm onSubmit={handleSubmit} initialData={preFillData} />
        </DialogContent>
      </Dialog>
      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError(null)}>
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>
    </>
  );
};

export default QuickDonorCreateDialog;
```

**Usage in Parent Form:**
```tsx
// src/components/DonationForm.tsx
import QuickDonorCreateDialog from './QuickDonorCreateDialog';

const DonationForm: React.FC = () => {
  const [donor, setDonor] = useState<Donor | null>(null);
  const [donorDialogOpen, setDonorDialogOpen] = useState(false);
  const [donorSearchInput, setDonorSearchInput] = useState('');

  return (
    <>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
        <DonorAutocomplete
          value={donor}
          onChange={setDonor}
          onInputChange={(_, value) => setDonorSearchInput(value)}
          size="small"
          required
        />
        <IconButton
          aria-label="create donor"
          onClick={() => setDonorDialogOpen(true)}
        >
          <AddIcon />
        </IconButton>
      </Box>

      <QuickDonorCreateDialog
        open={donorDialogOpen}
        onClose={() => setDonorDialogOpen(false)}
        onSuccess={(newDonor) => {
          setDonor(newDonor);  // Auto-select in autocomplete
          setDonorSearchInput('');  // Clear search
        }}
        preFillData={{ name: donorSearchInput }}  // Pre-fill from search
      />
    </>
  );
};
```

#### Tabbed Multi-Entity Dialog

**Pattern:** QuickEntityCreateDialog (Child/Project tabs)

**Implementation:**
```tsx
// src/components/QuickEntityCreateDialog.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Tabs,
  Tab,
  Box,
  Snackbar,
  Alert,
} from '@mui/material';
import ChildForm from './ChildForm';
import ProjectForm from './ProjectForm';
import { ChildFormData, Child, ProjectFormData, Project } from '../types';
import apiClient from '../api/client';

interface QuickEntityCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onChildCreated?: (child: Child) => void;
  onProjectCreated?: (project: Project) => void;
  preFillText?: string;
}

const QuickEntityCreateDialog: React.FC<QuickEntityCreateDialogProps> = ({
  open,
  onClose,
  onChildCreated,
  onProjectCreated,
  preFillText = '',
}) => {
  const [currentTab, setCurrentTab] = useState<'child' | 'project'>('child');
  const [childError, setChildError] = useState<string | null>(null);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [dialogKey, setDialogKey] = useState(0);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setDialogKey((prev) => prev + 1);  // Force form reset
      setCurrentTab('child');
      setChildError(null);
      setProjectError(null);
    }
  }, [open]);

  const handleTabChange = (newTab: 'child' | 'project') => {
    setChildError(null);  // Clear errors on tab switch
    setProjectError(null);
    setCurrentTab(newTab);
  };

  const handleChildSubmit = async (data: ChildFormData) => {
    try {
      const response = await apiClient.post('/api/children', { child: data });
      if (onChildCreated) onChildCreated(response.data.child);
      onClose();
    } catch (err: any) {
      if (err.response?.status === 422) {
        const errors = err.response.data.errors;
        setChildError(Array.isArray(errors) ? errors.join(', ') : errors);
      } else {
        setChildError('Failed to create child. Please try again.');
      }
    }
  };

  const handleProjectSubmit = async (data: ProjectFormData) => {
    try {
      const response = await apiClient.post('/api/projects', { project: data });
      if (onProjectCreated) onProjectCreated(response.data.project);
      onClose();
    } catch (err: any) {
      if (err.response?.status === 422) {
        const errors = err.response.data.errors;
        setProjectError(Array.isArray(errors) ? errors.join(', ') : errors);
      } else {
        setProjectError('Failed to create project. Please try again.');
      }
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Entity</DialogTitle>
        <Tabs value={currentTab} onChange={(_, value) => handleTabChange(value)}>
          <Tab label="Create Child" value="child" />
          <Tab label="Create Project" value="project" />
        </Tabs>
        <DialogContent key={dialogKey}>
          <Box sx={{ display: currentTab === 'child' ? 'block' : 'none' }}>
            <ChildForm
              onSubmit={handleChildSubmit}
              initialData={{ name: preFillText }}
            />
          </Box>
          <Box sx={{ display: currentTab === 'project' ? 'block' : 'none' }}>
            <ProjectForm
              onSubmit={handleProjectSubmit}
              initialTitle={preFillText}
            />
          </Box>
        </DialogContent>
      </Dialog>

      {/* Separate Snackbar per tab for error isolation */}
      <Snackbar open={!!childError} autoHideDuration={6000} onClose={() => setChildError(null)}>
        <Alert severity="error" onClose={() => setChildError(null)}>
          {childError}
        </Alert>
      </Snackbar>
      <Snackbar open={!!projectError} autoHideDuration={6000} onClose={() => setProjectError(null)}>
        <Alert severity="error" onClose={() => setProjectError(null)}>
          {projectError}
        </Alert>
      </Snackbar>
    </>
  );
};

export default QuickEntityCreateDialog;
```

**Key Features:**
- **Pre-fill Support:** Pass search input to pre-fill name/title
- **Auto-selection:** Created entity immediately selected in parent autocomplete
- **Error Handling:** 422 validation errors + network errors via Snackbar
- **Error Isolation (Tabbed):** Separate error states per tab, cleared on tab switch
- **Form Reset:** `dialogKey` pattern forces form reset when dialog closes (fresh state on reopen)
- **State Preservation:** Parent form data preserved during entity creation
- **No Cancel Button:** User closes via X or ESC (consistent with form pattern)
- **API in Dialog:** Dialog handles API calls, form only returns data

**See:** TICKET-021 (Quick Entity Creation), TICKET-054 (SponsorshipModal reference)

---

### Grouped Autocomplete with Type Badges & Gender Icons

**Purpose:** Visual clarity for autocomplete options with multiple entity types (children vs projects) and child gender.

**Pattern:** ProjectOrChildAutocomplete

**Implementation:**
```tsx
// src/components/ProjectOrChildAutocomplete.tsx
import React, { useState, useEffect } from 'react';
import { Autocomplete, TextField, Chip, CircularProgress } from '@mui/material';
import { Boy, Girl } from '@mui/icons-material';
import apiClient from '../api/client';
import { Child, Project } from '../types';

type ProjectOrChild = (Child & { type: 'child' }) | (Project & { type: 'project' });

interface ProjectOrChildAutocompleteProps {
  value: ProjectOrChild | null;
  onChange: (value: ProjectOrChild | null) => void;
  label?: string;
  size?: 'small' | 'medium';
  required?: boolean;
}

const ProjectOrChildAutocomplete: React.FC<ProjectOrChildAutocompleteProps> = ({
  value,
  onChange,
  label = 'Donation For',
  size = 'medium',
  required = false,
}) => {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ProjectOrChild[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch both children and projects
  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(() => {
      fetchOptions(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, open]);

  const fetchOptions = async (query: string) => {
    setLoading(true);
    try {
      const [childrenRes, projectsRes] = await Promise.all([
        apiClient.get('/api/children', {
          params: { q: { name_cont: query }, page: 1, per_page: 25 },
        }),
        apiClient.get('/api/projects', {
          params: { q: { title_cont: query }, page: 1, per_page: 25 },
        }),
      ]);

      const children = childrenRes.data.children.map((c: Child) => ({ ...c, type: 'child' as const }));
      const projects = projectsRes.data.projects.map((p: Project) => ({
        ...p,
        name: p.title,  // Normalize to 'name' for getOptionLabel
        type: 'project' as const,
      }));

      setOptions([...children, ...projects]);
    } catch (error) {
      console.error('Failed to fetch options:', error);
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
      groupBy={(option) => (option.type === 'project' ? 'Projects' : 'Children')}
      loading={loading}
      size={size}
      renderOption={(props, option) => (
        <li {...props}>
          <Chip
            label={option.type === 'child' ? 'Child' : option.project_type}
            size="small"
            color={option.type === 'child' ? 'primary' : 'secondary'}
            sx={{ mr: 1 }}
          />
          {option.type === 'child' && (
            option.gender === 'girl' ? <Girl sx={{ mr: 0.5 }} /> : <Boy sx={{ mr: 0.5 }} />
          )}
          {option.name}
        </li>
      )}
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

export default ProjectOrChildAutocomplete;
```

**Features:**
- **Grouped Results:** "Children" and "Projects" sections with `groupBy` prop
- **Type Badges:** Chip component shows "Child" / "General" / "Campaign"
- **Gender Icons:** Boy/Girl icons for children (null defaults to Boy)
- **Dual Entity Fetch:** Parallel API calls for children + projects
- **Normalized Data:** Projects use `title` but expose as `name` for consistent interface
- **Debounced Search:** 300ms delay to reduce API calls
- **Loading States:** CircularProgress indicator during fetch

**Child Gender Field:**
- Optional field (boy/girl/null) on Child model
- Icons: `<Boy />` for boy/null, `<Girl />` for girl
- Used in ChildList (after name, hidden if null) and autocomplete (before name)
- Full validation and presenter support in backend

**See:** TICKET-052 (Grouped Autocomplete + Gender Field)

---

### StandardDialog Pattern (TICKET-127)

**Purpose:** Generic dialog wrapper component that eliminates boilerplate and ensures consistent dialog UX across the application.

**Extracted:** TICKET-127 (2025-12-05) - Eliminated 180+ lines of duplication from 3 dialogs

**Implementation:**
```typescript
// src/components/StandardDialog.tsx
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  Snackbar,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface StandardDialogProps {
  open: boolean;              // Dialog open state
  onClose: () => void;        // Close handler
  title: string;              // Dialog title
  children: React.ReactNode;  // Form/content to render
  error?: string | null;      // Optional error message
  onErrorClose?: () => void;  // Error dismissal handler
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';  // Dialog width (default 'sm')
}

const StandardDialog: React.FC<StandardDialogProps> = ({
  open,
  onClose,
  title,
  children,
  error = null,
  onErrorClose,
  maxWidth = 'sm',
}) => {
  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth={maxWidth} fullWidth>
        <DialogTitle>
          {title}
          <IconButton
            aria-label="close"
            onClick={onClose}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ mt: 1 }}>
            {children}
          </Box>
        </DialogContent>
      </Dialog>

      {/* Integrated error handling */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={onErrorClose}
      >
        <Alert severity="error" onClose={onErrorClose}>
          {error}
        </Alert>
      </Snackbar>
    </>
  );
};

export default StandardDialog;
```

**Usage Example:**
```typescript
// src/components/SponsorshipModal.tsx
import React, { useState } from 'react';
import StandardDialog from './StandardDialog';
import SponsorshipForm from './SponsorshipForm';
import { SponsorshipFormData } from '../types';
import apiClient from '../api/client';

interface SponsorshipModalProps {
  open: boolean;
  onClose: () => void;
  childName: string;
  onSuccess: () => void;
}

const SponsorshipModal: React.FC<SponsorshipModalProps> = ({
  open,
  onClose,
  childName,
  onSuccess,
}) => {
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: SponsorshipFormData) => {
    try {
      await apiClient.post('/api/sponsorships', { sponsorship: data });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'An unexpected error occurred');
    }
  };

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title={`Add Sponsor for ${childName}`}
      error={error}
      onErrorClose={() => setError(null)}
    >
      <SponsorshipForm onSubmit={handleSubmit} />
    </StandardDialog>
  );
};

export default SponsorshipModal;
```

**Features:**
- Close button (X) with CloseIcon in DialogTitle (absolute positioned)
- Standard sizing: `maxWidth={maxWidth} fullWidth`
- Standard padding: `DialogContent sx={{ pt: 3 }}`, `Box sx={{ mt: 1 }}`
- Integrated Snackbar + Alert error handling (optional error prop)
- Single source of truth for dialog UX

**Benefits:**
- Eliminates 60-80 lines of boilerplate per dialog
- Ensures consistent close button, sizing, padding, error handling
- Future dialogs automatically inherit consistent UX
- Single place to fix dialog-wide bugs

**Current Usage:**
- SponsorshipModal (82 → 54 lines)
- QuickDonorCreateDialog (105 → 65 lines)
- QuickEntityCreateDialog (192 → 137 lines) - supports tabs + conditional content

**See:** TICKET-127

---

### Form Component Pattern

**Standard:** All form components follow consistent UX patterns for maintainability

**Button Configuration:**
- **Submit button:** Full-width, primary color (`variant="contained" color="primary" fullWidth`)
- **Cancel button:** Conditional - only in edit mode for inline page forms
  - **Inline page forms (CREATE mode)**: NO Cancel - user navigates away via page links
  - **Inline page forms (EDIT mode)**: YES Cancel - exits edit mode back to list view
  - **Modal/Dialog forms**: NO Cancel - dialog has close X button instead
- **Cancel styling:** Error color (`color="error"`) for visual distinction
- **Placement:** Bottom of form, side-by-side layout in edit mode

**Example (Inline Page Form - CREATE mode):**
```tsx
<Box component="form" onSubmit={handleSubmit}>
  {/* Form fields */}
  <TextField label="Name" size="small" fullWidth required />

  {/* Submit button only */}
  <Button type="submit" variant="contained" color="primary" fullWidth>
    Submit
  </Button>
</Box>
```

**Example (Inline Page Form - EDIT mode):**
```tsx
<Box component="form" onSubmit={handleSubmit}>
  {/* Form fields */}
  <TextField label="Name" size="small" fullWidth required />

  {/* Conditional buttons based on edit mode */}
  {initialData && onCancel ? (
    <Stack direction="row" spacing={2}>
      <Button type="submit" variant="contained" color="primary" fullWidth>
        Update
      </Button>
      <Button variant="outlined" color="error" onClick={onCancel} fullWidth>
        Cancel
      </Button>
    </Stack>
  ) : (
    <Button type="submit" variant="contained" color="primary" fullWidth>
      Submit
    </Button>
  )}
</Box>
```

**Props:**
- `onSubmit: (data: FormData) => Promise<void>` - Required
- `initialData?: FormData` - Optional (edit mode if provided)
- `onCancel?: () => void` - Optional (Cancel button shows only when BOTH `initialData` AND `onCancel` provided)

**Rationale:**
- CREATE mode: No Cancel needed (user navigates away via page links)
- EDIT mode: Cancel exits edit mode back to list view
- Modal forms: No Cancel needed (dialog has close X)
- Error color on Cancel provides clear visual distinction from primary action
- Side-by-side layout in edit mode is mobile-friendly and clear

**Implemented Forms:**
- DonationForm ✅
- ChildForm ✅ (TICKET-127)
- ProjectForm ✅ (TICKET-127)
- DonorForm ✅ (TICKET-127)
- SponsorshipForm ✅ (modal only - no Cancel, TICKET-127)

**See:** TICKET-050 (ChildForm consistency), TICKET-127 (conditional Cancel pattern)

---

### React Hooks Best Practices

#### useCallback for Fetch Functions

**Problem:** Fetch functions without stable references cause infinite loops in useEffect.

**Solution:** Always wrap fetch functions in `useCallback` to stabilize references.

**Pattern:**
```typescript
const fetchData = useCallback(async () => {
  const response = await apiClient.get('/api/data', {
    params: { page: currentPage, filter: searchQuery }
  });
  setData(response.data.items);
  setPaginationMeta(response.data.meta);
}, [currentPage, searchQuery]); // ✅ Include all dependencies (setState is stable, no need to include)

useEffect(() => {
  fetchData();
}, [fetchData]); // ✅ Safe to include - stable reference
```

**Common Pitfalls:**
- ❌ Don't disable exhaustive-deps - fix the root cause instead
- ❌ Avoid object/array deps that recreate every render (destructure primitives)
- ✅ setState functions don't need to be in deps (stable by React)
- ✅ Include all primitive values used inside callback

**Example (Wrong - Missing Dependencies):**
```typescript
// ❌ ESLint warning: React Hook useCallback has missing dependencies
const fetchDonors = useCallback(async () => {
  const response = await apiClient.get('/api/donors', {
    params: { page: currentPage, include_discarded: showArchived }  // Uses dependencies
  });
  setDonors(response.data.donors);
}, []); // ❌ Missing currentPage and showArchived
```

**Example (Correct - All Dependencies Included):**
```typescript
// ✅ No ESLint warnings
const fetchDonors = useCallback(async () => {
  const response = await apiClient.get('/api/donors', {
    params: { page: currentPage, include_discarded: showArchived }
  });
  setDonors(response.data.donors);
}, [currentPage, showArchived]); // ✅ All dependencies included
```

**See:** TICKET-097 (ESLint exhaustive-deps fix)

#### Async Prop Updates

**Problem:** Props that load asynchronously (modals/dialogs receiving API data) may be undefined when component initializes.

**Solution:** Use `useEffect` to update state when prop changes.

**Pattern:**
```typescript
// ✅ CORRECT: Safe initialization + useEffect for prop updates
const DonorMergeModal: React.FC<{ donors: Donor[] }> = ({ donors }) => {
  const [primaryDonorId, setPrimaryDonorId] = useState<number>(0);

  // Update when donors prop changes (async data load)
  useEffect(() => {
    if (donors.length > 0) {
      setPrimaryDonorId(donors[0].id);
    }
  }, [donors]);

  // ... rest of component
};
```

**Example (Wrong - Unsafe Initialization):**
```typescript
// ❌ WRONG: donors[0] may be undefined initially
const DonorMergeModal: React.FC<{ donors: Donor[] }> = ({ donors }) => {
  const [primaryDonorId, setPrimaryDonorId] = useState<number>(donors[0]?.id || 0);
  // If donors[0]?.id is undefined, sends 0 to API → 500 error

  const handleMerge = async () => {
    await apiClient.post('/api/donors/merge', { primary_donor_id: primaryDonorId });
    // API receives primary_donor_id: 0 → Donor not found → 500 error
  };
};
```

**Bug Example (TICKET-100):**
- DonorMergeModal initialized with `donors[0]?.id || 0`
- If donors array empty initially (async load), `primaryDonorId` = `0`
- User clicks merge → sends `primary_donor_id: 0` to API
- API tries `Donor.find(0)` → RecordNotFound → 500 error

**Fix:**
- Initialize with safe default (`0`)
- Add `useEffect` to update when prop changes
- Prevents sending invalid IDs to API

**See:** TICKET-100 (DonorMergeModal async prop bug fix)

---

### Currency Utilities (DRY Pattern)

**Purpose:** Single source of truth for currency conversion between cents (database) and dollars (display).

**Why Cents?**
- Industry standard (Stripe, PayPal, all payment processors use cents/smallest unit)
- Avoids floating-point precision errors ($10.999999 issues)
- Integer math is accurate and reliable
- Future-proof for Stripe webhooks (always send/receive cents)

**Implementation:**
```typescript
// src/utils/currency.ts

/**
 * Format cents as currency string for display
 * @param cents - Amount in cents (e.g., 10000)
 * @returns Formatted currency string (e.g., "$100.00")
 */
export const formatCurrency = (cents: number): string => {
  return `$${(cents / 100).toFixed(2)}`;
};

/**
 * Parse dollar string/number to cents for API
 * @param dollars - Amount in dollars (e.g., "100" or 100)
 * @returns Amount in cents (e.g., 10000)
 */
export const parseCurrency = (dollars: string | number): number => {
  return Math.round(parseFloat(String(dollars)) * 100);
};
```

**Usage in Forms (Input → API):**
```typescript
// src/components/DonationForm.tsx
import { parseCurrency } from '../utils/currency';

const DonationForm: React.FC = () => {
  const [amount, setAmount] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await apiClient.post('/api/donations', {
      donation: {
        amount: parseCurrency(amount),  // "100" → 10000 cents
        // ... other fields
      },
    });
  };

  return (
    <TextField
      label="Amount ($)"
      type="number"
      value={amount}
      onChange={(e) => setAmount(e.target.value)}
    />
  );
};
```

**Usage in Display (API → UI):**
```typescript
// src/components/DonationList.tsx
import { formatCurrency } from '../utils/currency';

const DonationList: React.FC<{ donations: Donation[] }> = ({ donations }) => {
  return (
    <Stack spacing={2}>
      {donations.map((donation) => (
        <Card key={donation.id}>
          <Typography variant="h6">
            {formatCurrency(donation.amount)}  {/* 10000 → "$100.00" */}
          </Typography>
          <Typography>{donation.donor_name}</Typography>
        </Card>
      ))}
    </Stack>
  );
};
```

**Files Using Currency Utilities:**

**parseCurrency (Forms):**
- `DonationForm.tsx` - Donation amount input
- `SponsorshipForm.tsx` - Sponsorship amount input

**formatCurrency (Display):**
- `DonationList.tsx` - Donation amounts
- `ChildList.tsx` - Sponsorship amounts
- `SponsorshipList.tsx` - Monthly amounts

**Tests:**
```typescript
// src/utils/__tests__/currency.test.ts
import { formatCurrency, parseCurrency } from '../currency';

describe('formatCurrency', () => {
  it('formats cents as dollars', () => {
    expect(formatCurrency(10000)).toBe('$100.00');
    expect(formatCurrency(550)).toBe('$5.50');
    expect(formatCurrency(1)).toBe('$0.01');
  });
});

describe('parseCurrency', () => {
  it('parses dollars as cents', () => {
    expect(parseCurrency('100')).toBe(10000);
    expect(parseCurrency(5.50)).toBe(550);
    expect(parseCurrency('0.01')).toBe(1);
  });
});
```

**See:** TICKET-071 (Currency Utilities Standardization)

---

## Testing Patterns

### FactoryBot Traits

Use traits to create reusable test data combinations without duplicating factory definitions.

**When to use:**
- Optional fields that appear in multiple test scenarios
- Common data combinations (e.g., contact info, addresses)
- Testing different states or configurations

**Donor Factory Example (TICKET-100):**
```ruby
# spec/factories/donors.rb
FactoryBot.define do
  factory :donor do
    sequence(:email) { |n| "donor#{n}@example.com" }
    name { Faker::Name.name }
    last_updated_at { Time.current }

    # Phone only
    trait :with_phone do
      phone { Faker::PhoneNumber.phone_number }
    end

    # Address only
    trait :with_address do
      address_line1 { Faker::Address.street_address }
      address_line2 { Faker::Address.secondary_address }
      city { Faker::Address.city }
      state { Faker::Address.state_abbr }
      zip_code { Faker::Address.zip_code }
      country { "US" }
    end

    # Both phone and address
    trait :with_full_contact do
      phone { Faker::PhoneNumber.phone_number }
      address_line1 { Faker::Address.street_address }
      city { Faker::Address.city }
      state { Faker::Address.state_abbr }
      zip_code { Faker::Address.zip_code }
      country { "US" }
    end

    # Archived donor
    trait :archived do
      discarded_at { 1.week.ago }
    end
  end
end
```

**Usage in Tests:**
```ruby
# spec/models/donor_spec.rb
RSpec.describe Donor, type: :model do
  describe 'phone validation' do
    it 'accepts valid US phone number' do
      donor = create(:donor, :with_phone)
      expect(donor).to be_valid
    end
  end

  describe 'full_address method' do
    it 'combines address fields' do
      donor = create(:donor, :with_address)
      expect(donor.full_address).to include(donor.city)
    end
  end

  describe 'anonymous email generation' do
    it 'uses phone when name/email blank' do
      donor = create(:donor, name: "", email: "", :with_phone)
      expect(donor.email).to match(/anonymous-\d+@mailinator.com/)
    end
  end

  describe 'merge with contact info' do
    let(:donor1) { create(:donor, :with_full_contact) }
    let(:donor2) { create(:donor, :with_phone) }

    it 'preserves selected contact information' do
      # Test merge logic
    end
  end
end
```

**Benefits:**
- DRY test code (define traits once, reuse everywhere)
- Clear test intent (`:with_full_contact` vs manually setting 6 fields)
- Easy to maintain (update trait definition, all tests updated)
- Composable (combine multiple traits)

**See:** TICKET-100 (Donor Contact Information)

---

*Last updated: 2026-02-18*
