## [TICKET-037] Standardize Service Object Patterns

**Status:** ✅ Complete
**Priority:** 🟢 Low
**Effort:** M (Medium - 4-5 hours)
**Created:** 2025-10-18
**Updated:** 2025-12-01
**Completed:** 2025-12-01
**Dependencies:** None (Note: DonorService now includes TICKET-075 Stripe integration and TICKET-100 phone/address preservation)

### User Story
As a developer, I want consistent service object patterns across the codebase so that I can easily understand and maintain service logic.

### Problem Statement
Service objects currently use inconsistent patterns:
- `DonorService` uses class methods (stateless)
- `DonorImportService` uses instance methods (stateful)
- `DonorMergeService` uses instance methods (stateful)

**Code Smell:** Inconsistent patterns across service objects
**Issue:** DonorService:2 vs DonorImportService:8 vs DonorMergeService:12

### Established Pattern (from TICKET-014)
Per CLAUDE.md conventions:
- **Class methods** for simple, stateless operations
- **Instance methods** for complex, multi-step operations with state

### Current Analysis (Updated 2025-12-01)

**DonorService** (class method - 130 lines total):
```ruby
class DonorService
  def self.find_or_update_by_email_or_stripe_customer(donor_attributes, stripe_customer_id, transaction_date)
    # Priority 1: Check for Stripe customer ID
    # Priority 2: Fallback to email lookup
    # Added in TICKET-075 for Stripe integration
  end

  def self.find_or_update_by_email(donor_attributes, transaction_date)
    # Complex logic with multiple steps
    # Includes phone/address preservation (TICKET-100)
    # 5 private class methods
  end

  private

  def self.normalize_email(donor_attributes)
    # Email generation from phone/address/name
  end

  def self.find_existing_donor(lookup_email)
    # Database lookup
  end

  def self.update_existing_donor(existing_donor, donor_attributes, transaction_date)
    # Date-based conflict resolution
  end

  def self.build_update_attributes(donor_attributes, transaction_date)
    # Field preservation logic (phone, address fields)
  end

  def self.create_new_donor(donor_attributes, transaction_date)
    # New donor creation
  end
end
```

**Issue**: This is a complex, multi-step operation with stateful logic that should use instance pattern for consistency with other services (DonorMergeService, DonorImportService, StripePaymentImportService).

### Acceptance Criteria
- [ ] Refactor `DonorService` to use instance pattern with unified `find_or_update` method
- [ ] Support both Stripe customer ID lookup and email lookup in single interface
- [ ] Update all callers of `DonorService` to use new pattern (3 files: DonorsController, DonorImportService, StripePaymentImportService)
- [ ] Maintain backwards compatibility during migration (temporary class method wrappers)
- [ ] Update all existing specs (17 tests) to use instance pattern
- [ ] All existing tests pass without breaking changes
- [ ] Remove backwards compatibility wrappers after migration complete
- [ ] Update CLAUDE.md with real DonorService example for Service Object Patterns section
- [ ] Document when to use class vs instance methods

### Implementation Notes (2025-12-01)

**Key Decision:** Unify both `find_or_update_by_email` and `find_or_update_by_email_or_stripe_customer` into single `find_or_update` instance method.

**New Interface:**
```ruby
# Email-only lookup (DonorImportService, DonorsController)
service = DonorService.new(
  donor_attributes: { name: "John", email: "john@example.com" },
  transaction_date: Time.current
)
result = service.find_or_update

# Stripe customer ID + email lookup (StripePaymentImportService)
service = DonorService.new(
  donor_attributes: { name: "John", email: "john@example.com" },
  transaction_date: Time.current,
  stripe_customer_id: "cus_123"
)
result = service.find_or_update
```

**Backwards Compatibility (Temporary):**
```ruby
# Keep during migration, remove after all callers updated
def self.find_or_update_by_email(donor_attributes, transaction_date)
  new(donor_attributes: donor_attributes, transaction_date: transaction_date).find_or_update
end

def self.find_or_update_by_email_or_stripe_customer(donor_attributes, stripe_customer_id, transaction_date)
  new(
    donor_attributes: donor_attributes,
    transaction_date: transaction_date,
    stripe_customer_id: stripe_customer_id
  ).find_or_update
end
```

### Technical Approach

#### 1. Refactor DonorService to Instance Pattern

**Before:**
```ruby
# app/services/donor_service.rb
class DonorService
  def self.find_or_update_by_email(donor_attributes, transaction_date)
    # Complex logic with multiple steps
  end

  private

  def self.normalize_email(email, name)
    # Helper method
  end
end
```

