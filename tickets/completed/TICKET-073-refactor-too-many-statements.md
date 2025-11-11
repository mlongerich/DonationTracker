## [TICKET-073] Refactor Methods with TooManyStatements

**Status:** ✅ Complete
**Priority:** 🟢 Low
**Effort:** M (Medium - 3-4 hours)
**Created:** 2025-11-04
**Completed:** 2025-11-11
**Dependencies:** None

### User Story
As a developer, I want methods to be small and focused so that they are easier to understand, test, and maintain.

### Problem Statement

**Current State (2025-11-04):**
Reek identified **14 TooManyStatements warnings** across the codebase:

**Controllers (5 warnings):**
- `Api::ChildrenController#index` - 7 statements
- `Api::DonationsController#validate_date_range!` - 7 statements
- `Api::DonorsController#index` - 6 statements
- `Api::SearchController#project_or_child` - 6 statements
- `Api::SponsorshipsController#index` - 7 statements

**Services (9 warnings - worst offenders):**
- `StripePaymentImportService#find_or_create_project` - **34 statements** ⚠️ CRITICAL
- `StripePaymentImportService#import` - **24 statements** ⚠️ HIGH
- `DonorImportService#import` - **20 statements** ⚠️ HIGH
- `StripeCsvBatchImporter#import` - **11 statements**
- `DonorService#find_or_update_by_email` - **11 statements**
- `DonorImportService#detect_headers` - **9 statements**
- `DonorMergeService#build_merged_attributes` - **6 statements**
- `DonorMergeService#perform_merge_transaction` - **6 statements**
- `StripePaymentImportService#extract_child_names` - **6 statements**

**Code Smell:** `TooManyStatements` (Reek warning - threshold: 5 statements)
**Issue:** Long methods are harder to understand, test, and maintain
**Impact:** 14 out of 130 total Reek warnings (11% of all warnings)

### Scope for This Ticket

Focus on **high-impact refactoring** (worst offenders first):

**Phase 1: Critical (34+ statements):**
1. `StripePaymentImportService#find_or_create_project` (34 statements)

**Phase 2: High (20+ statements):**
2. `StripePaymentImportService#import` (24 statements)
3. `DonorImportService#import` (20 statements)

**Phase 3: Medium (11+ statements):**
4. `StripeCsvBatchImporter#import` (11 statements)
5. `DonorService#find_or_update_by_email` (11 statements)

**Out of Scope (for now):**
- Controllers (6-7 statements - not critical, close to threshold)
- Services with 6-9 statements (minor, can be addressed later)

### Acceptance Criteria

#### Phase 1: StripePaymentImportService#find_or_create_project
- [ ] Extract sponsorship detection logic to private method
- [ ] Extract general/campaign/invoice pattern matching to private methods
- [ ] Reduce method to <15 statements (50% reduction)
- [ ] All tests pass (no regressions)

#### Phase 2: StripePaymentImportService#import
- [ ] Extract donation creation logic to private method
- [ ] Extract sponsorship creation logic to private method
- [ ] Reduce method to <15 statements (40% reduction)
- [ ] All tests pass (no regressions)

#### Phase 3: DonorImportService#import
- [ ] Extract CSV row processing to private method
- [ ] Extract error handling to private method
- [ ] Reduce method to <15 statements (25% reduction)
- [ ] All tests pass (no regressions)

#### Phase 4: Medium Priority Methods
- [ ] Refactor StripeCsvBatchImporter#import
- [ ] Refactor DonorService#find_or_update_by_email
- [ ] All tests pass (no regressions)

#### Verification
- [ ] Run `reek app/services/` - verify 9 fewer TooManyStatements warnings (9 → 0)
- [ ] Run `bundle exec rspec` - all tests pass
- [ ] Code coverage maintained at 90%+

### Technical Approach

#### Refactoring Pattern: Extract Method

