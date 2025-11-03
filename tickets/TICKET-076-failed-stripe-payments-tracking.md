## [TICKET-076] Failed Stripe Payments Tracking

**Status:** 🔵 In Progress
**Priority:** 🔴 High
**Dependencies:** TICKET-070 (Stripe CSV Import), TICKET-071 (Batch Import)
**Created:** 2025-11-03

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
  - `stripe_transaction_id` (string, unique index)
  - `donor_name` (string)
  - `donor_email` (string)
  - `amount_cents` (integer)
  - `payment_date` (date)
  - `status` (string) - "failed", "refunded", "canceled", etc.
  - `description` (text)
  - `raw_data` (jsonb) - Full CSV row for debugging
  - timestamps
- [ ] Model: `FailedStripePayment` with validations
- [ ] Update `StripePaymentImportService`: Track failed rows
- [ ] Update `StripeCsvBatchImporter`: Import failed rows to table
- [ ] Controller: `Api::FailedStripePaymentsController`
- [ ] Endpoint: `GET /api/failed_stripe_payments` (paginated, sorted by date DESC)
- [ ] Presenter: `FailedStripePaymentPresenter`
- [ ] RSpec tests: Model, service, controller (90%+ coverage)

#### Frontend
- [ ] Page: `FailedPaymentsPage.tsx`
- [ ] Component: `FailedPaymentList.tsx` (table display)
- [ ] Route: `/failed-payments`
- [ ] Navigation: Add link to AppBar
- [ ] Display: Donor name, amount, date, status, description
- [ ] Filters: Date range, status filter
- [ ] Pagination: MUI Pagination component
- [ ] Tests: Page + component unit tests

### Technical Design

#### Database Schema

```ruby
create_table :failed_stripe_payments do |t|
  t.string :stripe_transaction_id, null: false, index: { unique: true }
  t.string :donor_name
  t.string :donor_email
  t.integer :amount_cents
  t.date :payment_date
  t.string :status # "failed", "refunded", "canceled"
  t.text :description
  t.jsonb :raw_data, default: {}

  t.timestamps
end
```

#### Service Integration

```ruby
# app/services/stripe_payment_import_service.rb
def import
  return skip_result("Status not succeeded") unless succeeded?

  # NEW: Track failed payment before skipping
  unless succeeded?
    FailedStripePayment.create!(
      stripe_transaction_id: @csv_row["Transaction ID"],
      donor_name: @csv_row["Billing Details Name"],
      donor_email: @csv_row["Cust Email"],
      amount_cents: amount_in_cents,
      payment_date: Date.parse(@csv_row["Created Formatted"]),
      status: @csv_row["Status"],
      description: get_description_text,
      raw_data: @csv_row.to_h
    )
    return skip_result("Status not succeeded - tracked as failed payment")
  end

  # ... existing donation creation logic
end
```

#### API Endpoint

```ruby
# app/controllers/api/failed_stripe_payments_controller.rb
class Api::FailedStripePaymentsController < ApplicationController
  include PaginationConcern
  include RansackFilterable

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
```

#### Frontend Display

```typescript
// src/pages/FailedPaymentsPage.tsx
const FailedPaymentsPage = () => {
  const [payments, setPayments] = useState<FailedPayment[]>([]);
  const [filters, setFilters] = useState({ startDate: null, endDate: null, status: null });
  const { currentPage, paginationMeta, handlePageChange } = usePagination();

  useEffect(() => {
    fetchFailedPayments();
  }, [currentPage, filters]);

  return (
    <Box>
      <Typography variant="h4">Failed Payments</Typography>
      <FailedPaymentList
        payments={payments}
        onFilterChange={setFilters}
      />
      <Pagination {...} />
    </Box>
  );
};
```

### Expected Results

**CSV Import:**
- 142 failed rows imported to `failed_stripe_payments` table
- Visible in UI at `/failed-payments`
- Sorted by most recent first

**Webhook Integration (Future - TICKET-026):**
- Failed webhook events also tracked in same table
- Single source of truth for all failed payments

### Files to Create

**Backend:**
- `db/migrate/YYYYMMDDHHMMSS_create_failed_stripe_payments.rb`
- `app/models/failed_stripe_payment.rb`
- `app/controllers/api/failed_stripe_payments_controller.rb`
- `app/presenters/failed_stripe_payment_presenter.rb`
- `spec/models/failed_stripe_payment_spec.rb`
- `spec/controllers/api/failed_stripe_payments_controller_spec.rb`
- `spec/factories/failed_stripe_payments.rb`

**Frontend:**
- `src/pages/FailedPaymentsPage.tsx`
- `src/pages/FailedPaymentsPage.test.tsx`
- `src/components/FailedPaymentList.tsx`
- `src/components/FailedPaymentList.test.tsx`
- `src/types/failedPayment.ts`

**Routes:**
- Backend: `config/routes.rb` (add `resources :failed_stripe_payments, only: [:index]`)
- Frontend: `src/App.tsx` (add route `/failed-payments`)

### Files to Modify

- `app/services/stripe_payment_import_service.rb` (track failed before skip)
- `app/services/stripe_csv_batch_importer.rb` (import failed rows)
- `src/components/Navigation.tsx` (add nav link)

### Related Tickets

- TICKET-070: Stripe CSV Import Foundation
- TICKET-071: Batch CSV Import Task
- TICKET-026: Stripe Webhook Integration (future)

### Notes

- Failed payments stored separately from donations (different lifecycle)
- `raw_data` JSONB allows debugging without re-importing CSV
- Status values: "failed", "refunded", "canceled" (match Stripe statuses)
- No cascade delete needed - failed payments are historical records
- Consider admin-only access control (future enhancement)