**After:**
```ruby
# app/services/donor_service.rb
class DonorService
  def initialize(donor_attributes:, transaction_date:)
    @donor_attributes = donor_attributes
    @transaction_date = transaction_date
    @email = nil
    @existing_donor = nil
  end

  def find_or_update
    normalize_email
    find_existing_donor
    create_or_update_donor
  end

  private

  attr_reader :donor_attributes, :transaction_date
  attr_accessor :email, :existing_donor

  def normalize_email
    @email = if donor_attributes[:email].blank?
      generate_email_from_name
    else
      donor_attributes[:email]
    end
  end

  def generate_email_from_name
    normalized_name = donor_attributes[:name].blank? ? "Anonymous" : donor_attributes[:name]
    clean_name = normalized_name.gsub(/\s+/, "")
    "#{clean_name}@mailinator.com"
  end

  def find_existing_donor
    @existing_donor = Donor.where("LOWER(email) = ?", email.downcase).first
  end

  def create_or_update_donor
    if existing_donor
      update_existing_donor
    else
      create_new_donor
    end
  end

  def update_existing_donor
    if transaction_date > existing_donor.last_updated_at
      update_attrs = donor_attributes.merge(last_updated_at: transaction_date)
      update_attrs.delete(:name) if donor_attributes[:name].blank?
      existing_donor.update!(update_attrs)
    end
    { donor: existing_donor, created: false }
  end

  def create_new_donor
    donor = Donor.new(donor_attributes)
    donor.last_updated_at = transaction_date
    donor.save!
    { donor: donor, created: true }
  end
end
```

#### 2. Update All Callers

**DonorsController:**
```ruby
# Before:
result = DonorService.find_or_update_by_email(donor_params, Time.current)

# After:
result = DonorService.new(
  donor_attributes: donor_params,
  transaction_date: Time.current
).find_or_update
```

**DonorImportService:**
```ruby
# Before:
result = DonorService.find_or_update_by_email(donor_attributes, import_time)

# After:
result = DonorService.new(
  donor_attributes: donor_attributes,
  transaction_date: import_time
).find_or_update
```

#### 3. Update Service Object Guidelines in CLAUDE.md

```markdown
### Service Object Pattern Conventions

**When to use Instance Methods (Complex Operations):**
- Multiple steps/phases of execution
- Internal state needs to be tracked
- Private helper methods needed
- Complex conditional logic
- Multiple instance variables

**Example:**
```ruby
class DonorMergeService
  def initialize(donor_ids:, field_selections:)
    @donor_ids = donor_ids
    @field_selections = field_selections
    @donors = nil
  end

  def merge
    validate_inputs!
    load_donors
    perform_merge_transaction
  end

  private
  # ... helper methods
end

# Usage:
DonorMergeService.new(donor_ids: [1,2], field_selections: {...}).merge
```

**When to use Class Methods (Simple Operations):**
- Single responsibility
- No internal state needed
- Pure function (same input → same output)
- No complex multi-step logic

**Example:**
```ruby
class EmailNormalizer
  def self.normalize(email)
    email.downcase.strip
  end
end

# Usage:
EmailNormalizer.normalize(email)
```

**Decision Matrix:**
- More than 3 private helper methods? → Instance
- More than 2 instance variables? → Instance
- Multi-step process? → Instance
- Simple transformation? → Class method
- Pure function? → Class method
```

### Benefits
- **Consistency**: All complex services follow same pattern
- **Maintainability**: Easier to understand and modify services
- **Testability**: Instance methods easier to test with mocks
- **Extensibility**: Easier to add new steps to instance-based services
- **Code Quality**: Follows established project conventions

### Testing Strategy

```ruby
# spec/services/donor_service_spec.rb (updated)
RSpec.describe DonorService do
  describe "#find_or_update" do
    subject(:service) do
      described_class.new(
        donor_attributes: attributes,
        transaction_date: timestamp
      )
    end

    let(:timestamp) { Time.current }

    context "with new donor" do
      let(:attributes) { { name: "John Doe", email: "john@example.com" } }

      it "creates new donor" do
        expect { service.find_or_update }.to change(Donor, :count).by(1)
      end

      it "returns created status" do
        result = service.find_or_update
        expect(result[:created]).to be true
        expect(result[:donor]).to be_a(Donor)
      end

      it "sets last_updated_at to transaction date" do
        result = service.find_or_update
        expect(result[:donor].last_updated_at).to eq(timestamp)
      end
    end

    context "with existing donor" do
      let!(:existing_donor) do
        create(:donor, name: "John", email: "john@example.com", last_updated_at: 1.day.ago)
      end
      let(:attributes) { { name: "John Doe", email: "john@example.com" } }

      it "does not create new donor" do
        expect { service.find_or_update }.not_to change(Donor, :count)
      end

      it "returns not created status" do
        result = service.find_or_update
        expect(result[:created]).to be false
      end

      it "updates donor with newer data" do
        service.find_or_update
        expect(existing_donor.reload.name).to eq("John Doe")
      end
    end

    context "when email is blank" do
      let(:attributes) { { name: "Jane Smith", email: "" } }

      it "generates email from name" do
        result = service.find_or_update
        expect(result[:donor].email).to eq("JaneSmith@mailinator.com")
      end
    end
  end
end
```

