## [TICKET-076] Failed Stripe Payments Tracking

**Status:** ❌ SUPERSEDED BY TICKET-109/110/111/112/113
**Priority:** 🔴 High
**Effort:** M (Medium - 4-6 hours)
**Dependencies:** TICKET-070 ✅ (Stripe CSV Import), TICKET-071 ✅ (Batch Import)
**Created:** 2025-11-03
**Updated:** 2025-11-17
**Superseded:** 2025-11-17

---

**⚠️ IMPORTANT: This ticket revealed fundamental design issues with tracking payment states.**

Work has been paused and **superseded by comprehensive redesign** documented in `docs/STRIPE_IMPORT_PLAN.md`.

**See new tickets:** TICKET-109, TICKET-110, TICKET-111, TICKET-112, TICKET-113

**💾 Code Preservation:** All work completed on this ticket (39 TDD cycles, fully tested backend/frontend) is preserved in the `backup/ticket-076-complete` branch for reference.

**Partial Completion Summary:**

✅ **Completed Work:**
- Backend: `FailedStripePayment` model with validations (presence, uniqueness, ransackable attributes)
- Backend: `FailedStripePaymentPresenter` with JSON formatting
- Backend: `Api::FailedStripePaymentsController` with pagination and Ransack filtering
- Backend: `StripePaymentImportService` tracks failed payments with `track_failed_payment` method
- Backend: Synthetic transaction ID generation for payments without Stripe IDs (SHA256 hash)
- Backend: Import summary fix - separate "Failed/Tracked" from "Skipped" counters
- Backend: Idempotency - `find_or_create_by!` prevents duplicate failed payment tracking
- Frontend: `AdminPage.tsx` with MUI Tabs architecture
- Frontend: `FailedPaymentsSection.tsx` component
- Frontend: `FailedPaymentList.tsx` with enhanced card display (donor name, email, date, description, formatted amount, colored status badges)
- Frontend: Route `/admin` added to App.tsx
- Frontend: "Admin" navigation link added
- Frontend: TypeScript types in `src/types/failedPayment.ts`
- All backend and frontend tests passing

❌ **NOT Implemented (Paused):**
- Filters UI (date range, status dropdown) - specification exists in ticket but not built
- Pagination UI (MUI Pagination component) - specification exists but not built
- Archive/soft-delete behavior - not started

**Why Paused:**

During implementation, critical issues were discovered:
1. **Duplicate subscriptions**: CSV contains same child + invoice but different subscription IDs (lines 805 & 807)
2. **Status tracking gap**: No way to track refunded/canceled donations after initial success
3. **Failed payments misnomer**: Table tracks ALL non-succeeded transactions, not just failures
4. **Webhook misalignment**: Current design won't work for future webhook integration (TICKET-026)

**Solution:** Add `status` field to donations table, use metadata for robust data extraction. See `docs/STRIPE_IMPORT_PLAN.md` for complete redesign.

---

### User Story
As an admin, I want to track failed/refunded Stripe payments so that I can review and follow up on problematic transactions from both CSV imports and future webhook events.

### Problem Statement
Currently, the system only imports succeeded transactions. Failed payments (142 rows in CSV with `Status != 'succeeded'`) are skipped but not tracked anywhere. Admins need visibility into:
- Failed payment attempts
- Refunded transactions
- Payment declines
- Status/reason for each failure

This applies to both:
1. Historical CSV data (one-time import)
2. Future webhook events (TICKET-026)

### Acceptance Criteria

#### Backend
- [ ] Migration: Create `failed_stripe_payments` table
  - `stripe_transaction_id` (string, NOT NULL, unique index)
  - `donor_name` (string)
  - `donor_email` (string)
  - `amount_cents` (integer, NOT NULL, default: 0)
  - `payment_date` (date, NOT NULL)
  - `status` (string, NOT NULL) - "failed", "refunded", "canceled", etc.
  - `description` (text)
  - `raw_data` (jsonb, default: {})
  - `created_at`, `updated_at` (timestamps)
- [ ] Model: `FailedStripePayment` with validations
  - Presence: `stripe_transaction_id`, `amount_cents`, `payment_date`, `status`
  - Uniqueness: `stripe_transaction_id`
  - Numericality: `amount_cents` (integer)
