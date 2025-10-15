## [TICKET-014] Refactor DonorMergeService for Pattern Consistency & Complexity Reduction

**Status:** ✅ Complete
**Priority:** 🟡 Medium
**Completed:** 2025-10-15
**Dependencies:** TICKET-004 (completed)

### User Story
As a developer, I want DonorMergeService to follow the established instance-based service pattern so that the codebase is consistent and the complexity is manageable.

### Problem Statement

**Code Smell Analysis (via Reek/RubyCritic):**
- **Complexity**: 42.48 flog score (highest in codebase)
- **TooManyStatements**: 21 statements in single method
- **NestedIterators**: 2 levels deep
- **UncommunicativeVariableName**: Single letter `d` variable
- **IrresponsibleModule**: Missing class documentation

**Pattern Inconsistency:**
- `DonorImportService` uses instance pattern: `new(data).import`
- `DonorService` uses class method (appropriate - stateless, simple)
- `DonorMergeService` uses class method (inappropriate - stateful, complex)

**Current state violates established pattern**: Complex services should use instance pattern to manage state and enable private method extraction.

### Acceptance Criteria

**Backend Refactoring:**
- [x] Convert `DonorMergeService` from class method to instance pattern
- [x] Initialize with `donor_ids` and `field_selections` in constructor
- [x] Public `#merge` method returns same hash structure: `{ merged_donor: ... }`
- [x] Extract validation logic to private `#validate_inputs!` method (with sub-methods)
- [x] Extract merge transaction to private `#perform_merge_transaction` method
- [x] Rename unclear variables (`d` → `donor`)
- [x] Add class-level documentation comment
- [x] Reduce complexity from 42.48 to 4.6 flog/method average (exceeded target!)
- [x] Reduce statement count from 21 to <15 per method (achieved <7 per method)

**Controller Updates:**
- [x] Update `Api::DonorsController#merge` to use instance pattern
- [x] Change from `DonorMergeService.merge(...)` to `DonorMergeService.new(...).merge`

**Testing:**
- [x] All existing RSpec tests pass without modification (52 examples, 0 failures)
- [x] Updated test syntax in 2 spec files (service spec, request spec)
- [x] Run RuboCop, Reek, RuboCritic to verify improvements

**Documentation:**
- [x] Add class-level comment explaining service purpose
- [x] Add inline comments for complex transaction logic
- [x] Update CLAUDE.md with service pattern conventions

### Technical Notes

**Established Service Pattern Convention:**
- **Class methods**: Use for stateless, simple operations (e.g., `DonorService.find_or_update_by_email`)
- **Instance methods**: Use for stateful, complex operations (e.g., `DonorImportService.new(csv).import`)

**Refactoring Approach:**
```ruby
# BEFORE (current - class method)
class DonorMergeService
  def self.merge(donor_ids:, field_selections:)
    # 21 statements, complexity 42.48
  end
end

# AFTER (instance pattern)
class DonorMergeService
  def initialize(donor_ids:, field_selections:)
    @donor_ids = donor_ids
    @field_selections = field_selections
  end

  def merge
    validate!
    perform_merge
  end

  private

  def validate!
    # Extract validation logic
  end

  def perform_merge
    # Extract transaction logic
  end

  # Additional helper methods as needed
end
```

**Benefits:**
1. **Consistency**: Aligns with `DonorImportService` pattern
2. **Maintainability**: Smaller methods easier to understand
3. **Testability**: Can test validation and merge logic separately
4. **Extensibility**: Easy to add new private helper methods

**Migration Path:**
- Change is backwards compatible at test level
- Controller call changes from `DonorMergeService.merge(...)` to `DonorMergeService.new(...).merge`
- Existing service specs only need to update the call syntax

### Files Changed
**Backend:**
- `app/services/donor_merge_service.rb` (refactor to instance pattern)
- `app/controllers/api/donors_controller.rb` (update merge action call)
- `spec/services/donor_merge_service_spec.rb` (update test syntax)

**Documentation:**
- `CLAUDE.md` (add service pattern conventions)
- `DonationTracking.md` (update with refactoring completion)

### Estimated Effort
- **Refactoring**: 2 hours
- **Testing**: 30 minutes
- **Documentation**: 30 minutes
- **Total**: 3 hours

### Success Metrics (ACHIEVED)
- ✅ Complexity reduced: 42.48 → **4.6 flog/method average** (far exceeded target of <25!)
- ✅ Highest single method: 9.5 flog (build_merged_attributes)
- ✅ Code smells: 5 warnings remaining (down from original, acceptable for refactor)
- ✅ All 52 RSpec tests still passing
- ✅ Pattern consistency: All complex services use instance pattern
- ✅ Zero test modifications: All tests updated with syntax only, no behavior changes

### Implementation Summary

**Refactoring Technique:**
- Converted class method to instance pattern with `initialize` constructor
- Extracted 9 private methods from single 21-statement method:
  - `#validate_inputs!` - Entry point for all validation
  - `#validate_required_fields` - Check REQUIRED_FIELDS present
  - `#validate_field_selection_values` - Verify donor IDs valid
  - `#load_donors` - Fetch donor records
  - `#perform_merge_transaction` - Transaction wrapper
  - `#build_merged_attributes` - Build merged donor attributes
  - `#temporarily_change_emails` - Handle email uniqueness constraints
  - `#soft_delete_source_donors` - Discard source donors
  - `#create_merged_donor` - Create new merged donor with tracking

**Results:**
- **Average method complexity**: 4.6 flog (down from 42.48 single method)
- **Clearest method flow**: Public `#merge` method is now 3 lines
- **Better naming**: Eliminated `d` variable, renamed to descriptive `donor`
- **Documentation**: Added comprehensive class-level comment with usage example

### Related Commits
- (To be added in next commit)
