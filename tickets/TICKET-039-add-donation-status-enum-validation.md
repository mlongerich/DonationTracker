## [TICKET-039] Add Donation Status Enum Validation

**Status:** 📋 Planned
**Priority:** 🟢 Low
**Effort:** S (Small)
**Created:** 2025-10-18
**Dependencies:** None

### User Story
As a developer, I want donation status values to be validated against a defined enum so that only valid status values can be stored in the database.

### Problem Statement
The `donations.status` column:
- Currently accepts any string value (no validation)
- No defined enum or allowed values
- Prone to typos and inconsistent values
- No documentation of valid statuses

**Data Integrity Issue:** Missing validation on donation.rb:4
**Impact:** Potential for invalid/inconsistent status data

### Acceptance Criteria
- [ ] Define allowed status values as enum
- [ ] Add validation to Donation model
- [ ] Add database constraint (optional but recommended)
- [ ] Update existing donations to use valid status values
- [ ] Add tests for status validation
- [ ] All existing tests pass
- [ ] Update CLAUDE.md with enum pattern

### Technical Approach

#### 1. Define Status Enum in Model

**Option A: ActiveRecord Enum (Recommended)**
```ruby
# app/models/donation.rb
class Donation < ApplicationRecord
  belongs_to :donor

  # Define status enum
  enum status: {
    pending: 'pending',
    completed: 'completed',
    failed: 'failed',
    refunded: 'refunded'
  }, _prefix: true

  validates :amount, presence: true, numericality: { greater_than: 0 }
  validates :date, presence: true
  validate :date_not_in_future

  # ... rest of model
end
```

**Benefits:**
- Automatic query scopes (Donation.status_pending)
- Automatic predicate methods (donation.status_completed?)
- Automatic bang methods (donation.status_completed!)
- Type safety

**Usage:**
```ruby
# Creating
donation = Donation.create(status: :pending, ...)

# Querying
Donation.status_completed  # Scope for completed donations

# Checking
donation.status_completed?  # true/false

# Updating
donation.status_completed!  # Sets status to completed
```

---

**Option B: Simple Validation (Alternative)**
```ruby
# app/models/donation.rb
class Donation < ApplicationRecord
  STATUSES = %w[pending completed failed refunded].freeze

  validates :status, inclusion: {
    in: STATUSES,
    message: "%{value} is not a valid status"
  }, allow_nil: true

  # Helper methods
  def pending?
    status == 'pending'
  end

  def completed?
    status == 'completed'
  end
end
```

#### 2. Add Database Constraint (Optional but Recommended)

```ruby
# db/migrate/YYYYMMDDHHMMSS_add_status_constraint_to_donations.rb
class AddStatusConstraintToDonations < ActiveRecord::Migration[8.0]
  def up
    # Add check constraint for valid statuses
    execute <<-SQL
      ALTER TABLE donations
      ADD CONSTRAINT check_donations_status
      CHECK (status IN ('pending', 'completed', 'failed', 'refunded') OR status IS NULL);
    SQL
  end

  def down
    execute <<-SQL
      ALTER TABLE donations
      DROP CONSTRAINT check_donations_status;
    SQL
  end
end
```

**Benefits:**
- Database-level enforcement
- Prevents invalid data even outside Rails
- Better data integrity

#### 3. Migrate Existing Data

```ruby
# db/migrate/YYYYMMDDHHMMSS_normalize_donation_statuses.rb
class NormalizeDonationStatuses < ActiveRecord::Migration[8.0]
  def up
    # Set default status for null values
    Donation.where(status: nil).update_all(status: 'completed')

    # Normalize any existing invalid statuses (if any)
    # Add specific mappings as needed
  end

  def down
    # Reverse is complex, generally not needed
  end
end
```

#### 4. Update Ransack Whitelisting

```ruby
# app/models/donation.rb
def self.ransackable_attributes(auth_object = nil)
  [ "amount", "date", "donor_id", "status", "created_at", "updated_at" ]
end
```

### Status Definitions

| Status | Description | Use Case |
|--------|-------------|----------|
| `pending` | Donation initiated but not confirmed | Payment processing |
| `completed` | Donation successfully processed | Default for manual entries |
| `failed` | Donation attempt failed | Failed payment |
| `refunded` | Donation was refunded | Refund issued |

### Benefits
- **Data Integrity**: Only valid statuses allowed
- **Type Safety**: Enum provides compile-time checks
- **Query Helpers**: Automatic scopes and predicate methods
- **Documentation**: Clear definition of allowed values
- **Database Constraint**: Belt-and-suspenders validation

### Testing Strategy

