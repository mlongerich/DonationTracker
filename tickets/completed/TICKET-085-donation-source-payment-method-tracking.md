## [TICKET-085] Donation Source & Payment Method Tracking

**Status:** ✅ Complete
**Priority:** 🔴 High
**Effort:** M (Medium - 3-4 hours)
**Created:** 2025-11-05
**Completed:** 2025-11-11
**Dependencies:** None

### User Story
As a user, I want to track how each donation was received (Stripe, check, cash, bank transfer) so that I can reconcile payments and generate accurate reports by payment method.

### Problem Statement
**Current State:**
- Donations have Stripe fields (`stripe_charge_id`, `stripe_customer_id`, etc.)
- No explicit tracking of payment method for manual donations
- Cannot distinguish between check vs cash vs bank transfer
- No way to filter/report by payment method

**Desired State:**
- Clear payment method field on all donations
- Automatic: Stripe donations tagged as `stripe`
- Manual: User selects `check`, `cash`, or `bank_transfer`
- Filter donations by payment method
- Reports grouped by payment method

### Acceptance Criteria

#### Backend Changes
- [ ] Add `payment_method` enum column to donations table
  - Values: `stripe`, `check`, `cash`, `bank_transfer`
  - Default: `nil` (for historical data)
  - Migration with safe default

- [ ] Add validation to Donation model
  - `payment_method` required for new donations
  - Valid enum values only

- [ ] Auto-set `payment_method` in StripePaymentImportService
  - When `stripe_charge_id` present → `payment_method = 'stripe'`
  - Applies to CSV import and webhooks

- [ ] Update DonationPresenter to include `payment_method`

- [ ] Add Ransack searchable attribute for filtering
  - `payment_method_eq` (exact match)
  - `payment_method_in` (multiple methods)

- [ ] RSpec tests (12 new tests)
  - Model: validation, enum values
  - Presenter: payment_method included in JSON
  - Service: StripePaymentImportService sets payment_method
  - Request: filter by payment_method

#### Frontend Changes
- [ ] Add payment method dropdown to DonationForm
  - Label: "Payment Method"
  - Options: Check, Cash, Bank Transfer
  - Required field
  - Not shown when project is Stripe-linked (auto-detected)

- [ ] Display payment method in DonationList
  - Badge/chip next to amount
  - Icon per method: 💳 Stripe, ✅ Check, 💵 Cash, 🏦 Bank

- [ ] Add payment method filter to DonationList
  - Multi-select dropdown
  - Filter donations by one or more methods
  - Integrates with existing Ransack filters

- [ ] Update TypeScript Donation interface
  - Add `payment_method: 'stripe' | 'check' | 'cash' | 'bank_transfer' | null`

- [ ] Jest tests (8 new tests)
  - DonationForm: renders payment method dropdown
  - DonationForm: validates payment method selection
  - DonationList: displays payment method badge
  - DonationList: filters by payment method

- [ ] Cypress E2E tests (3 scenarios)
  - Create manual donation with check payment method
  - Filter donations by payment method
  - Stripe donation shows stripe badge automatically

### Technical Implementation

#### Backend Migration
```ruby
# db/migrate/YYYYMMDDHHMMSS_add_payment_method_to_donations.rb
class AddPaymentMethodToDonations < ActiveRecord::Migration[8.0]
  def change
    add_column :donations, :payment_method, :string
    add_index :donations, :payment_method

    # Backfill Stripe donations
    reversible do |dir|
      dir.up do
        execute <<-SQL
          UPDATE donations
          SET payment_method = 'stripe'
          WHERE stripe_charge_id IS NOT NULL;
        SQL
      end
    end
  end
end
```

#### Donation Model
```ruby
# app/models/donation.rb
class Donation < ApplicationRecord
  PAYMENT_METHODS = %w[stripe check cash bank_transfer].freeze

  enum :payment_method, {
    stripe: 'stripe',
    check: 'check',
    cash: 'cash',
    bank_transfer: 'bank_transfer'
  }, prefix: true

  validates :payment_method, presence: true, inclusion: { in: PAYMENT_METHODS }
  validates :amount, presence: true, numericality: { greater_than: 0 }
  validates :date, presence: true

  belongs_to :donor
  belongs_to :project, optional: true
  belongs_to :sponsorship, optional: true

  # Ransack searchable attributes
  def self.ransackable_attributes(auth_object = nil)
    %w[amount date payment_method donor_id project_id sponsorship_id]
  end
end
```

