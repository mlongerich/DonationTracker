## [TICKET-037] Standardize Service Object Patterns

**Status:** 📋 Planned
**Priority:** 🟢 Low
**Effort:** S (Small)
**Created:** 2025-10-18
**Dependencies:** None

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

### Current Analysis

**DonorService** (class method):
```ruby
def self.find_or_update_by_email(donor_attributes, timestamp)
  # 25 lines of logic
  # Uses multiple local variables
  # Has private helper method
end
```

**Issue**: This is actually a complex operation that should use instance pattern for consistency with other services.

### Acceptance Criteria
- [ ] Refactor `DonorService` to use instance pattern
- [ ] Update all callers of `DonorService` to use new pattern
- [ ] Add comprehensive specs for refactored service
- [ ] All existing tests pass
- [ ] Update CLAUDE.md with clarified service object guidelines
- [ ] Document when to use class vs instance methods

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
- `app/services/donor_service.rb` (REFACTOR to instance pattern)
- `app/controllers/api/donors_controller.rb` (UPDATE caller)
- `app/services/donor_import_service.rb` (UPDATE caller)
- `spec/services/donor_service_spec.rb` (UPDATE tests)
- `spec/requests/api/donors_spec.rb` (VERIFY integration tests pass)
- `CLAUDE.md` (UPDATE service object guidelines)

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

**Before (class method):**
- Flog score: ~15-20 (medium complexity)
- Single long method with multiple responsibilities
- Hard to test individual steps

**After (instance methods):**
- Flog score per method: <10 (low complexity)
- Clear separation of responsibilities
- Easy to test each step independently

### Standardized .call Interface (Added 2025-10-31)

**Pattern Recommendation:** All services should implement `.call` interface for consistency

```ruby
# Pattern: Class method delegates to instance method
class DonorService
  def self.call(donor_attributes:, transaction_date:)
    new(donor_attributes: donor_attributes, transaction_date: transaction_date).call
  end

  def initialize(donor_attributes:, transaction_date:)
    @donor_attributes = donor_attributes
    @transaction_date = transaction_date
  end

  def call
    # Implementation (renamed from find_or_update)
  end
end

class DonorMergeService
  def self.call(donor_ids:, field_selections:)
    new(donor_ids: donor_ids, field_selections: field_selections).call
  end

  def initialize(donor_ids:, field_selections:)
    @donor_ids = donor_ids
    @field_selections = field_selections
  end

  def call
    # Implementation (renamed from merge)
  end
end

# Controllers always use: ServiceName.call(args)
result = DonorService.call(donor_attributes: params, transaction_date: Time.current)
result = DonorMergeService.call(donor_ids: ids, field_selections: selections)
```

**Benefits:**
- Consistent interface across all services
- Easy refactoring (internals can change without breaking callers)
- Testable (can inject dependencies via initialize)
- Follows Railway Oriented Programming pattern

### Related Tickets
- Follows conventions established in TICKET-014
- Part of code quality improvement initiative (CODE_SMELL_ANALYSIS.md)

### Notes
- This is a refactoring ticket - no functionality changes
- All existing tests should pass with updated expectations
- Keep backwards compatibility during migration if needed
- Consider adding `frozen_string_literal: true` to all services
- Document the pattern in CLAUDE.md for future reference
- `.call` interface makes services interchangeable and composable
