## [TICKET-094] Fix SponsorshipsController Error Handling Pattern

**Status:** ✅ Complete
**Priority:** 🔴 High (Critical Pattern Violation)
**Effort:** S (Small)
**Created:** 2025-11-11
**Completed:** 2025-11-12
**Dependencies:** None

### User Story
As a developer, I want SponsorshipsController to follow the established global error handling pattern so that error responses are consistent across the API.

### Problem Statement
SponsorshipsController#create uses the old `if sponsorship.save` pattern instead of the documented `save!` pattern with global error handling.

**Code Smell:** Pattern violation - not following ApplicationController's global error handling
**Issue:** SponsorshipsController:51 uses if/save instead of save!
**Reference:** CLAUDE.md - Global Error Handling section

### Current Code (Incorrect)
```ruby
# app/controllers/api/sponsorships_controller.rb:48-56
def create
  sponsorship = Sponsorship.new(sponsorship_params)

  if sponsorship.save
    render json: { sponsorship: SponsorshipPresenter.new(sponsorship).as_json }, status: :created
  else
    render json: { errors: sponsorship.errors.full_messages }, status: :unprocessable_entity
  end
end
```

### Expected Pattern (from CLAUDE.md)
```ruby
def create
  sponsorship = Sponsorship.new(sponsorship_params)
  sponsorship.save!  # Raises RecordInvalid if validation fails
  render json: { sponsorship: SponsorshipPresenter.new(sponsorship).as_json }, status: :created
end
```

### Additional Issue: Unnecessary .reload
**File:** `app/controllers/api/donations_controller.rb:42`
```ruby
def create
  donation = Donation.new(donation_params)
  donation.save!  # Raises RecordInvalid if validation fails
  donation.reload  # UNNECESSARY - can be removed
  render json: { donation: DonationPresenter.new(donation).as_json }, status: :created
end
```

### Acceptance Criteria
- [x] Change `if sponsorship.save` to `sponsorship.save!` in SponsorshipsController#create
- [x] Remove manual error handling (if/else block)
- [x] Remove `donation.reload` from DonationsController#create
- [x] Verify ApplicationController's global error handler catches RecordInvalid
- [x] All existing tests pass (295/295 passing, 93.75% coverage)
- [x] Error response format matches other controllers (422 with errors array)

### Technical Approach

#### 1. Fix SponsorshipsController
```ruby
# app/controllers/api/sponsorships_controller.rb
def create
  sponsorship = Sponsorship.new(sponsorship_params)
  sponsorship.save!  # Raises RecordInvalid, caught by ApplicationController
  render json: { sponsorship: SponsorshipPresenter.new(sponsorship).as_json }, status: :created
end
```

#### 2. Fix DonationsController
```ruby
# app/controllers/api/donations_controller.rb
def create
  donation = Donation.new(donation_params)
  donation.save!  # .reload not needed - object already has all attributes
  render json: { donation: DonationPresenter.new(donation).as_json }, status: :created
end
```

#### 3. Verify Global Error Handler
```ruby
# app/controllers/application_controller.rb (already exists, verify it works)
class ApplicationController < ActionController::API
  rescue_from ActiveRecord::RecordInvalid, with: :render_unprocessable_entity

  private

  def render_unprocessable_entity(exception)
    render json: { errors: exception.record.errors.full_messages }, status: :unprocessable_entity
  end
end
```

### Benefits
- **Consistency**: All controllers now follow same error handling pattern
- **DRY**: Remove duplicated error handling code
- **Maintainability**: Single source of truth for error response format
- **Correctness**: Follows established project conventions (CLAUDE.md)
- **Performance**: Remove unnecessary database query (.reload)

### Testing Strategy

```ruby
# spec/requests/api/sponsorships_spec.rb
RSpec.describe "POST /api/sponsorships" do
  context "with invalid attributes" do
    let(:invalid_params) do
      { sponsorship: { donor_id: nil, child_id: 1, monthly_amount: 5000 } }
    end

    it "returns 422 with errors array" do
      post "/api/sponsorships", params: invalid_params

      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body).to have_key("errors")
      expect(response.parsed_body["errors"]).to be_an(Array)
    end

    it "does not create a sponsorship" do
      expect {
        post "/api/sponsorships", params: invalid_params
      }.not_to change(Sponsorship, :count)
    end
  end

  context "with valid attributes" do
    let(:donor) { create(:donor) }
    let(:child) { create(:child) }
    let(:valid_params) do
      {
        sponsorship: {
          donor_id: donor.id,
          child_id: child.id,
          monthly_amount: 5000,
          start_date: Date.today
        }
      }
    end

    it "creates a sponsorship" do
      expect {
        post "/api/sponsorships", params: valid_params
      }.to change(Sponsorship, :count).by(1)
    end

    it "returns 201 with sponsorship data" do
      post "/api/sponsorships", params: valid_params

      expect(response).to have_http_status(:created)
      expect(response.parsed_body).to have_key("sponsorship")
    end
  end
end
```

### Files to Modify
- `app/controllers/api/sponsorships_controller.rb` (FIX error handling)
- `app/controllers/api/donations_controller.rb` (REMOVE .reload)
- `spec/requests/api/sponsorships_spec.rb` (VERIFY error format)

### TDD Workflow
1. **Red**: Verify existing tests expect correct error format
2. **Green**: Make changes to controllers
3. **Refactor**: Ensure all controllers follow same pattern
4. **Verify**: Run full test suite

### Related Tickets
- Follows pattern established in TICKET-068 (Global Error Handling)
- Part of CODE_SMELL_ANALYSIS initiative
- Identified in code smell review on 2025-11-11

### Notes
- This is a critical pattern violation that should be fixed immediately
- After this fix, all controllers will follow the same error handling pattern
- The `.reload` removal is a bonus optimization (one less database query per donation)
- No functionality changes - only implementation consistency