- [ ] Update `StripePaymentImportService`: Track failed rows BEFORE skip
- [ ] Update `StripeCsvBatchImporter`: Count failed imports separately
- [ ] Controller: `Api::FailedStripePaymentsController` (index only)
- [ ] Endpoint: `GET /api/failed_stripe_payments` (paginated, sorted by payment_date DESC)
- [ ] Presenter: `FailedStripePaymentPresenter`
- [ ] RSpec tests: Model (validations, factory), Controller (index endpoint), Service integration (90%+ coverage)
- [ ] Factory: `spec/factories/failed_stripe_payments.rb`

#### Frontend (Admin Page Architecture)
- [ ] TypeScript type: `src/types/failedPayment.ts` (FailedPayment interface)
- [ ] Add to barrel export: `src/types/index.ts`
- [ ] Admin infrastructure: `src/pages/AdminPage.tsx` (MUI Tabs container)
- [ ] Admin infrastructure test: `src/pages/AdminPage.test.tsx`
- [ ] Create directory: `src/components/admin/` (admin sections)
- [ ] Section: `src/components/admin/FailedPaymentsSection.tsx` (tab content)
- [ ] Component: `src/components/admin/FailedPaymentList.tsx` (MUI Card display)
- [ ] Component test: `src/components/admin/FailedPaymentList.test.tsx`
- [ ] Route: Add `/admin` to `src/App.tsx`
- [ ] Navigation: Add "Admin" button to `src/components/Navigation.tsx`
- [ ] Display: Donor name, amount (formatted), date, status badge, description
- [ ] Filters: Date range (DatePicker), status dropdown filter
- [ ] Pagination: Use `usePagination` hook + MUI Pagination
- [ ] Tests: Jest unit tests (AdminPage + FailedPaymentList)

### Technical Design

#### Database Schema

```ruby
# db/migrate/YYYYMMDDHHMMSS_create_failed_stripe_payments.rb
class CreateFailedStripePayments < ActiveRecord::Migration[7.1]
  def change
    create_table :failed_stripe_payments do |t|
      t.string :stripe_transaction_id, null: false
      t.string :donor_name
      t.string :donor_email
      t.integer :amount_cents, null: false, default: 0
      t.date :payment_date, null: false
      t.string :status, null: false # "failed", "refunded", "canceled"
      t.text :description
      t.jsonb :raw_data, default: {}

      t.timestamps
    end

    add_index :failed_stripe_payments, :stripe_transaction_id, unique: true
    add_index :failed_stripe_payments, :payment_date # For sorting/filtering
    add_index :failed_stripe_payments, :status # For filtering
  end
end
```

#### Model Implementation

```ruby
# app/models/failed_stripe_payment.rb
# frozen_string_literal: true

# Tracks failed, refunded, or canceled Stripe payment attempts.
#
# This model stores non-succeeded Stripe transactions for admin review
# and follow-up. Used by both CSV imports (TICKET-071) and future
# webhook integrations (TICKET-026).
#
# @example Create a failed payment record
#   FailedStripePayment.create!(
#     stripe_transaction_id: "txn_failed_123",
#     donor_name: "John Doe",
#     donor_email: "john@example.com",
#     amount_cents: 5000,
#     payment_date: Date.today,
#     status: "failed",
#     description: "Card declined",
#     raw_data: { ... }
#   )
#
# @see StripePaymentImportService for CSV import tracking
class FailedStripePayment < ApplicationRecord
  # Validations
  validates :stripe_transaction_id, presence: true, uniqueness: true
  validates :amount_cents, presence: true, numericality: { only_integer: true }
  validates :payment_date, presence: true
  validates :status, presence: true

  # Scopes
  scope :recent, -> { order(payment_date: :desc) }
  scope :by_status, ->(status) { where(status: status) if status.present? }
end
```

#### Service Integration

**IMPORTANT:** Track failed payment BEFORE early return!