```ruby
# spec/models/donation_spec.rb
RSpec.describe Donation, type: :model do
  describe "status enum" do
    it "allows pending status" do
      donation = build(:donation, status: :pending)
      expect(donation).to be_valid
      expect(donation.status_pending?).to be true
    end

    it "allows completed status" do
      donation = build(:donation, status: :completed)
      expect(donation).to be_valid
      expect(donation.status_completed?).to be true
    end

    it "allows failed status" do
      donation = build(:donation, status: :failed)
      expect(donation).to be_valid
      expect(donation.status_failed?).to be true
    end

    it "allows refunded status" do
      donation = build(:donation, status: :refunded)
      expect(donation).to be_valid
      expect(donation.status_refunded?).to be true
    end

    it "allows nil status" do
      donation = build(:donation, status: nil)
      expect(donation).to be_valid
    end

    it "rejects invalid status" do
      expect {
        build(:donation, status: :invalid)
      }.to raise_error(ArgumentError, /'invalid' is not a valid status/)
    end
  end

  describe "status scopes" do
    let!(:pending_donation) { create(:donation, status: :pending) }
    let!(:completed_donation) { create(:donation, status: :completed) }

    it "filters by pending status" do
      expect(Donation.status_pending).to include(pending_donation)
      expect(Donation.status_pending).not_to include(completed_donation)
    end

    it "filters by completed status" do
      expect(Donation.status_completed).to include(completed_donation)
      expect(Donation.status_completed).not_to include(pending_donation)
    end
  end

  describe "status transitions" do
    it "updates status using bang method" do
      donation = create(:donation, status: :pending)

      donation.status_completed!

      expect(donation.reload.status).to eq('completed')
    end
  end
end
```

### API Response Considerations

When using enum, Rails serializes to string by default:

```ruby
donation = Donation.create(status: :completed)
donation.to_json
# => { "status": "completed", ... }
```

This maintains API contract compatibility.

### Factory Updates

```ruby
# spec/factories/donations.rb
FactoryBot.define do
  factory :donation do
    donor
    amount { Faker::Number.decimal(l_digits: 3, r_digits: 2) }
    date { Faker::Date.between(from: 1.year.ago, to: Date.today) }
    status { :completed }  # Default to completed

    trait :pending do
      status { :pending }
    end

    trait :failed do
      status { :failed }
    end

    trait :refunded do
      status { :refunded }
    end
  end
end
```

### Files to Create
- `db/migrate/YYYYMMDDHHMMSS_normalize_donation_statuses.rb` (NEW)
- `db/migrate/YYYYMMDDHHMMSS_add_status_constraint_to_donations.rb` (NEW - optional)

### Files to Modify
- `app/models/donation.rb` (ADD enum or validation)
- `spec/models/donation_spec.rb` (ADD status validation tests)
- `spec/factories/donations.rb` (UPDATE default status)
- `CLAUDE.md` (UPDATE - add enum pattern documentation)

### Enum Pattern Documentation

Add to CLAUDE.md:

```markdown
### Enum Pattern for Status Fields

**When to use enums:**
- Fixed set of valid values (< 10 options)
- Values unlikely to change frequently
- Need predicate methods (status_completed?)
- Need query scopes (Donation.status_pending)

**ActiveRecord Enum Benefits:**
- Automatic scopes
- Predicate methods
- Bang methods for updates
- Type safety

**Example:**
```ruby
class Order < ApplicationRecord
  enum status: {
    pending: 'pending',
    shipped: 'shipped',
    delivered: 'delivered'
  }, _prefix: true
end

# Usage
order.status_pending?      # Predicate
Order.status_shipped       # Scope
order.status_delivered!    # Bang method
```
```

### Future Enhancements
- Add status transition validations (state machine with AASM gem)
- Add timestamps for status changes (status_changed_at)
- Add status change audit logging
- Add UI for status filtering in DonationList
- Add status badges in donation display

### State Machine Example (Future)

```ruby
# With AASM gem
class Donation < ApplicationRecord
  include AASM

  aasm column: :status do
    state :pending, initial: true
    state :completed
    state :failed
    state :refunded

    event :complete do
      transitions from: :pending, to: :completed
    end

    event :fail do
      transitions from: :pending, to: :failed
    end

    event :refund do
      transitions from: :completed, to: :refunded
    end
  end
end
```

### Related Tickets
- TICKET-035: Status index will enable fast filtering
- Part of data quality improvement initiative

### Notes
- Enum uses string values (not integers) for better database readability
- `_prefix: true` avoids method name conflicts
- Null status is allowed for backwards compatibility
- Database constraint provides defense in depth
- Update API documentation with valid status values