**Before (34 statements - StripePaymentImportService#find_or_create_project):**
```ruby
def find_or_create_project
  # 34 lines of nested if/elsif/else logic
  # Pattern matching for sponsorships, campaigns, invoices, general
  # Extremely difficult to follow
end
```

**After (Extract Private Methods):**
```ruby
def find_or_create_project
  return find_sponsorship_project if sponsorship_donation?
  return find_campaign_project if campaign_donation?
  return find_invoice_project if invoice_donation?
  find_general_project
end

private

def sponsorship_donation?
  # Extract sponsorship detection logic
end

def find_sponsorship_project
  # Extract sponsorship project logic (10 patterns)
end

def find_campaign_project
  # Extract campaign project logic
end

def find_invoice_project
  # Extract invoice project logic
end

def find_general_project
  # Extract general project logic
end
```

**Benefits:**
- Main method becomes a high-level router (5 lines)
- Each extracted method has single responsibility
- Easier to test in isolation
- Easier to understand intent

#### Testing Strategy

**For Each Refactored Method:**
1. Run full test suite BEFORE refactoring (establish baseline)
2. Extract one private method at a time
3. Run tests after each extraction (ensure no regressions)
4. Verify code coverage maintained
5. Verify Reek warning eliminated

**No New Tests Required:**
- Existing tests already cover all logic
- Refactoring is behavior-preserving
- Only internal structure changes

### Benefits

- **Readability**: Smaller methods easier to understand at a glance
- **Testability**: Extracted methods can be tested in isolation
- **Maintainability**: Single Responsibility Principle followed
- **Code Quality**: Eliminates 9-14 TooManyStatements warnings (130 → 116-121 total)
- **Future-Proof**: Easier to extend with new patterns/logic

### Files to Modify

**Services (5 files - focus on worst offenders):**
- `app/services/stripe_payment_import_service.rb` (2 methods - 34 + 24 statements)
- `app/services/donor_import_service.rb` (2 methods - 20 + 9 statements)
- `app/services/stripe_csv_batch_importer.rb` (1 method - 11 statements)
- `app/services/donor_service.rb` (1 method - 11 statements)
- `app/services/donor_merge_service.rb` (2 methods - 6 + 6 statements - OPTIONAL)

### Checklist

- [ ] **Phase 1: Critical Refactoring** (34 statements → <15)
  - [ ] Refactor `StripePaymentImportService#find_or_create_project`
  - [ ] Extract 4-5 private methods
  - [ ] Run `rspec spec/services/stripe_payment_import_service_spec.rb`
  - [ ] Verify 1 fewer TooManyStatements warning

- [ ] **Phase 2: High Priority Refactoring** (24 + 20 statements → <15 each)
  - [ ] Refactor `StripePaymentImportService#import`
  - [ ] Refactor `DonorImportService#import`
  - [ ] Run respective test suites
  - [ ] Verify 2 fewer TooManyStatements warnings

- [ ] **Phase 3: Medium Priority Refactoring** (11 + 11 statements → <10 each)
  - [ ] Refactor `StripeCsvBatchImporter#import`
  - [ ] Refactor `DonorService#find_or_update_by_email`
  - [ ] Run respective test suites
  - [ ] Verify 2 fewer TooManyStatements warnings

- [ ] **Phase 4: Optional Low Priority** (6-9 statements → <5 each)
  - [ ] Refactor `DonorImportService#detect_headers`
  - [ ] Refactor `DonorMergeService` methods
  - [ ] Refactor `StripePaymentImportService#extract_child_names`
  - [ ] Verify 4 fewer TooManyStatements warnings

- [ ] **Final Verification**
  - [ ] Run full test suite: `bundle exec rspec`
  - [ ] Verify code coverage: `bundle exec rspec --format documentation`
  - [ ] Run Reek: `bundle exec reek app/services/` (0 TooManyStatements warnings)
  - [ ] Total Reek warnings reduced: 130 → 116-121

### Related Tickets

- **TICKET-069**: Code Quality Cleanup Batch (quick wins)
- **TICKET-042**: Class Documentation (IrresponsibleModule warnings)
- **TICKET-037**: Standardize Service Object Patterns (related to service refactoring)

### Notes

- This is a **pure refactoring ticket** (no functional changes)
- Extract Method pattern maintains existing behavior
- Focus on worst offenders first (34 statements is 680% over threshold!)
- Controllers can be addressed in future ticket if needed
- Consider TICKET-037 patterns when refactoring service objects

### Success Metrics

**Before (2025-11-04):**
- 14 TooManyStatements warnings
- Largest method: 34 statements (680% over threshold)

**After (Target):**
- 0-5 TooManyStatements warnings (9-14 fixed)
- Largest method: <15 statements
- 130 → 116-121 total Reek warnings (7-11% improvement)

**Stretch Goal:**
- All service methods under 10 statements
- All controller methods under 8 statements
- 0 TooManyStatements warnings

---

**Estimated Time:** 3-4 hours
- Phase 1 (Critical): 1 hour
- Phase 2 (High): 1 hour
- Phase 3 (Medium): 1 hour
- Phase 4 (Optional): 1 hour
- Testing & verification: Throughout
