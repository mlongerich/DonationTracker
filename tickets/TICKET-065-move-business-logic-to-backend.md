## [TICKET-065] Move Business Logic from Frontend to Backend

**Status:** 🔵 Ready to Start
**Priority:** 🟡 Medium (Code Quality / Architecture)
**Effort:** M (Medium - 4-6 hours)
**Created:** 2025-10-31
**Dependencies:** None
**Related:** TICKET-064 (sponsorship logic is handled there)

### Problem Statement

Frontend audit revealed business logic, validation, and domain rules implemented in React components and utilities. This violates separation of concerns and creates:
- **Security gaps** - Validation can be bypassed by malicious clients
- **Duplication risk** - Logic must be reimplemented for other clients (mobile, CLI)
- **Data integrity issues** - No guarantee backend enforces frontend rules
- **Maintainability problems** - Business rule changes require frontend updates

### Findings from Audit

**HIGH Priority (TICKET-064 already addressing):**
- ✅ Multi-step sponsorship detection/auto-creation → Moving to backend in TICKET-064

**MEDIUM Priority:**
1. Date range validation (DonationList.tsx) - Backend should validate
2. findProjectForChild inference logic - Unused? Remove or fix data model
3. Sponsorship monthly_amount validation inconsistency (0 vs >0)

**LOW Priority:**
4. Email display filtering (@mailinator.com) - Should be presenter logic
5. Child name validation duplication

---

## Acceptance Criteria

### 1. Date Range Validation (Backend)
- [ ] Add validation to DonationsController#index
- [ ] Reject requests where start_date > end_date
- [ ] Return 422 with clear error message
- [ ] Frontend handles backend error gracefully

### 2. Audit findProjectForChild Usage
- [ ] Search codebase for usage of findProjectForChild
- [ ] If unused: Remove from client.ts
- [ ] If used: Refactor to backend-provided field or fix data model

### 3. Resolve monthly_amount Validation
- [ ] Decide: Should monthly_amount allow 0? (Yes for initial creation)
- [ ] Add Rails validation to Sponsorship model
- [ ] Update SponsorshipForm frontend validation to match
- [ ] Document decision in model comments

### 4. Email Display Logic (Presenter)
- [ ] Add PLACEHOLDER_DOMAINS constant to Donor model
- [ ] Add displayable_email method to DonorPresenter
- [ ] Return displayable_email in API responses
- [ ] Update frontend to use displayable_email field
- [ ] Remove shouldDisplayEmail from emailUtils.ts

### 5. Verify Backend Validations
- [ ] Audit all frontend validations
- [ ] Ensure matching backend model validations exist
- [ ] Add missing backend validations
- [ ] Document which validations are UX-only vs enforced

---

## Technical Approach

### Date Range Validation

**Backend:**
```ruby
# app/controllers/api/donations_controller.rb
def index
  validate_date_range! if date_range_params_present?
  # ... existing implementation
end

private

def validate_date_range!
  start_date = Date.parse(params.dig(:q, :date_gteq).to_s)
  end_date = Date.parse(params.dig(:q, :date_lteq).to_s)

  if start_date > end_date
    render json: {
      error: 'End date must be after or equal to start date'
    }, status: :unprocessable_entity
  end
rescue ArgumentError
  # Invalid date format - let Ransack handle
end
```

**Frontend:**
```typescript
// Keep UX validation for immediate feedback
// Add error handling for backend rejection
try {
  const data = await fetchDonations(params);
} catch (error) {
  if (error.response?.status === 422) {
    setDateError(error.response.data.error);
  }
}
```

---

### Email Display Logic

**Backend:**
```ruby
# app/presenters/donor_presenter.rb
class DonorPresenter < BasePresenter
  PLACEHOLDER_DOMAINS = %w[@mailinator.com].freeze

  def as_json(options = {})
    {
      id: object.id,
      name: object.name,
      email: object.email,
      displayable_email: displayable_email,
      # ...
    }
  end

  private

  def displayable_email
    placeholder_email? ? nil : object.email
  end

  def placeholder_email?
    PLACEHOLDER_DOMAINS.any? { |domain| object.email.downcase.end_with?(domain) }
  end
end
```

**Frontend:**
```typescript
// Remove utils/emailUtils.ts
// Use presenter field directly
const displayEmail = donor.displayable_email || '(No email provided)';
```

---

### Sponsorship monthly_amount Validation

**Decision:** Allow 0 for auto-created sponsorships, validate > 0 for user-created

**Backend:**
```ruby
# app/models/sponsorship.rb
class Sponsorship < ApplicationRecord
  validates :monthly_amount,
    numericality: { greater_than_or_equal_to: 0 },
    allow_nil: false

  # Document: 0 is valid for system-auto-created sponsorships
  # User-facing forms should validate > 0 on frontend for UX
end
```

---

## Testing Strategy

### Backend Tests
- RSpec request spec for date range validation (422 error)
- RSpec model spec for Sponsorship monthly_amount validation
- RSpec presenter spec for DonorPresenter displayable_email logic

### Frontend Tests
- Update DonationList tests to handle backend error
- Remove emailUtils tests (logic moved to backend)
- Update DonorAutocomplete tests to use displayable_email field

---

## Migration Notes

- No database migrations required
- API changes are additive (new fields, new validation)
- Frontend changes can be deployed independently (graceful degradation)

---

## Success Criteria

- ✅ All business validation enforced by backend
- ✅ Frontend uses backend-provided computed fields (displayable_email)
- ✅ No unused frontend utility functions (findProjectForChild removed if unused)
- ✅ Validation rules documented and consistent
- ✅ All tests passing

---

## Estimated Time Breakdown

- Date range validation: 1 hour (backend + frontend)
- Email display logic: 1 hour (presenter + frontend)
- monthly_amount resolution: 1 hour (model validation + tests)
- findProjectForChild audit: 30 mins
- Testing/verification: 1 hour

**Total: 4.5 hours**
