# Stripe Import System Redesign Plan

**Created:** 2025-11-14
**Status:** 📋 Proposed
**Priority:** 🔴 High - Foundational Change

---

## Executive Summary

The current import system has revealed fundamental issues with how we track Stripe payments:

1. **Uniqueness Problem**: Invoice ID + Child ID may not be sufficient (duplicate subscriptions exist)
2. **Status Tracking Gap**: No way to track refunded, canceled, or problematic donations
3. **Failed Payments Misnomer**: "Failed payments" table actually tracks ALL non-succeeded transactions
4. **Validation vs. Tracking**: We reject invalid data instead of accepting it with "needs attention" status

**Proposed Solution**: Add comprehensive status tracking to donations, eliminate separate failed payments table, improve uniqueness detection, and accept all import data with appropriate status flags.

---

## Current State Analysis

### What We Found in the CSV

**Payment Statuses:**
- `succeeded`: 1,322 rows
- `failed`: 142 rows

**Subscription Statuses:**
- `active`: 1,047 subscriptions
- `past_due`: 81 subscriptions
- `incomplete`: 13 subscriptions

**Refunds/Cancellations:**
- **ZERO** refunded transactions in current CSV
- **ZERO** canceled transactions (canceled_at field always empty)

### The Duplicate Subscription Problem (Lines 805 & 807)

**Discovery:** Same transaction, same child, but different subscription IDs

```
Line 805:
  Transaction ID: txn_3Nmi5nBgn05wH70k1PUvTEwc
  Charge ID: ch_3Nmi5nBgn05wH70k1fC9uqa5
  Invoice ID: in_1Nmi5nBgn05wH70kOnLufZjI
  Child: Buntita
  Subscription ID: sub_1Nmi5nBgn05wH70kNDqe7oef ← DIFFERENT
  Subscription Status: active

Line 807:
  Transaction ID: txn_3Nmi5nBgn05wH70k1PUvTEwc (SAME)
  Charge ID: ch_3Nmi5nBgn05wH70k1fC9uqa5 (SAME)
  Invoice ID: in_1Nmi5nBgn05wH70kOnLufZjI (SAME)
  Child: Buntita (SAME)
  Subscription ID: sub_1NmhtOBgn05wH70kZvYblDLO ← DIFFERENT
  Subscription Status: active
```

**Implication:** Stripe charged the user ONCE but it's linked to TWO separate subscriptions for the same child. This is likely a Stripe bug or duplicate subscription creation that needs admin review.

**Current Behavior:** Line 807 is marked "Skipped - already imported" (correct per current logic), but we lose visibility into the duplicate subscription issue.

---

## Proposed Design Changes

### 1. Add Status Field to Donations

**New `status` enum column on `donations` table:**

```ruby
# Possible values:
- succeeded       # Payment completed successfully (default for existing records)
- refunded        # Payment was refunded after initial success
- canceled        # Subscription canceled, payment voided
- failed          # Payment attempt failed
- needs_attention # Invalid data, duplicate subscription, or other issue requiring review
```

**Benefits:**
- Single source of truth for all payment states
- No need for separate `failed_stripe_payments` table
- Matches Stripe's payment lifecycle model
- Easy to filter and report on

### 2. Enhanced Uniqueness Detection

**Current Logic:**
```ruby
# Check: Does invoice + child already exist?
sponsorship_donation_exists?(stripe_invoice_id, child_id)
```

**Proposed Logic:**
```ruby
# Primary check: Does subscription + child already exist?
donation_exists_for_subscription?(stripe_subscription_id, child_id)

# Fallback for non-subscription donations:
donation_exists_for_charge?(stripe_charge_id, project_id)
```

**New `stripe_subscription_id` column on `donations` table** (nullable for non-subscription donations)

**Uniqueness Constraint:**
- **Sponsorships**: `stripe_subscription_id` + `child_id` (UNIQUE)
- **Project Donations**: `stripe_charge_id` + `project_id` (UNIQUE)
- **General Donations**: `stripe_charge_id` + `donor_id` (UNIQUE if no project/child)

**Detecting Duplicate Subscriptions:**
```ruby
# If invoice + child exists BUT subscription ID is different:
# → Create donation with status = 'needs_attention'
# → Set flag: duplicate_subscription_detected = true
```

