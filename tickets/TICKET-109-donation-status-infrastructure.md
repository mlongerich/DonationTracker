## [TICKET-109] Donation Status Infrastructure

**Status:** 📋 Planned
**Priority:** 🔴 High - Foundational Change
**Dependencies:** None (first ticket in STRIPE_IMPORT_PLAN redesign)
**Created:** 2025-11-14
**Branch:** `feature/stripe-import-redesign`

**⭐ CODE LIFECYCLE: PERMANENT - Production Infrastructure**

---

### User Story
As a developer, I want to add comprehensive status tracking to donations so that we can track the full payment lifecycle (succeeded, failed, refunded, canceled, needs_attention) instead of using a separate failed_stripe_payments table.

---

### Context

**Part of:** docs/STRIPE_IMPORT_PLAN.md - Phase 1
**Why:** Current system uses separate `failed_stripe_payments` table, but we need status on donations to:
1. Track full payment lifecycle (succeeded → refunded)
2. Flag duplicate subscriptions for review
3. Accept all import data with appropriate status
4. Prepare for webhook integration (TICKET-026)

**See:** docs/STRIPE_IMPORT_PLAN.md for full redesign rationale

---

### Acceptance Criteria

**Backend Infrastructure:**
- [ ] Migration: Add `status` column (string, not null, default: 'succeeded')
- [ ] Migration: Add `stripe_subscription_id` column (string, nullable, indexed)
- [ ] Migration: Add `duplicate_subscription_detected` column (boolean, default: false)
- [ ] Migration: Add `needs_attention_reason` column (text, nullable)
- [ ] Migration: Add composite unique index on `[stripe_subscription_id, child_id]` where both not null
- [ ] Migration: Add index on `status` for filtering
- [ ] Model: Add status enum with values: succeeded, failed, refunded, canceled, needs_attention
- [ ] Model: Add scope `pending_review` (status != succeeded)
- [ ] Model: Add scope `active` (status == succeeded)
- [ ] Model: Add scope `for_subscription(subscription_id)`
- [ ] Model: Add validation for status presence and inclusion
- [ ] Model: Add conditional uniqueness validation for subscription_id + child_id (sponsorships only)
- [ ] Model: Add `needs_review?` method

**Testing:**
- [ ] RSpec: Status enum tests (valid values, invalid values)
- [ ] RSpec: Scope tests (pending_review, active, for_subscription)
- [ ] RSpec: Validation tests (status, uniqueness)
- [ ] RSpec: `needs_review?` method tests
- [ ] All tests pass (90% backend coverage)

**Documentation:**
- [ ] Update docs/DonationTracking.md with new donation fields
- [ ] Update CLAUDE.md if patterns change
- [ ] Migration is reversible

---

### Technical Approach

#### 1. Migration

```ruby
# db/migrate/YYYYMMDDHHMMSS_add_status_to_donations.rb
class AddStatusToDonations < ActiveRecord::Migration[7.1]
  def change
    # Status tracking
    add_column :donations, :status, :string, null: false, default: 'succeeded'
    add_index :donations, :status

    # Stripe subscription tracking
    add_column :donations, :stripe_subscription_id, :string
    add_index :donations, :stripe_subscription_id

    # Issue tracking
    add_column :donations, :duplicate_subscription_detected, :boolean, default: false
    add_column :donations, :needs_attention_reason, :text

    # Uniqueness constraint for subscriptions
    # Only enforce when both subscription_id and child_id are present
    add_index :donations,
              [:stripe_subscription_id, :child_id],
              unique: true,
              where: "child_id IS NOT NULL AND stripe_subscription_id IS NOT NULL",
              name: 'index_donations_on_subscription_and_child'
  end
end
```

**Why these fields?**
- `status`: Core field for tracking payment lifecycle
- `stripe_subscription_id`: Currently only in sponsorships, need on donations for uniqueness
- `duplicate_subscription_detected`: Flag for admin review (same child, different subscription IDs)
- `needs_attention_reason`: Human-readable explanation of issues

**Why conditional unique index?**
- One-time donations: No subscription_id, can't enforce uniqueness
- Subscriptions: Prevents duplicate child sponsorships with same subscription ID
- Partial index (WHERE clause) only enforces when both fields present

---

#### 2. Model Updates