### Files to Modify
- `app/services/donor_service.rb` (REFACTOR to instance pattern - 130 lines)
- `app/controllers/api/donors_controller.rb` (UPDATE caller - line 46)
- `app/services/donor_import_service.rb` (UPDATE caller - line 91)
- `app/services/stripe_payment_import_service.rb` (UPDATE caller - line 101)
- `spec/services/donor_service_spec.rb` (UPDATE 17 tests)
- `spec/requests/api/donors_spec.rb` (VERIFY integration tests pass)
- `CLAUDE.md` (UPDATE service object guidelines with real DonorService example)

### Migration Strategy

1. **Phase 1**: Write new instance-based implementation alongside old class method
2. **Phase 2**: Update all specs to test new implementation
3. **Phase 3**: Update all callers to use new implementation
4. **Phase 4**: Remove old class method implementation
5. **Phase 5**: Update documentation

**Alternative: Use alias for backwards compatibility (temporary)**
```ruby
class DonorService
  # New instance pattern
  def initialize(donor_attributes:, transaction_date:)
    # ...
  end

  def find_or_update
    # ...
  end

  # Temporary backwards compatibility (remove after migration)
  def self.find_or_update_by_email(donor_attributes, transaction_date)
    new(donor_attributes: donor_attributes, transaction_date: transaction_date)
      .find_or_update
  end
end
```

### Complexity Metrics Comparison

**Before (class methods - Current State 2025-12-01):**
- Total lines: 130
- Public class methods: 2 (`find_or_update_by_email`, `find_or_update_by_email_or_stripe_customer`)
- Private class methods: 5 (`normalize_email`, `find_existing_donor`, `update_existing_donor`, `build_update_attributes`, `create_new_donor`)
- Flog score: ~20-25 (medium-high complexity)
- Multiple responsibilities: Stripe lookup, email lookup, merge chain following, phone/address preservation
- Hard to test individual steps in isolation

**After (instance methods):**
- Total lines: ~140 (slight increase due to better organization)
- Public instance methods: 1 unified `find_or_update`
- Private instance methods: ~10-12 (better separation of concerns)
- Flog score per method: <10 (low complexity)
- Single responsibility per method
- Clear separation of Stripe lookup vs email lookup flows
- Easy to test each step independently
- Consistent with other services (DonorMergeService, DonorImportService, StripePaymentImportService)

### Standardized .call Interface (Deferred - 2025-12-01)

**Pattern Recommendation (DEFERRED TO FUTURE TICKET):** While a standardized `.call` interface would provide consistency, we're keeping the current method names for this ticket:
- DonorService: `find_or_update`
- DonorMergeService: `merge` (existing)
- DonorImportService: `import` (existing)

**Rationale for Deferring:**
- Current method names are descriptive and clear
- Changing to `.call` would require updating all callers across 3 services
- Can be done as separate refactoring ticket if desired
- Focus this ticket on instance pattern consistency only

**Current Pattern After This Ticket:**
```ruby
# DonorService
service = DonorService.new(donor_attributes: attrs, transaction_date: time)
result = service.find_or_update

# DonorMergeService (existing)
service = DonorMergeService.new(donor_ids: ids, field_selections: selections)
result = service.merge

# DonorImportService (existing)
service = DonorImportService.new(csv_content)
result = service.import
```

**Future Consideration:** If we want `.call` interface, create separate ticket to:
1. Add `.call` class method delegators to all services
2. Update all callers
3. Optional: Rename instance methods to `call` (breaking change)

### Related Tickets
- Follows conventions established in TICKET-014 (DonorMergeService instance pattern)
- Part of code quality improvement initiative (CODE_SMELL_ANALYSIS.md)
- TICKET-075: Stripe customer ID tracking (added `find_or_update_by_email_or_stripe_customer`)
- TICKET-100: Phone/address fields (added field preservation logic)
- TICKET-088: Donor Export CSV (will benefit from consistent service patterns)

### Notes (Updated 2025-12-01)
- This is a refactoring ticket - no functionality changes
- All existing 17 tests must pass after refactoring
- DonorService has grown since ticket was originally written (now 130 lines with 2 public methods)
- Keep backwards compatibility during migration (temporary class method wrappers)
- Remove wrappers after all 3 callers are updated
- Document the pattern in CLAUDE.md with real DonorService example
- `.call` interface deferred to future ticket (focus on instance pattern only)
- Estimated time increased from S (Small) to M (Medium) due to increased complexity
