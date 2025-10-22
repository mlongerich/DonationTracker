## [TICKET-060] Extract SponsorshipPresenter to Remove Code Duplication

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Effort:** S (Small - 1-2 hours)
**Created:** 2025-10-22
**Dependencies:** TICKET-010 (Sponsorship model exists) ✅, TICKET-029 (Presenter pattern established) ✅

### User Story

As a developer, I want sponsorship JSON serialization logic centralized in a presenter so that the controller remains clean and maintainable.

### Problem Statement

**Reek Code Smell Analysis** identified multiple issues in `Api::SponsorshipsController#index`:
- **DuplicateMethodCall:** 9 instances of duplicate method calls
- **FeatureEnvy:** Controller knows too much about Sponsorship internals
- **TooManyStatements:** 11 statements in single method
- **UncommunicativeVariableName:** `s` instead of descriptive name

**Current Implementation** (lines 10-39):
```ruby
sponsorships_data = sponsorships.map do |s|
  {
    id: s.id,
    donor_id: s.donor_id,
    donor_name: s.donor.name,
    child_id: s.child_id,
    monthly_amount: s.monthly_amount.to_s,
    active: s.active?,
    end_date: s.end_date
  }
end
```

**Issues:**
- ❌ Duplicate JSON mapping logic for `params[:child_id]` branch (lines 10-20) and default branch (lines 28-39)
- ❌ Controller handles presentation logic (should be view/presenter concern)
- ❌ Hard to add new fields (must update 2 places)
- ❌ Violates Single Responsibility Principle

### Acceptance Criteria

#### Backend: Create SponsorshipPresenter

- [ ] Create `app/presenters/sponsorship_presenter.rb`
  - [ ] Inherit from `BasePresenter`
  - [ ] Implement `as_json` method
  - [ ] Include all fields: id, donor_id, donor_name, child_id, child_name, monthly_amount, active, end_date
  - [ ] Handle optional `child_name` (only for full list, not child-specific queries)

- [ ] Create `spec/presenters/sponsorship_presenter_spec.rb`
  - [ ] Test JSON structure
  - [ ] Test with active sponsorship
  - [ ] Test with ended sponsorship
  - [ ] Test eager loaded associations
  - [ ] **4+ tests**

#### Backend: Refactor SponsorshipsController

- [ ] Update `Api::SponsorshipsController#index`
  - [ ] Replace inline JSON mapping with `CollectionPresenter`
  - [ ] Single serialization path (no duplication)
  - [ ] Maintain same API response format
  - [ ] Eager load associations once

- [ ] Update `Api::SponsorshipsController#create`
  - [ ] Use `SponsorshipPresenter.new(sponsorship).as_json` for success response
  - [ ] Keep error response unchanged

- [ ] Update `Api::SponsorshipsController#destroy` (end action)
  - [ ] Use `SponsorshipPresenter.new(sponsorship).as_json` for response

- [ ] Verify existing request specs still pass (no API changes)

### Technical Approach

#### 1. Create SponsorshipPresenter

```ruby
# app/presenters/sponsorship_presenter.rb
class SponsorshipPresenter < BasePresenter
  def as_json(options = {})
    {
      id: object.id,
      donor_id: object.donor_id,
      donor_name: object.donor&.name,
      child_id: object.child_id,
      child_name: object.child&.name,
      monthly_amount: object.monthly_amount.to_s,
      active: object.active?,
      end_date: object.end_date,
      created_at: object.created_at
    }
  end
end
```

#### 2. Refactor Controller

**Before (70 lines with duplication):**
```ruby
def index
  if params[:child_id].present?
    child = Child.find(params[:child_id])
    sponsorships = child.sponsorships.includes(:donor)

    sponsorships_data = sponsorships.map do |s|
      { id: s.id, donor_id: s.donor_id, ... }  # 7 fields
    end
    render json: { sponsorships: sponsorships_data }
  else
    sponsorships = Sponsorship.includes(:donor, :child).all
    sponsorships_data = sponsorships.map do |s|
      { id: s.id, donor_id: s.donor_id, ... }  # 8 fields (duplicate!)
    end
    render json: { sponsorships: sponsorships_data, meta: ... }
  end
end
```