```ruby
# app/services/stripe_payment_import_service.rb (UPDATE)
def import
  # NEW: Track non-succeeded payments before skipping
  unless succeeded?
    track_failed_payment
    return skip_result("Status not succeeded - tracked as failed payment")
  end

  perform_import_transaction
  return skip_result("Already imported") if @imported_donations.empty?

  success_result
rescue StandardError => error
  error_result(error)
end

private

# NEW: Extract failed payment tracking to private method
def track_failed_payment
  FailedStripePayment.find_or_create_by!(stripe_transaction_id: @csv_row["Transaction ID"]) do |payment|
    payment.donor_name = @csv_row["Billing Details Name"]
    payment.donor_email = @csv_row["Cust Email"]
    payment.amount_cents = amount_in_cents
    payment.payment_date = parse_payment_date
    payment.status = @csv_row["Status"]
    payment.description = get_description_text
    payment.raw_data = sanitize_raw_data
  end
end

def parse_payment_date
  Date.parse(@csv_row["Created Formatted"])
rescue ArgumentError
  Date.current # Fallback if date parsing fails
end

def sanitize_raw_data
  # Store only essential fields (not entire 200+ column CSV row)
  {
    amount: @csv_row["Amount"],
    name: @csv_row["Billing Details Name"],
    email: @csv_row["Cust Email"],
    description: @csv_row["Description"],
    date: @csv_row["Created Formatted"],
    status: @csv_row["Status"],
    transaction_id: @csv_row["Transaction ID"],
    customer_id: @csv_row["Cust ID"]
  }
end
```

**Why find_or_create_by!?**
- Safe to re-run import multiple times (idempotent)
- Prevents duplicate tracking of same failed transaction
- Consistent with existing patterns in codebase

#### API Endpoint

```ruby
# app/controllers/api/failed_stripe_payments_controller.rb
# frozen_string_literal: true

# Handles read-only access to failed Stripe payment records.
#
# Provides paginated list of failed/refunded/canceled Stripe transactions
# with filtering by date range and status.
#
# @example GET /api/failed_stripe_payments
#   GET /api/failed_stripe_payments?page=1&per_page=25
#   GET /api/failed_stripe_payments?q[status_eq]=failed
#   GET /api/failed_stripe_payments?q[payment_date_gteq]=2025-01-01
#
# @see FailedStripePaymentPresenter for response format
# @see PaginationConcern for pagination helpers
# @see RansackFilterable for filtering
module Api
  class FailedStripePaymentsController < ApplicationController
    include PaginationConcern
    include RansackFilterable

    # GET /api/failed_stripe_payments
    def index
      scope = FailedStripePayment.all
      filtered = apply_ransack_filters(scope)
      payments = paginate_collection(filtered.order(payment_date: :desc))

      render json: {
        failed_payments: CollectionPresenter.new(payments, FailedStripePaymentPresenter).as_json,
        meta: pagination_meta(payments)
      }
    end
  end
end
```

#### Presenter Implementation

```ruby
# app/presenters/failed_stripe_payment_presenter.rb
# frozen_string_literal: true

# Formats FailedStripePayment objects for JSON API responses.
#
# @example Format a failed payment
#   presenter = FailedStripePaymentPresenter.new(failed_payment)
#   presenter.as_json
#   # => { id: 1, stripe_transaction_id: "txn_123", donor_name: "John Doe", ... }
#
# @see BasePresenter for inheritance pattern
# @see FailedStripePayment model
class FailedStripePaymentPresenter < BasePresenter
  def as_json(_options = {})
    {
      id: object.id,
      stripe_transaction_id: object.stripe_transaction_id,
      donor_name: object.donor_name,
      donor_email: object.donor_email,
      amount_cents: object.amount_cents,
      payment_date: object.payment_date,
      status: object.status,
      description: object.description,
      created_at: object.created_at,
      updated_at: object.updated_at
    }
  end
end
```

#### Frontend TypeScript Types

```typescript
// src/types/failedPayment.ts
export interface FailedPayment {
  id: number;
  stripe_transaction_id: string;
  donor_name?: string;
  donor_email?: string;
  amount_cents: number;
  payment_date: string;
  status: string; // "failed" | "refunded" | "canceled"
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface FailedPaymentFilters {
  startDate: string | null;
  endDate: string | null;
  status: string | null;
}

// src/types/index.ts (ADD export)
export type { FailedPayment, FailedPaymentFilters } from './failedPayment';
```

#### Frontend Admin Page with Tabs

```typescript
// src/pages/AdminPage.tsx
import React, { useState } from 'react';
import { Box, Typography, Tabs, Tab } from '@mui/material';
import FailedPaymentsSection from '../components/admin/FailedPaymentsSection';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h4" gutterBottom sx={{ p: 3, pb: 0 }}>
        Admin
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="Failed Payments" />
          <Tab label="CSV Import" disabled /> {/* TICKET-091 */}
        </Tabs>
      </Box>

      <TabPanel value={activeTab} index={0}>
        <FailedPaymentsSection />
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        {/* CSV Import Section - TICKET-091 */}
      </TabPanel>
    </Box>
  );
};

export default AdminPage;
```