#### StripePaymentImportService
```ruby
# app/services/stripe_payment_import_service.rb (UPDATE)
def create_donation(invoice_donation_attributes)
  Donation.create!(
    donor: donor,
    amount: invoice_donation_attributes[:amount],
    date: invoice_donation_attributes[:date],
    project: invoice_donation_attributes[:project],
    sponsorship: invoice_donation_attributes[:sponsorship],
    payment_method: 'stripe', # NEW: Auto-set for Stripe imports
    stripe_charge_id: stripe_invoice.charge_id,
    stripe_customer_id: stripe_invoice.customer_id,
    stripe_invoice_id: stripe_invoice.invoice_id,
    stripe_subscription_id: stripe_invoice.subscription_id
  )
end
```

#### DonationPresenter
```ruby
# app/presenters/donation_presenter.rb (UPDATE)
def as_json(options = {})
  {
    id: object.id,
    amount: object.amount,
    date: object.date,
    payment_method: object.payment_method, # NEW
    donor_id: object.donor_id,
    donor_name: object.donor&.name,
    project_id: object.project_id,
    project_title: object.project&.title,
    # ... other fields
  }
end
```

#### Frontend DonationForm
```tsx
// src/components/DonationForm.tsx (UPDATE)
const DonationForm = ({ onSubmit, initialData }: DonationFormProps) => {
  const [paymentMethod, setPaymentMethod] = useState<string>(
    initialData?.payment_method || ''
  );

  // Don't show payment method dropdown if Stripe project selected
  const isStripeProject = selectedProject?.title?.includes('Sponsor');

  return (
    <Box component="form" onSubmit={handleSubmit}>
      {/* Existing fields: amount, date, donor, project */}

      {/* Payment Method Dropdown (manual donations only) */}
      {!isStripeProject && (
        <FormControl fullWidth size="small" required>
          <InputLabel id="payment-method-label">Payment Method</InputLabel>
          <Select
            labelId="payment-method-label"
            value={paymentMethod}
            label="Payment Method"
            onChange={(e) => setPaymentMethod(e.target.value)}
          >
            <MenuItem value="check">Check</MenuItem>
            <MenuItem value="cash">Cash</MenuItem>
            <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
          </Select>
        </FormControl>
      )}

      <Button type="submit" variant="contained" color="primary" fullWidth>
        Create Donation
      </Button>
    </Box>
  );
};
```

#### Frontend DonationList
```tsx
// src/components/DonationList.tsx (UPDATE)
const PaymentMethodBadge = ({ method }: { method: string }) => {
  const config = {
    stripe: { label: 'Stripe', icon: '💳', color: 'primary' },
    check: { label: 'Check', icon: '✅', color: 'success' },
    cash: { label: 'Cash', icon: '💵', color: 'warning' },
    bank_transfer: { label: 'Bank', icon: '🏦', color: 'info' }
  }[method] || { label: method, icon: '', color: 'default' };

  return (
    <Chip
      label={`${config.icon} ${config.label}`}
      size="small"
      color={config.color as any}
    />
  );
};

// In donation list item
<TableCell>
  {formatCurrency(donation.amount)}
  <PaymentMethodBadge method={donation.payment_method} />
</TableCell>
```

#### Payment Method Filter
```tsx
// src/pages/DonationsPage.tsx (UPDATE)
const [paymentMethods, setPaymentMethods] = useState<string[]>([]);

const fetchDonations = async () => {
  const params: any = { page, per_page: 25 };

  if (paymentMethods.length > 0) {
    params.q = { ...params.q, payment_method_in: paymentMethods };
  }

  const response = await apiClient.get('/api/donations', { params });
  setDonations(response.data.donations);
};

// Filter UI
<FormControl size="small" sx={{ minWidth: 200 }}>
  <InputLabel>Payment Method</InputLabel>
  <Select
    multiple
    value={paymentMethods}
    onChange={(e) => setPaymentMethods(e.target.value as string[])}
    renderValue={(selected) => selected.join(', ')}
  >
    <MenuItem value="stripe">💳 Stripe</MenuItem>
    <MenuItem value="check">✅ Check</MenuItem>
    <MenuItem value="cash">💵 Cash</MenuItem>
    <MenuItem value="bank_transfer">🏦 Bank Transfer</MenuItem>
  </Select>
</FormControl>
```