### 3. Flexible Validation Strategy

**Current:** Reject donations with missing required fields (email, amount, etc.)

**Proposed:** Accept ALL donations, set status based on data quality

```ruby
def determine_donation_status
  return 'failed' if csv_row['Status'] == 'failed'
  return 'needs_attention' if missing_critical_fields?
  return 'needs_attention' if duplicate_subscription_detected?
  'succeeded'
end

def missing_critical_fields?
  donor_email.blank? || amount_cents.zero? || child_id.nil?
end
```

**Benefits:**
- Never lose import data
- Admin can review and fix problematic records
- Idempotent imports (re-running doesn't change status unless data changes)

### 4. Eliminate `failed_stripe_payments` Table

**Current:** Separate table for non-succeeded payments

**Proposed:** Migrate to `donations` table with `status` field

**Migration Strategy:**
1. Add `status` column to `donations` (default: 'succeeded')
2. Add `stripe_subscription_id` column to `donations`
3. Add `duplicate_subscription_detected` boolean flag
4. Add `needs_attention_reason` text field (for admin notes)
5. Migrate existing failed payments to donations with status='failed'
6. Drop `failed_stripe_payments` table

**Benefits:**
- Simpler data model
- All payment history in one place
- Easier reporting and analytics

### 5. Admin UI Rename and Enhancement

**Current:** "Failed Payments Section"

**Proposed:** "Payment Issues Section" or "Pending Review"

**Show donations where:**
- `status IN ('failed', 'refunded', 'canceled', 'needs_attention')`

**Enhanced Card Display:**
```typescript
<Card>
  <CardContent>
    <StatusBadge status={donation.status} />
    {donation.duplicate_subscription_detected && (
      <Chip label="Duplicate Subscription" color="warning" />
    )}
    {donation.needs_attention_reason && (
      <Alert severity="info">{donation.needs_attention_reason}</Alert>
    )}
    {/* ... existing donation details ... */}
    <Button onClick={handleResolve}>Mark as Resolved</Button>
  </CardContent>
</Card>
```

---

## Data Model Changes

### Migrations Required

#### 1. Add Donation Status Column
```ruby
class AddStatusToDonations < ActiveRecord::Migration[7.1]
  def change
    add_column :donations, :status, :string, null: false, default: 'succeeded'
    add_column :donations, :stripe_subscription_id, :string
    add_column :donations, :duplicate_subscription_detected, :boolean, default: false
    add_column :donations, :needs_attention_reason, :text

    add_index :donations, :status
    add_index :donations, :stripe_subscription_id
    add_index :donations, [:stripe_subscription_id, :child_id], unique: true, where: "child_id IS NOT NULL AND stripe_subscription_id IS NOT NULL"
  end
end
```

#### 2. Migrate Failed Payments to Donations
```ruby
class MigrateFailedPaymentsToDonations < ActiveRecord::Migration[7.1]
  def up
    FailedStripePayment.find_each do |failed_payment|
      # Find or create donor
      donor = Donor.find_or_create_by!(email: failed_payment.donor_email) do |d|
        d.name = failed_payment.donor_name || 'Unknown'
      end

      # Create donation with failed status
      Donation.create!(
        donor: donor,
        amount: failed_payment.amount_cents,
        date: failed_payment.payment_date,
        status: 'failed',
        stripe_charge_id: failed_payment.stripe_transaction_id,
        notes: failed_payment.description,
        needs_attention_reason: "Imported from failed payments: #{failed_payment.status}"
      )
    end
  end

  def down
    Donation.where(status: 'failed').destroy_all
  end
end
```

#### 3. Drop Failed Stripe Payments Table
```ruby
class DropFailedStripePayments < ActiveRecord::Migration[7.1]
  def up
    drop_table :failed_stripe_payments
  end

  def down
    # Recreate table if needed (backup safety)
    create_table :failed_stripe_payments do |t|
      # ... original schema ...
    end
  end
end
```

### Model Changes

#### Donation Model
```ruby
class Donation < ApplicationRecord
  # Status enum
  enum status: {
    succeeded: 'succeeded',
    failed: 'failed',
    refunded: 'refunded',
    canceled: 'canceled',
    needs_attention: 'needs_attention'
  }

  # Scopes
  scope :pending_review, -> { where(status: [:failed, :refunded, :canceled, :needs_attention]) }
  scope :active, -> { where(status: :succeeded) }
  scope :for_subscription, ->(sub_id) { where(stripe_subscription_id: sub_id) }

  # Validations
  validates :status, presence: true, inclusion: { in: statuses.keys }
  validates :stripe_subscription_id, uniqueness: { scope: :child_id }, allow_nil: true, if: :sponsorship?

  def sponsorship?
    child_id.present?
  end

  def needs_review?
    %w[failed refunded canceled needs_attention].include?(status)
  end
end
```

---

## Import Service Changes

### Enhanced StripePaymentImportService

```ruby
class StripePaymentImportService
  def import
    determine_payment_status

    case @payment_status
    when 'succeeded'
      import_successful_donation
    when 'failed', 'refunded', 'canceled'
      import_problematic_donation
    when 'needs_attention'
      import_attention_needed_donation
    end
  end

  private

  def determine_payment_status
    @payment_status = case @csv_row["Status"]
    when 'succeeded'
      check_for_duplicate_subscription? ? 'needs_attention' : 'succeeded'
    when 'failed'
      'failed'
    # Future: detect refunds/cancellations
    else
      'needs_attention'
    end
  end

  def check_for_duplicate_subscription?
    return false unless @csv_row["Cust Subscription Data ID"].present?

    subscription_id = @csv_row["Cust Subscription Data ID"]
    child_name = extract_child_name
    return false unless child_name

    child = Child.find_by(name: child_name)
    return false unless child

    # Check if DIFFERENT subscription exists for same invoice + child
    existing = Donation.joins(:stripe_invoice)
                       .where(stripe_invoices: { stripe_invoice_id: @csv_row["Invoice"] })
                       .where(child_id: child.id)
                       .where.not(stripe_subscription_id: subscription_id)
                       .exists?

    existing
  end

  def import_problematic_donation
    # Create donation even if data is incomplete
    donation = Donation.new(
      donor: find_or_create_donor_flexible,
      amount: safe_amount_in_cents,
      date: safe_parse_date,
      status: @payment_status,
      stripe_charge_id: @csv_row["Transaction ID"],
      stripe_subscription_id: @csv_row["Cust Subscription Data ID"],
      stripe_invoice_id: @csv_row["Invoice"],
      child_id: safe_find_child&.id,
      project_id: safe_map_project&.id,
      needs_attention_reason: build_attention_reason
    )

    donation.save!(validate: false) # Skip validations for problematic data

    skip_result("Non-succeeded payment tracked: #{@payment_status}")
  end

  def build_attention_reason
    reasons = []
    reasons << "Duplicate subscription detected" if check_for_duplicate_subscription?
    reasons << "Missing donor email" if @csv_row["Cust Email"].blank?
    reasons << "Missing amount" if @csv_row["Amount"].blank?
    reasons << "Status: #{@csv_row['Status']}"
    reasons.join("; ")
  end
end
```

---

## Frontend Changes

### Rename and Enhance Admin Section

**Files to Update:**
- `src/pages/AdminPage.tsx` - Rename tab from "Failed Payments" to "Pending Review"
- `src/components/FailedPaymentsSection.tsx` → `PendingReviewSection.tsx`
- `src/components/FailedPaymentList.tsx` → `PendingDonationList.tsx`
- `src/types/failedPayment.ts` → Update to use Donation type with status field

### Enhanced Donation Type

```typescript
// src/types/donation.ts
export type DonationStatus =
  | 'succeeded'
  | 'failed'
  | 'refunded'
  | 'canceled'
  | 'needs_attention';

export interface Donation {
  id: number;
  donor_id: number;
  donor_name: string;
  amount: number;
  date: string;
  status: DonationStatus;
  stripe_charge_id?: string;
  stripe_subscription_id?: string;
  duplicate_subscription_detected: boolean;
  needs_attention_reason?: string;
  child_id?: number;
  child_name?: string;
  project_id?: number;
  project_title?: string;
  // ... other fields
}
```

### New Pending Review Section

```typescript
const PendingReviewSection: React.FC = () => {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchPendingDonations = useCallback(async () => {
    const params: any = { page: currentPage, per_page: 25 };

    // Filter by status (failed, refunded, canceled, needs_attention)
    if (statusFilter !== 'all') {
      params['q[status_eq]'] = statusFilter;
    } else {
      params['q[status_in]'] = ['failed', 'refunded', 'canceled', 'needs_attention'];
    }

    const response = await apiClient.get('/api/donations', { params });
    setDonations(response.data.donations);
  }, [currentPage, statusFilter]);

  // ... rest of component
};
```

---

## Import Summary Output Changes

### Current Output
```
Summary:
  Imported:       1244 donations
  Failed/Tracked: 114 (new non-succeeded payments tracked)
  Skipped:        106 (already imported or already tracked)
  Failed:         0
```

### Proposed Output
```
Summary:
  Imported:               1244 donations (succeeded)
  Needs Attention:        28 donations (duplicate subscriptions or data issues)
  Failed Payments:        86 donations (payment failures)
  Skipped:                106 (already imported)
  Validation Errors:      0

Breakdown by Status:
  succeeded:        1244
  needs_attention:  28
  failed:           86
  refunded:         0
  canceled:         0
```

---

## Idempotency Strategy

### Current Challenge
Running import multiple times may:
- Create duplicate "needs attention" records for same issue
- Change status of already-reviewed donations

### Proposed Solution

```ruby
class StripePaymentImportService
  def import
    # Check if donation already exists (any status)
    existing = find_existing_donation

    if existing
      # Update status ONLY if current CSV data indicates change
      update_existing_donation_if_needed(existing)
      return skip_result("Already imported (ID: #{existing.id})")
    end

    # Create new donation
    create_new_donation
  end

  private

  def find_existing_donation
    # Try subscription + child first
    if @csv_row["Cust Subscription Data ID"].present? && child
      Donation.find_by(
        stripe_subscription_id: @csv_row["Cust Subscription Data ID"],
        child_id: child.id
      )
    # Fall back to charge + project/child
    elsif @csv_row["Transaction ID"].present?
      Donation.find_by(
        stripe_charge_id: @csv_row["Transaction ID"],
        child_id: child&.id,
        project_id: project&.id
      )
    end
  end

  def update_existing_donation_if_needed(donation)
    new_status = determine_payment_status

    # Only update if status changed in Stripe
    if donation.status != new_status
      donation.update!(
        status: new_status,
        needs_attention_reason: "Status updated from #{donation.status} to #{new_status} on re-import"
      )
    end
  end
end
```

---

## Testing Strategy

### Backend Tests

```ruby
# spec/models/donation_spec.rb
describe 'status' do
  it 'allows valid statuses' do
    %w[succeeded failed refunded canceled needs_attention].each do |status|
      expect(build(:donation, status: status)).to be_valid
    end
  end

  it 'rejects invalid statuses' do
    expect { build(:donation, status: 'invalid') }.to raise_error(ArgumentError)
  end
end

describe 'scopes' do
  it 'pending_review includes non-succeeded donations' do
    succeeded = create(:donation, status: 'succeeded')
    failed = create(:donation, status: 'failed')
    needs_attention = create(:donation, status: 'needs_attention')

    expect(Donation.pending_review).to include(failed, needs_attention)
    expect(Donation.pending_review).not_to include(succeeded)
  end
end

# spec/services/stripe_payment_import_service_spec.rb
describe 'duplicate subscription detection' do
  it 'creates needs_attention donation when duplicate subscription detected' do
    # Create first donation with subscription A
    first_csv = valid_csv_row.merge(
      'Cust Subscription Data ID' => 'sub_A',
      'Invoice' => 'in_123'
    )
    described_class.new(first_csv).import

    # Import same invoice + child but DIFFERENT subscription
    second_csv = valid_csv_row.merge(
      'Cust Subscription Data ID' => 'sub_B', # DIFFERENT
      'Invoice' => 'in_123' # SAME
    )
    result = described_class.new(second_csv).import

    donation = Donation.last
    expect(donation.status).to eq('needs_attention')
    expect(donation.duplicate_subscription_detected).to be true
  end
end
```

### Frontend Tests

```typescript
// src/components/PendingDonationList.test.tsx
describe('PendingDonationList', () => {
  it('displays status badge with correct color', () => {
    const donations: Donation[] = [
      { ...mockDonation, status: 'failed' },
      { ...mockDonation, status: 'needs_attention' },
    ];

    render(<PendingDonationList donations={donations} />);

    expect(screen.getByText('FAILED')).toHaveClass('MuiChip-colorError');
    expect(screen.getByText('NEEDS ATTENTION')).toHaveClass('MuiChip-colorWarning');
  });

  it('shows duplicate subscription warning', () => {
    const donation: Donation = {
      ...mockDonation,
      duplicate_subscription_detected: true
    };

    render(<PendingDonationList donations={[donation]} />);

    expect(screen.getByText(/duplicate subscription/i)).toBeInTheDocument();
  });
});
```

---

## Development Strategy: Branch-Based Workflow

### Context: Pre-Production Simplicity

**Why NOT feature flags:**
- Single developer + AI assistant
- No production users yet
- Can drop database freely during development
- Small codebase
- No need for complex coordination

**Why branches work better:**
- ✅ Simpler code (one path, not two)
- ✅ Faster development (write code once)
- ✅ Easier testing (single code path)
- ✅ Clean cutover (merge when ready)
- ✅ Less cleanup (no feature flag code to remove)

### Workflow

#### Step 1: Commit Current Work to Master
```bash
git add .
git commit -m "backend/frontend: TICKET-076 partial - card display and import summary (PAUSED)"
git push origin master
```

Current work (enhanced card display, import summary fix, failed payments infrastructure) goes into master as-is. It's functional even if incomplete.

#### Step 2: Create Feature Branch
```bash
git checkout -b feature/stripe-import-redesign
```

All redesign work (TICKET-109 through TICKET-113) happens on this branch.

#### Step 3: Build New System on Branch

**TICKET-109:** Add new columns (status, stripe_subscription_id, etc.)
```bash
# On feature branch
rails generate migration AddStatusToDonations
# ... implement migration ...
git add . && git commit -m "backend: add donation status infrastructure (TICKET-109)"
```

**TICKET-110:** Replace import service with new logic
```bash
# NO feature flags - just replace the old logic directly
# app/services/stripe_payment_import_service.rb
def import
  determine_payment_status  # New method
  # ... new logic with status and metadata ...
end

git add . && git commit -m "backend: new import service with status and metadata (TICKET-110)"
```

**TICKET-111:** Build new admin UI
```bash
# Replace FailedPaymentsSection with PendingReviewSection
# NO feature flags - just build new component
git add . && git commit -m "frontend: pending review admin UI (TICKET-111)"
```

#### Step 4: Test on Branch
```bash
# Drop database, test import on branch
docker-compose exec api rails db:drop db:create db:migrate
docker-compose exec api rails stripe:import_csv

# Validate results in UI at localhost:3001/admin
# Client demo? Just show them the branch
```

#### Step 5: Merge When Ready
```bash
# Validation passed, ready to ship
git checkout master
git merge feature/stripe-import-redesign
git push origin master

# Drop database one final time with new system
docker-compose exec api rails db:drop db:create db:migrate
docker-compose exec api rails stripe:import_csv
```

#### Step 6: Cleanup (TICKET-113)
```bash
# Now on master after merge
# Drop old failed_stripe_payments table
# Remove old components
git add . && git commit -m "cleanup: remove old failed payments system (TICKET-113)"
```

### Benefits

✅ **Simpler:** No feature flag code, config, conditionals, or cleanup
✅ **Faster:** Write code once, not twice (old path + new path)
✅ **Cleaner:** Single code path to test and maintain
✅ **Safer:** Master stays stable while experimenting on branch
✅ **Flexible:** Easy to demo by switching branches, easy to abandon if needed

---

## Webhook Alignment & Data Source Strategy

### Problem: Webhooks vs CSV Data Extraction

**Current CSV approach:**
- Child name: Parse from `Cust Subscription Data Plan Nickname` ("Monthly Sponsorship Donation for **Buntita**")
- Project: Parse from `Description` field using pattern matching

**Webhook challenge:**
- Webhook payload includes subscription ID but NOT plan details
- Would require `Stripe::Subscription.retrieve(id)` API call for EVERY webhook
- Expensive, slow, rate-limited

### Solution: Metadata as Primary, Parsing as Fallback

**Stripe Best Practice:** Store structured data in metadata

```ruby
# Future: When creating subscriptions (Stripe checkout UI)
Stripe::Subscription.create({
  customer: 'cus_123',
  items: [{price: 'price_123'}],
  metadata: {
    child_id: '42',              # Direct lookup, no parsing
    source: 'donation_tracker'   # Verification
  }
})

# Future: When creating one-time charges
Stripe::Charge.create({
  amount: 5000,
  metadata: {
    project_id: '7',
    donation_type: 'general',
    source: 'donation_tracker'
  }
})
```

**Enhanced Import Service (Dual-Source):**
```ruby
def get_child
  # Priority 1: Metadata (webhooks, future Stripe UI)
  child_id = @csv_row.dig('metadata', 'child_id')
  return Child.find_by(id: child_id) if child_id.present?

  # Priority 2: Parse nickname (current CSV exports, backwards compatibility)
  child_name = extract_child_from_nickname(@csv_row['Cust Subscription Data Plan Nickname'])
  Child.find_by(name: child_name) if child_name
end

def get_project
  # Priority 1: Metadata
  project_id = @csv_row.dig('metadata', 'project_id')
  return Project.find_by(id: project_id) if project_id.present?

  # Priority 2: Description mapping (current CSV)
  map_description_to_project(@csv_row['Description'])
end
```

### Benefits

✅ **Backwards Compatible**: Current CSV imports work unchanged (parsing fallback)
✅ **Webhook-Ready**: Metadata in payload, no extra API calls needed
✅ **Future-Proof**: Can add campaign_id, donor_notes, memorial info, etc.
✅ **Reliable**: No string parsing brittleness
✅ **International**: Handles unicode child names, special characters
✅ **Zero Rework**: TICKET-026 (webhooks) requires no import service changes

### Implementation Timeline

**Now (This Redesign):** Add metadata support to import service
**Later (Stripe Checkout UI):** Start adding metadata to new subscriptions
**Future (TICKET-026 Webhooks):** Metadata "just works", no rework needed
**Forever:** Parsing remains as legacy fallback for historical data

### Metadata Schema

```typescript
// Subscription metadata
{
  child_id: string,           // Required for sponsorships
  source: 'donation_tracker', // Required for verification
  notes?: string              // Optional admin notes
}

// Charge/Invoice metadata
{
  project_id?: string,        // For project donations
  donation_type: 'general' | 'campaign' | 'sponsorship',
  source: 'donation_tracker',
  campaign_id?: string,       // Future: TICKET-027
  memorial_name?: string      // Future: memorial donations
}
```

---

## Implementation Phases (Branch-Based)

### Phase 1: Infrastructure (TICKET-109)
**Branch:** `feature/stripe-import-redesign`
**Goal:** Add new columns

- Migration: Add status, stripe_subscription_id, duplicate_subscription_detected, needs_attention_reason
- Update Donation model with enum, scopes, validations
- Tests for new fields
- **Commit to branch**

---

### Phase 2: New Import Service (TICKET-110)
**Branch:** `feature/stripe-import-redesign` (same)
**Goal:** Replace import logic entirely

- Replace StripePaymentImportService.import method
- Add determine_donation_status
- Add metadata extraction (primary)
- Keep parsing as fallback
- Accept all data with status
- Update import summary
- **Commit to branch**

---

### Phase 3: New Admin UI (TICKET-111)
**Branch:** `feature/stripe-import-redesign` (same)
**Goal:** Replace admin section

- Create PendingReviewSection (replaces FailedPaymentsSection)
- Update Donation type
- Add status filters, pagination, date range
- Display warnings and reasons
- **Commit to branch**

---

### Phase 4: Validation (TICKET-112)
**Branch:** `feature/stripe-import-redesign` (same)
**Goal:** Validate before merge

- Drop DB on branch, import, validate
- Client review
- Fix any issues, commit to branch
- **Merge to master when approved**

---

### Phase 5: Cleanup (TICKET-113)
**Branch:** `master` (after merge)
**Goal:** Remove old system

- Drop failed_stripe_payments table
- Remove old model/controller/components
- Update documentation
- **Final commit on master**

---

## Pros and Cons

### Pros ✅

1. **Single Source of Truth**: All payment history in donations table
2. **Better Status Tracking**: Can track full payment lifecycle (succeeded → refunded)
3. **Admin Visibility**: Duplicate subscriptions flagged for review instead of silently skipped
4. **Data Preservation**: Never lose import data due to validation errors
5. **Idempotency**: Re-running imports is safe and updates status as needed
6. **Simpler Model**: Eliminate failed_stripe_payments table reduces complexity
7. **Scalability**: Ready for webhook integration (TICKET-026)
8. **Flexibility**: Can add new statuses as Stripe adds payment states

### Cons ❌

1. **Data Model Change**: Breaking change to donation schema (mitigated: can drop DB pre-production)
2. **Testing Overhead**: Need comprehensive tests for all status combinations
3. **Admin Workflow**: Requires new admin UI for reviewing/resolving issues
4. **Uniqueness Ambiguity**: Subscription ID may not always be reliable (Stripe bugs)
5. **Development Time**: Building new system takes 20+ hours across 5 tickets

---

## Alternative Approaches Considered

### Alternative 1: Keep Failed Payments Separate

**Approach:** Enhance failed_stripe_payments table instead

**Pros:**
- No changes to donations table
- Clear separation of concerns

**Cons:**
- Doesn't solve duplicate subscription problem
- Can't track refunds/cancellations on succeeded donations
- Two sources of truth
- More complex reporting

**Recommendation:** ❌ Not recommended

---

### Alternative 2: Add Separate Issues/Flags Table

**Approach:** Keep donations simple, add `donation_issues` table

```ruby
class DonationIssue
  belongs_to :donation
  enum issue_type: [:duplicate_subscription, :missing_data, :refund_pending]
  field :status, [:open, :investigating, :resolved]
  field :notes
end
```

**Pros:**
- Donations table stays focused
- Can track multiple issues per donation
- Clear audit trail

**Cons:**
- Additional table complexity
- Doesn't solve status tracking problem
- Still need status field for refunds/cancellations

**Recommendation:** ⚠️ Consider for future enhancement if needed

---

### Alternative 3: Stripe Subscription as Primary Key

**Approach:** Use stripe_subscription_id as primary uniqueness identifier

**Pros:**
- Matches Stripe's data model
- Clear uniqueness constraint

**Cons:**
- Non-subscription donations (one-time) have no subscription_id
- Requires complex dual-keying strategy
- Doesn't solve general donation status problem

**Recommendation:** ❌ Not recommended as sole solution

---

## Open Questions

1. **Admin Resolution Workflow**: What actions can admins take on "needs attention" donations?
   - Mark as resolved (change status to succeeded?)
   - Add notes
   - Delete/archive
   - Create corrected donation

2. **Status Transitions**: What transitions are allowed?
   - succeeded → refunded ✅
   - succeeded → canceled ✅
   - needs_attention → succeeded ✅
   - failed → succeeded ❓ (if payment eventually goes through?)

3. **Webhook Integration**: How will real-time Stripe webhooks update statuses?
   - `payment_intent.succeeded` → status = 'succeeded'
   - `charge.refunded` → status = 'refunded'
   - `subscription.canceled` → update all related donations?

4. **Reporting Impact**: How do status fields affect financial reports?
   - Include only 'succeeded' donations in totals?
   - Show refunds as negative amounts?
   - Track net vs. gross revenue?

5. **Failed Payment Retry**: If a failed payment eventually succeeds (user updates card), how do we handle it?
   - Update existing donation status?
   - Create new donation?
   - Link failed → succeeded donations?

---

## Recommendations

### Immediate Actions

1. ✅ **Accept Proposed Design** - Add status field to donations, deprecate failed_stripe_payments
2. ✅ **Use Subscription ID for Uniqueness** - Where available, supplement with charge ID fallback
3. ✅ **Flag Duplicate Subscriptions** - Don't skip them, create with needs_attention status
4. ⚠️ **Phased Rollout** - Follow 5-phase migration plan to minimize risk

### Future Enhancements

1. **Admin Resolution UI** - Ticket for admin actions on pending donations
2. **Automated Status Updates** - Webhook listener to update donation statuses in real-time
3. **Financial Reporting** - Adjust reports to filter by status
4. **Audit Log** - Track status changes over time (PaperTrail integration)

---

## Branch Cleanup (Completed)

**Date:** 2025-11-14
**Branch:** `feature/stripe-import-redesign`

### What Was Deleted

To prepare for the new design, we removed all TICKET-076 implementation code that's incompatible with the new `donations.status` approach:

**Backend Files Deleted:**
- `app/models/failed_stripe_payment.rb`
- `app/controllers/api/failed_stripe_payments_controller.rb`
- `app/presenters/failed_stripe_payment_presenter.rb`
- `db/migrate/20251113000001_create_failed_stripe_payments.rb`
- `spec/models/failed_stripe_payment_spec.rb`
- `spec/presenters/failed_stripe_payment_presenter_spec.rb`
- `spec/requests/api/failed_stripe_payments_spec.rb`
- `spec/factories/failed_stripe_payments.rb`

**Frontend Files Deleted:**
- `src/pages/AdminPage.tsx` + test (will recreate in TICKET-111)
- `src/components/FailedPaymentsSection.tsx` + test
- `src/components/FailedPaymentList.tsx` + test
- `src/types/failedPayment.ts`

**Test Data Deleted:**
- `skipped_rows.csv`
- `unmapped_donations.csv`

**Files Reverted to Master:**
- `stripe_payment_import_service.rb` (removed track_failed_payment logic)
- `stripe_csv_batch_importer.rb` (removed failed_tracked_count)
- Service specs (removed failed payment tests)
- `lib/tasks/stripe_import.rake` (reverted output)
- `config/routes.rb` (removed /api/failed_stripe_payments route)
- `db/schema.rb` (no failed_stripe_payments table)
- `src/App.tsx` + test (removed /admin route)
- `src/components/Navigation.tsx` + test (removed admin link)
- `src/types/index.ts` (removed FailedPayment export)

### What Was Kept

**Documentation (Modified):**
- ✅ `STRIPE_IMPORT_PLAN.md` - This strategic plan document
- ✅ `TICKET-076` - Marked as PAUSED with completion summary
- ✅ `TICKET-026` - Updated with metadata strategy for webhook alignment

**Backup Branch:**
- ✅ `backup/ticket-076-complete` - Contains ALL work from 39 TDD cycles (reference only)

### Rationale

**Why Delete Frontend Components Instead of Repurpose?**

We chose **Option A** (delete and recreate) over **Option B** (keep and repurpose) because:

1. **Cleaner Git History** - Fresh start shows clear transition to new design
2. **Type Safety** - Avoid confusion between `FailedPayment` and `Donation` types during development
3. **TDD from Scratch** - Follow strict TDD for new design without old code interference
4. **No Technical Debt** - Components designed specifically for failed_stripe_payments table aren't a good fit for donations.status approach
5. **Backup Available** - All code preserved in `backup/ticket-076-complete` branch if needed for reference

### Migration Table Status

The `failed_stripe_payments` table **was never committed to master**, so:
- ✅ No migration rollback needed
- ✅ No data migration needed
- ✅ Clean slate for TICKET-109 migration

---

## Success Criteria

### Phase 1-5 Complete When:

- [x] All donations have `status` field
- [x] Import service creates donations with appropriate status
- [x] Duplicate subscriptions flagged as needs_attention
- [x] Admin can view and filter pending donations
- [x] Failed_stripe_payments table dropped
- [x] Re-running imports is idempotent
- [x] All tests pass (backend + frontend)
- [x] Documentation updated

### User Acceptance:

- Admin can see all problematic donations in one place
- Duplicate subscription issues are visible and resolvable
- No data is lost during import (even invalid data is tracked)
- CSV imports can be re-run safely

---

**Next Steps:** Review plan → Update TICKET-076 → Create new tickets (109-113) → Begin Phase 1 implementation