#### Frontend Failed Payments Section

```typescript
// src/components/admin/FailedPaymentsSection.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Stack, TextField, MenuItem, Pagination } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { FailedPayment, FailedPaymentFilters, PaginationMeta } from '../../types';
import { usePagination } from '../../hooks/usePagination';
import FailedPaymentList from './FailedPaymentList';
import apiClient from '../../api/client';

const FailedPaymentsSection: React.FC = () => {
  const [payments, setPayments] = useState<FailedPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(null);

  const [filters, setFilters] = useState<FailedPaymentFilters>({
    startDate: null,
    endDate: null,
    status: null,
  });

  const { currentPage, handlePageChange, resetToFirstPage } = usePagination();

  const fetchFailedPayments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: Record<string, unknown> = {
        page: currentPage,
        per_page: 25,
      };

      // Add Ransack filters
      if (filters.startDate) {
        params['q[payment_date_gteq]'] = filters.startDate;
      }
      if (filters.endDate) {
        params['q[payment_date_lteq]'] = filters.endDate;
      }
      if (filters.status) {
        params['q[status_eq]'] = filters.status;
      }

      const response = await apiClient.get('/api/failed_stripe_payments', { params });
      setPayments(response.data.failed_payments);
      setPaginationMeta(response.data.meta);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch failed payments');
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters]);

  useEffect(() => {
    fetchFailedPayments();
  }, [fetchFailedPayments]);

  const handleFilterChange = (newFilters: Partial<FailedPaymentFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    resetToFirstPage();
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Failed Stripe Payments
      </Typography>

      {/* Filters */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <DatePicker
          label="Start Date"
          value={filters.startDate}
          onChange={(date) => handleFilterChange({ startDate: date })}
          slotProps={{ textField: { size: 'small' } }}
        />
        <DatePicker
          label="End Date"
          value={filters.endDate}
          onChange={(date) => handleFilterChange({ endDate: date })}
          slotProps={{ textField: { size: 'small' } }}
        />
        <TextField
          select
          label="Status"
          value={filters.status || ''}
          onChange={(e) => handleFilterChange({ status: e.target.value || null })}
          size="small"
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="failed">Failed</MenuItem>
          <MenuItem value="refunded">Refunded</MenuItem>
          <MenuItem value="canceled">Canceled</MenuItem>
        </TextField>
      </Stack>

      {/* Error Display */}
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {/* Payment List */}
      <FailedPaymentList payments={payments} loading={loading} />

      {/* Pagination */}
      {paginationMeta && paginationMeta.total_pages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={paginationMeta.total_pages}
            page={currentPage}
            onChange={(_, page) => handlePageChange(page)}
            color="primary"
          />
        </Box>
      )}
    </Box>
  );
};

export default FailedPaymentsSection;
```

#### Frontend List Component

```typescript
// src/components/admin/FailedPaymentList.tsx
import React from 'react';
import { Stack, Card, CardContent, Typography, Chip, CircularProgress, Box } from '@mui/material';
import { FailedPayment } from '../../types';
import { formatCurrency } from '../../utils/currency';

interface FailedPaymentListProps {
  payments: FailedPayment[];
  loading: boolean;
}

const FailedPaymentList: React.FC<FailedPaymentListProps> = ({ payments, loading }) => {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (payments.length === 0) {
    return (
      <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', p: 4 }}>
        No failed payments found
      </Typography>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'failed':
        return 'error';
      case 'refunded':
        return 'warning';
      case 'canceled':
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <Stack spacing={2}>
      {payments.map((payment) => (
        <Card key={payment.id}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="start">
              <Box>
                <Typography variant="h6">
                  {payment.donor_name || 'Unknown Donor'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {payment.donor_email || 'No email'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {payment.payment_date}
                </Typography>
                {payment.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {payment.description}
                  </Typography>
                )}
              </Box>

              <Stack alignItems="flex-end" spacing={1}>
                <Typography variant="h6" color="error">
                  {formatCurrency(payment.amount_cents)}
                </Typography>
                <Chip
                  label={payment.status.toUpperCase()}
                  color={getStatusColor(payment.status)}
                  size="small"
                />
                <Typography variant="caption" color="text.secondary">
                  {payment.stripe_transaction_id}
                </Typography>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
};

export default FailedPaymentList;
```