### Data Migration Strategy

**Historical Data:**
- Existing Stripe donations: Auto-backfilled with `payment_method = 'stripe'` (migration)
- Existing manual donations: Remain `nil` (require manual update or default to `check`)
- **Option 1 (Recommended):** Allow `nil` for historical data, require for new donations
- **Option 2:** Backfill all manual donations as `check` (assume default)

**Validation Strategy:**
```ruby
# Allow nil for existing records, require for new records
validates :payment_method, presence: true, if: :new_record?
```

### Files to Modify

**Backend:**
- `db/migrate/YYYYMMDDHHMMSS_add_payment_method_to_donations.rb` (NEW)
- `app/models/donation.rb` (add enum + validation)
- `app/services/stripe_payment_import_service.rb` (auto-set payment_method)
- `app/presenters/donation_presenter.rb` (include payment_method)
- `spec/models/donation_spec.rb` (add 4 validation tests)
- `spec/services/stripe_payment_import_service_spec.rb` (add 2 tests)
- `spec/presenters/donation_presenter_spec.rb` (add 1 test)
- `spec/requests/api/donations_spec.rb` (add 3 filter tests)

**Frontend:**
- `src/types/donation.ts` (add payment_method field)
- `src/components/DonationForm.tsx` (add dropdown)
- `src/components/DonationList.tsx` (add badge component)
- `src/pages/DonationsPage.tsx` (add filter)
- `src/components/DonationForm.test.tsx` (add 4 tests)
- `src/components/DonationList.test.tsx` (add 4 tests)
- `cypress/e2e/donation-entry.cy.ts` (add 2 tests)
- `cypress/e2e/donation-filtering.cy.ts` (add 1 test)

### Testing Strategy

**Backend RSpec (12 tests):**
1. Payment method enum values valid
2. Payment method required for new donations
3. Invalid payment method rejected
4. StripePaymentImportService sets payment_method = 'stripe'
5. DonationPresenter includes payment_method
6. Filter by payment_method_eq
7. Filter by payment_method_in (multiple)
8. Historical donations with nil payment_method allowed
9-12. Request specs for filtering

**Frontend Jest (8 tests):**
1. DonationForm renders payment method dropdown
2. Payment method dropdown has 3 options
3. Payment method required validation
4. PaymentMethodBadge renders correct icon/color
5. DonationList displays payment method badge
6. Payment method filter renders
7. Filter updates query params
8. Multiple payment methods selectable

**Cypress E2E (3 tests):**
1. Create donation with check → verify badge shows ✅ Check
2. Create donation with cash → verify badge shows 💵 Cash
3. Filter by payment method → verify only matching donations shown

### Estimated Time
- Migration + Model: 1 hour
- Service update: 30 minutes
- Presenter + tests: 1 hour
- Frontend form + badge: 1 hour
- Filter UI: 1 hour
- E2E tests: 30 minutes
- **Total:** ~5 hours

### Success Criteria
- [ ] Payment method tracked for all new donations
- [ ] Stripe donations automatically tagged
- [ ] Manual donations require payment method selection
- [ ] Filter donations by payment method
- [ ] Visual badges distinguish payment types
- [ ] All tests passing (RSpec + Jest + Cypress)
- [ ] Historical data preserved (nil allowed for old records)

### Related Tickets
- TICKET-070: Stripe CSV Import Foundation ✅ (StripePaymentImportService exists)
- TICKET-026: Stripe Webhook Integration 📋 (will also need payment_method auto-set)

### Notes
- **Business Value:** Essential for financial reconciliation and reporting
- **Audit Trail:** Payment method helps track how money was received
- **Future Enhancement:** Add payment_method to report exports