```ruby
# app/models/donation.rb
class Donation < ApplicationRecord
  include Discard::Model

  belongs_to :donor
  belongs_to :project, optional: true
  belongs_to :sponsorship, optional: true

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
  scope :for_subscription, ->(subscription_id) { where(stripe_subscription_id: subscription_id) }

  # Validations
  validates :amount, presence: true, numericality: { greater_than: 0, only_integer: true }
  validates :date, presence: true
  validates :status, presence: true, inclusion: { in: statuses.keys }
  validates :stripe_subscription_id,
            uniqueness: { scope: :child_id },
            allow_nil: true,
            if: :sponsorship?

  # Instance methods
  def sponsorship?
    child_id.present?
  end

  def needs_review?
    %w[failed refunded canceled needs_attention].include?(status)
  end

  def self.ransackable_attributes(_auth_object = nil)
    %w[
      id amount date donor_id project_id sponsorship_id child_id
      stripe_charge_id stripe_customer_id stripe_subscription_id
      payment_method status duplicate_subscription_detected
      created_at updated_at discarded_at
    ]
  end

  def self.ransackable_associations(_auth_object = nil)
    %w[donor project sponsorship]
  end
end
```

---

#### 3. Testing Strategy

```ruby
# spec/models/donation_spec.rb
RSpec.describe Donation, type: :model do
  describe 'status enum' do
    it 'allows succeeded status' do
      donation = build(:donation, status: 'succeeded')
      expect(donation).to be_valid
      expect(donation).to be_succeeded
    end

    it 'allows failed status' do
      donation = build(:donation, status: 'failed')
      expect(donation).to be_valid
      expect(donation).to be_failed
    end

    it 'allows refunded status' do
      donation = build(:donation, status: 'refunded')
      expect(donation).to be_valid
      expect(donation).to be_refunded
    end

    it 'allows canceled status' do
      donation = build(:donation, status: 'canceled')
      expect(donation).to be_valid
      expect(donation).to be_canceled
    end

    it 'allows needs_attention status' do
      donation = build(:donation, status: 'needs_attention')
      expect(donation).to be_valid
      expect(donation).to be_needs_attention
    end

    it 'rejects invalid status' do
      expect {
        build(:donation, status: 'invalid')
      }.to raise_error(ArgumentError)
    end

    it 'defaults to succeeded' do
      donation = Donation.new(donor: create(:donor), amount: 10000, date: Date.today)
      expect(donation.status).to eq('succeeded')
    end
  end

  describe 'scopes' do
    let!(:succeeded_donation) { create(:donation, status: 'succeeded') }
    let!(:failed_donation) { create(:donation, status: 'failed') }
    let!(:refunded_donation) { create(:donation, status: 'refunded') }
    let!(:canceled_donation) { create(:donation, status: 'canceled') }
    let!(:needs_attention_donation) { create(:donation, status: 'needs_attention') }

    describe '.pending_review' do
      it 'returns only non-succeeded donations' do
        results = Donation.pending_review
        expect(results).to contain_exactly(
          failed_donation, refunded_donation, canceled_donation, needs_attention_donation
        )
      end
    end

    describe '.active' do
      it 'returns only succeeded donations' do
        results = Donation.active
        expect(results).to contain_exactly(succeeded_donation)
      end
    end

    describe '.for_subscription' do
      let!(:subscription_donation) do
        create(:donation, stripe_subscription_id: 'sub_123')
      end

      it 'returns donations for subscription' do
        results = Donation.for_subscription('sub_123')
        expect(results).to contain_exactly(subscription_donation)
      end

      it 'returns empty for unknown subscription' do
        expect(Donation.for_subscription('sub_999')).to be_empty
      end
    end
  end

  describe 'validations' do
    it 'requires status' do
      donation = build(:donation, status: nil)
      expect(donation).not_to be_valid
      expect(donation.errors[:status]).to include("can't be blank")
    end

    describe 'stripe_subscription_id uniqueness' do
      let(:child) { create(:child) }
      let!(:existing) do
        create(:donation,
               stripe_subscription_id: 'sub_123',
               child_id: child.id)
      end

      it 'prevents duplicate subscription_id + child_id' do
        duplicate = build(:donation,
                          stripe_subscription_id: 'sub_123',
                          child_id: child.id)
        expect(duplicate).not_to be_valid
        expect(duplicate.errors[:stripe_subscription_id]).to be_present
      end

      it 'allows same subscription_id with different child' do
        other_child = create(:child)
        donation = build(:donation,
                         stripe_subscription_id: 'sub_123',
                         child_id: other_child.id)
        expect(donation).to be_valid
      end

      it 'allows nil subscription_id' do
        donation = build(:donation,
                         stripe_subscription_id: nil,
                         child_id: child.id)
        expect(donation).to be_valid
      end

      it 'allows nil child_id' do
        donation = build(:donation,
                         stripe_subscription_id: 'sub_456',
                         child_id: nil)
        expect(donation).to be_valid
      end
    end
  end

  describe '#needs_review?' do
    it 'returns true for failed status' do
      donation = build(:donation, status: 'failed')
      expect(donation.needs_review?).to be true
    end

    it 'returns true for refunded status' do
      donation = build(:donation, status: 'refunded')
      expect(donation.needs_review?).to be true
    end

    it 'returns true for canceled status' do
      donation = build(:donation, status: 'canceled')
      expect(donation.needs_review?).to be true
    end

    it 'returns true for needs_attention status' do
      donation = build(:donation, status: 'needs_attention')
      expect(donation.needs_review?).to be true
    end

    it 'returns false for succeeded status' do
      donation = build(:donation, status: 'succeeded')
      expect(donation.needs_review?).to be false
    end
  end

  describe '#sponsorship?' do
    it 'returns true when child_id present' do
      child = create(:child)
      donation = build(:donation, child_id: child.id)
      expect(donation.sponsorship?).to be true
    end

    it 'returns false when child_id nil' do
      donation = build(:donation, child_id: nil)
      expect(donation.sponsorship?).to be false
    end
  end
end
```