**After (clean, DRY):**
```ruby
def index
  if params[:child_id].present?
    child = Child.find(params[:child_id])
    sponsorships = child.sponsorships.includes(:donor, :child)

    render json: {
      sponsorships: CollectionPresenter.new(sponsorships, SponsorshipPresenter).as_json
    }
  else
    scope = Sponsorship.includes(:donor, :child).all
    filtered_scope = apply_ransack_filters(scope)
    sponsorships = paginate_collection(filtered_scope.order(created_at: :desc))

    render json: {
      sponsorships: CollectionPresenter.new(sponsorships, SponsorshipPresenter).as_json,
      meta: pagination_meta(sponsorships)
    }
  end
end

def create
  sponsorship = Sponsorship.new(sponsorship_params)

  if sponsorship.save
    render json: { sponsorship: SponsorshipPresenter.new(sponsorship).as_json }, status: :created
  else
    render json: { errors: sponsorship.errors }, status: :unprocessable_entity
  end
end

def destroy
  sponsorship = Sponsorship.find(params[:id])
  sponsorship.update!(end_date: Date.current)

  render json: { sponsorship: SponsorshipPresenter.new(sponsorship).as_json }
end
```

### Files to Create/Modify

**Backend:**
- `app/presenters/sponsorship_presenter.rb` - New presenter class
- `spec/presenters/sponsorship_presenter_spec.rb` - New tests (4 tests)
- `app/controllers/api/sponsorships_controller.rb` - Refactor all actions
- Existing `spec/requests/api/sponsorships_spec.rb` - Should pass unchanged (API contract maintained)

**Total:** 2 new files, 1 modified file, 4 new tests

### Benefits

- ✅ **Eliminates 9 code smell instances** (Reek validated)
- ✅ **DRY:** Single source of truth for JSON serialization
- ✅ **Maintainability:** Adding fields requires one change, not two
- ✅ **Consistency:** Follows established presenter pattern (TICKET-029)
- ✅ **Testability:** Presentation logic isolated and unit testable
- ✅ **Readability:** Controller actions become 3-5 lines each

### Testing Strategy

**Presenter Tests:**
```ruby
RSpec.describe SponsorshipPresenter do
  let(:donor) { create(:donor, name: 'John Doe') }
  let(:child) { create(:child, name: 'Maria') }
  let(:sponsorship) { create(:sponsorship, donor: donor, child: child, monthly_amount: 50) }

  describe '#as_json' do
    subject { described_class.new(sponsorship).as_json }

    it 'includes all required fields' do
      expect(subject.keys).to match_array([
        :id, :donor_id, :donor_name, :child_id, :child_name,
        :monthly_amount, :active, :end_date, :created_at
      ])
    end

    it 'formats monthly_amount as string' do
      expect(subject[:monthly_amount]).to eq('50.0')
    end

    it 'includes donor and child names when eager loaded' do
      expect(subject[:donor_name]).to eq('John Doe')
      expect(subject[:child_name]).to eq('Maria')
    end

    context 'with ended sponsorship' do
      let(:sponsorship) { create(:sponsorship, end_date: Date.yesterday) }

      it 'active is false' do
        expect(subject[:active]).to be false
      end
    end
  end
end
```

**Integration Tests:**
- Existing request specs should pass unchanged (API contract maintained)
- No frontend changes needed

### Code Smell Resolution

**Before (Reek output):**
```
Api::SponsorshipsController#index:
  - DuplicateMethodCall: s.id (2x), s.donor_id (2x), s.donor.name (2x), ...
  - FeatureEnvy: refers to 's' more than self
  - TooManyStatements: 11 statements
  - UncommunicativeVariableName: 's'
```

**After:**
- ✅ All DuplicateMethodCall eliminated
- ✅ FeatureEnvy resolved (presentation logic in presenter)
- ✅ TooManyStatements reduced to 5
- ✅ No single-letter variable names

### Related Tickets

- ✅ TICKET-010: Sponsorship model exists
- ✅ TICKET-029: Presenter pattern established (DonationPresenter, BasePresenter, CollectionPresenter)
- 📋 TICKET-056: Will benefit from cleaner controller when adding validations
- 📋 TICKET-055: Will benefit when adding edit/reactivate actions

### When to Implement

**Options:**
1. **Before TICKET-056:** Cleaner foundation for adding validations
2. **After TICKET-056:** Defer until adding `start_date` field (TICKET-055)
3. **Standalone:** Independent refactor for code quality

**Recommendation:** Can be done anytime - doesn't block other work, but improves code quality.

---

*Identified from Reek code smell analysis (2025-10-22)*
