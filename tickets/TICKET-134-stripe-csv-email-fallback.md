## [TICKET-134] Stripe CSV Import: Email Fallback Handling

**Status:** ✅ Complete
**Priority:** 🔴 High
**Type:** Bug Fix / Enhancement

### Problem Statement

Stripe CSV import fails validation for 121 rows where `Cust Email` is empty but `Billing Details Email` contains a valid email address. The import service currently only checks `Cust Email` and passes empty string to DonorService, causing "Email is invalid" validation errors.

**Example failure:**
```
Row 1412: Validation failed: Email is invalid
  Data: {
    amount: "13.1",
    name: "Clarisa L Rhodes",
    email: nil,  # Cust Email is empty
    description: "clarisalrhodes@gmail.com",  # Email appears here
    nickname: nil,
    date: "2020-12-02 08:19:40 +0000",
    status: "succeeded"
  }
```

### Root Cause

`StripePaymentImportService.find_or_create_donor` (line 100-118) only uses:
- `email: @csv_row["Cust Email"]`

When `Cust Email` is empty, it passes empty string to DonorService instead of checking `Billing Details Email` fallback.

### Data Analysis

**Email availability in CSV:**
- **121 rows**: Empty `Cust Email` BUT have `Billing Details Email` ✅
- **138 rows**: BOTH emails empty (anonymous email generation handles these)
- **28 rows**: Email appears in wrong column (`Description` field)

All 121 rows can be fixed by using `Billing Details Email` as fallback.

### User Story

As a system administrator importing historical Stripe data,
I want the CSV import to use `Billing Details Email` when `Cust Email` is empty,
So that all 121 affected donations are imported successfully without manual data cleanup.

### Acceptance Criteria

- [x] Use `Billing Details Email` as fallback when `Cust Email` is empty
- [x] Anonymous email generation still works when both emails are empty
- [x] Test coverage for all three email scenarios:
  - `Cust Email` present (current behavior)
  - `Cust Email` empty, `Billing Details Email` present (new fallback)
  - Both emails empty (anonymous email generation)
- [x] All 121 affected rows import successfully
- [x] Zero "Email is invalid" errors after fix

### Implementation Approach

**Strict TDD workflow:**

1. **Red**: Write failing test for billing email fallback
2. **Green**: Add `donor_email` helper method to use billing email fallback
3. **Refactor**: Ensure code is clean and follows patterns

**Code change location:**
- `app/services/stripe_payment_import_service.rb:100-118` (`find_or_create_donor` method)

**Pattern:**
```ruby
def find_or_create_donor
  service = DonorService.new(
    donor_attributes: {
      name: @csv_row["Billing Details Name"],
      email: donor_email,  # Use helper instead of direct column
      # ... other fields
    },
    # ...
  )
end

def donor_email
  # Use Billing Details Email as fallback when Cust Email is empty
  @csv_row["Cust Email"].presence || @csv_row["Billing Details Email"]
end
```

### Testing Strategy

**Test file:** `spec/services/stripe_payment_import_service_spec.rb`

**New test cases:**
1. Uses `Billing Details Email` when `Cust Email` is empty
2. Prefers `Cust Email` when both emails present
3. Generates anonymous email when both emails empty

### Definition of Done

- [ ] All tests pass (including new email fallback tests)
- [ ] RuboCop passes
- [ ] Documentation updated (CLAUDE.md, DonationTracking.md)
- [ ] CSV re-import shows 0 email validation errors
- [ ] Commit references TICKET-134

### Related Tickets

- TICKET-071: Original Stripe CSV batch import implementation
- TICKET-110: Status-based counting and metadata support
- TICKET-100: Donor contact information patterns (anonymous email)

---

**Created:** 2025-12-05
**Estimated effort:** 1-2 hours
**Impact:** High - Fixes 121 rows of import failures