---

### Files to Create
- `db/migrate/YYYYMMDDHHMMSS_add_status_to_donations.rb`

### Files to Modify
- `app/models/donation.rb` (add enum, scopes, validations, methods)
- `spec/models/donation_spec.rb` (add comprehensive status tests)
- `spec/factories/donations.rb` (update factory to support status)
- `db/schema.rb` (generated by migration)
- `DonationTracking.md` (document new fields)

### Files NOT to Touch
- Controllers (no changes yet - TICKET-110 will update import service)
- Presenters (no changes yet - status will be included in JSON automatically)
- Frontend (no changes yet - TICKET-111 will build new UI)

---

### Related Tickets

**This Redesign (Phase 1):**
- **TICKET-110**: New Import Service (depends on this ticket)
- **TICKET-111**: Pending Review UI (depends on this ticket)
- **TICKET-112**: Validation & Merge (depends on TICKET-110, TICKET-111)
- **TICKET-113**: Cleanup Old System (depends on TICKET-112 merge)

**Replaces:**
- TICKET-076 (Failed Stripe Payments Tracking) - **PAUSED**

**Enables:**
- TICKET-026 (Stripe Webhook Integration) - Requires TICKET-110 metadata support

**See:**
- docs/STRIPE_IMPORT_PLAN.md - Full redesign context and rationale
- backup/ticket-076-complete branch - Reference for replaced approach

---

### Success Criteria

**Definition of Done:**
- [ ] Migration runs cleanly forward and backward
- [ ] All RSpec tests pass (status enum, scopes, validations, methods)
- [ ] Factory supports all status values
- [ ] 90% backend coverage maintained
- [ ] Can create donations with all status values
- [ ] Ransack filtering works with new fields
- [ ] Documentation updated

**Ready for Next Ticket:**
- [ ] TICKET-110 can use new status field in import service
- [ ] TICKET-111 can query pending_review donations in UI

---

### Notes
- **Database:** Can drop and recreate freely (pre-production)
- **Breaking Change:** Yes - adds required status column, but default handles existing data
- **Rollback:** Migration is reversible
- **Testing:** Follow strict TDD - write tests first, one at a time
- **Commit:** Commit to `feature/stripe-import-redesign` branch when complete
- **No Feature Flags:** Branch-based workflow (see docs/STRIPE_IMPORT_PLAN.md)

---

*Created: 2025-11-14*
*Part of docs/STRIPE_IMPORT_PLAN.md Phase 1 (Infrastructure)*