### Expected Results

**CSV Import:**
- 142 failed rows imported to `failed_stripe_payments` table
- Visible in UI at `/failed-payments`
- Sorted by most recent first

**Webhook Integration (Future - TICKET-026):**
- Failed webhook events also tracked in same table
- Single source of truth for all failed payments

### Testing Strategy

#### Backend Tests

```ruby
# spec/models/failed_stripe_payment_spec.rb
RSpec.describe FailedStripePayment, type: :model do
  describe 'validations' do
    subject(:payment) { build(:failed_stripe_payment) }

    it { should validate_presence_of(:stripe_transaction_id) }
    it { should validate_uniqueness_of(:stripe_transaction_id) }
    it { should validate_presence_of(:amount_cents) }
    it { should validate_presence_of(:payment_date) }
    it { should validate_presence_of(:status) }
    it { should validate_numericality_of(:amount_cents).only_integer }
  end

  describe 'scopes' do
    let!(:recent) { create(:failed_stripe_payment, payment_date: 1.day.ago) }
    let!(:old) { create(:failed_stripe_payment, payment_date: 30.days.ago) }
    let!(:failed) { create(:failed_stripe_payment, status: 'failed') }
    let!(:refunded) { create(:failed_stripe_payment, status: 'refunded') }

    describe '.recent' do
      it 'orders by payment_date desc' do
        expect(FailedStripePayment.recent.to_a).to eq([recent, old])
      end
    end

    describe '.by_status' do
      it 'filters by status' do
        expect(FailedStripePayment.by_status('failed')).to include(failed)
        expect(FailedStripePayment.by_status('failed')).not_to include(refunded)
      end
    end
  end
end

# spec/factories/failed_stripe_payments.rb
FactoryBot.define do
  factory :failed_stripe_payment do
    sequence(:stripe_transaction_id) { |n| "txn_failed_#{n}" }
    donor_name { "John Doe" }
    donor_email { "john@example.com" }
    amount_cents { 5000 }
    payment_date { Date.current }
    status { "failed" }
    description { "Card declined" }
    raw_data { {} }
  end
end

# spec/requests/api/failed_stripe_payments_spec.rb
RSpec.describe "Api::FailedStripePayments", type: :request do
  describe "GET /api/failed_stripe_payments" do
    let!(:payment1) { create(:failed_stripe_payment, payment_date: 1.day.ago, status: 'failed') }
    let!(:payment2) { create(:failed_stripe_payment, payment_date: 2.days.ago, status: 'refunded') }

    it 'returns paginated failed payments' do
      get '/api/failed_stripe_payments'

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json['failed_payments'].size).to eq(2)
      expect(json['meta']).to include('total_pages', 'current_page')
    end

    it 'filters by status' do
      get '/api/failed_stripe_payments', params: { q: { status_eq: 'failed' } }

      json = JSON.parse(response.body)
      expect(json['failed_payments'].size).to eq(1)
      expect(json['failed_payments'].first['status']).to eq('failed')
    end

    it 'filters by date range' do
      get '/api/failed_stripe_payments', params: {
        q: { payment_date_gteq: 1.day.ago.to_date, payment_date_lteq: Date.today }
      }

      json = JSON.parse(response.body)
      expect(json['failed_payments'].size).to eq(1)
    end

    it 'orders by payment_date desc' do
      get '/api/failed_stripe_payments'

      json = JSON.parse(response.body)
      dates = json['failed_payments'].map { |p| p['payment_date'] }
      expect(dates).to eq(dates.sort.reverse)
    end
  end
end
```

#### Frontend Tests

```typescript
// src/components/FailedPaymentList.test.tsx
import { render, screen } from '@testing-library/react';
import FailedPaymentList from './FailedPaymentList';
import { FailedPayment } from '../types';

describe('FailedPaymentList', () => {
  const mockPayments: FailedPayment[] = [
    {
      id: 1,
      stripe_transaction_id: 'txn_123',
      donor_name: 'John Doe',
      donor_email: 'john@example.com',
      amount_cents: 5000,
      payment_date: '2025-11-10',
      status: 'failed',
      description: 'Card declined',
      created_at: '2025-11-10T10:00:00Z',
      updated_at: '2025-11-10T10:00:00Z',
    },
  ];

  it('renders payment list', () => {
    render(<FailedPaymentList payments={mockPayments} loading={false} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('$50.00')).toBeInTheDocument();
    expect(screen.getByText('FAILED')).toBeInTheDocument();
  });

  it('displays loading state', () => {
    render(<FailedPaymentList payments={[]} loading={true} />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('displays empty state', () => {
    render(<FailedPaymentList payments={[]} loading={false} />);

    expect(screen.getByText('No failed payments found')).toBeInTheDocument();
  });
});
```

### Files to Create

**Backend:**
- `db/migrate/YYYYMMDDHHMMSS_create_failed_stripe_payments.rb` (NEW)
- `app/models/failed_stripe_payment.rb` (NEW)
- `app/controllers/api/failed_stripe_payments_controller.rb` (NEW)
- `app/presenters/failed_stripe_payment_presenter.rb` (NEW)
- `spec/models/failed_stripe_payment_spec.rb` (NEW)
- `spec/requests/api/failed_stripe_payments_spec.rb` (NEW)
- `spec/factories/failed_stripe_payments.rb` (NEW)

**Frontend - Admin Infrastructure:**
- `src/pages/AdminPage.tsx` (NEW - Tabs container)
- `src/pages/AdminPage.test.tsx` (NEW)
- `src/components/admin/` (NEW - Directory)

**Frontend - Failed Payments Section:**
- `src/types/failedPayment.ts` (NEW)
- `src/components/admin/FailedPaymentsSection.tsx` (NEW - Tab content)
- `src/components/admin/FailedPaymentList.tsx` (NEW)
- `src/components/admin/FailedPaymentList.test.tsx` (NEW)

### Files to Modify

**Backend:**
- `config/routes.rb` (ADD: `resources :failed_stripe_payments, only: [:index]`)
- `app/services/stripe_payment_import_service.rb` (ADD: `track_failed_payment` method)

**Frontend:**
- `src/types/index.ts` (ADD: export FailedPayment types)
- `src/App.tsx` (ADD: route `/admin`)
- `src/components/Navigation.tsx` (ADD: "Admin" button)

### Related Tickets

- TICKET-070: Stripe CSV Import Foundation
- TICKET-071: Batch CSV Import Task
- TICKET-026: Stripe Webhook Integration (future)

### Estimated Time
- Backend migration + model: 30 minutes
- Backend controller + presenter: 30 minutes
- Backend service integration: 45 minutes
- Backend tests: 1.5 hours
- Frontend admin infrastructure: 30 minutes (AdminPage + tabs)
- Frontend types + section: 1 hour
- Frontend component: 45 minutes
- Frontend tests: 1 hour
- Routes + navigation: 15 minutes
- **Total:** 6 hours

### Success Criteria
- [ ] All 142 failed CSV rows tracked in `failed_stripe_payments` table
- [ ] Admin page accessible at `/admin`
- [ ] Failed payments visible in "Failed Payments" tab
- [ ] Tab navigation works (Failed Payments, CSV Import placeholder)
- [ ] Filters work (date range, status)
- [ ] Pagination works correctly
- [ ] All tests pass (RSpec + Jest)
- [ ] Currency displayed correctly using `formatCurrency` utility
- [ ] Status badges colored appropriately (failed=red, refunded=warning, canceled=default)
- [ ] Safe to re-run CSV import (idempotent via find_or_create_by!)
- [ ] Admin page ready for TICKET-091 (CSV Import tab)

### Notes

- **Architecture:** Failed Payments is a section on Admin Page (not standalone page)
- **Admin Page:** Extensible tabs design for multiple admin features (TICKET-091, 027, 106)
- **Lifecycle:** Failed payments are historical records (no soft delete, no cascade delete)
- **Storage:** `raw_data` JSONB stores sanitized essential fields only (not full 200+ column CSV)
- **Idempotency:** Uses `find_or_create_by!` to prevent duplicate tracking on re-runs
- **Performance:** Indexed on `stripe_transaction_id` (unique), `payment_date`, and `status`
- **Status values:** "failed", "refunded", "canceled" (match Stripe API statuses)
- **Future:** Admin-only access control (TICKET-008 authentication)
- **Integration:** Works with both CSV imports (TICKET-071) and future webhooks (TICKET-026)
- **Coordination:** CSV Import tab placeholder added for TICKET-091
