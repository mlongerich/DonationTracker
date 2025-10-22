## [TICKET-029] Implement Presenter Pattern for API Responses

**Status:** ✅ Complete
**Priority:** 🟡 Medium
**Effort:** M (Medium)
**Created:** 2025-10-18
**Completed:** 2025-10-18
**Dependencies:** None

### User Story
As a developer, I want to extract view-specific JSON formatting logic from controllers into Presenter objects so that controllers remain thin and formatting logic can be tested and reused independently.

### Problem Statement
Currently, `DonationsController#index` manually formats JSON responses with inline logic:
```ruby
donations_with_donor_name = donations.map do |donation|
  donation.as_json.merge(donor_name: donation.donor.name)
end
```

**Code Smell:** View logic in controller (DonationsController:9-11)
**Issue:** Formatting logic cannot be reused, tested in isolation, or easily modified

### Acceptance Criteria
- [x] Create `DonationPresenter` class to encapsulate JSON formatting
- [x] Extract donor name merging logic from controller to presenter
- [x] Refactor `DonationsController#index` to use presenter
- [x] Add presenter specs with comprehensive JSON structure tests
- [x] All existing request specs pass without modification (7 specs passing)
- [x] Update CLAUDE.md with Presenter pattern documentation
- [x] Create base `BasePresenter` class for future presenters

### Technical Approach

#### 1. Create BasePresenter
```ruby
# app/presenters/base_presenter.rb
class BasePresenter
  def initialize(object, options = {})
    @object = object
    @options = options
  end

  def as_json(options = {})
    raise NotImplementedError, "Subclasses must implement as_json"
  end

  private

  attr_reader :object, :options
end
```

#### 2. Create DonationPresenter
```ruby
# app/presenters/donation_presenter.rb
class DonationPresenter < BasePresenter
  def as_json(options = {})
    {
      id: object.id,
      amount: object.amount,
      date: object.date,
      donor_id: object.donor_id,
      donor_name: object.donor.name,
      status: object.status,
      description: object.description,
      created_at: object.created_at,
      updated_at: object.updated_at
    }
  end
end
```

#### 3. Create CollectionPresenter for lists
```ruby
# app/presenters/collection_presenter.rb
class CollectionPresenter < BasePresenter
  def initialize(collection, presenter_class, options = {})
    @collection = collection
    @presenter_class = presenter_class
    @options = options
  end

  def as_json(options = {})
    @collection.map do |item|
      @presenter_class.new(item, @options).as_json(options)
    end
  end
end
```

#### 4. Refactor DonationsController
```ruby
class Api::DonationsController < ApplicationController
  def index
    scope = Donation.includes(:donor).all
    @q = scope.ransack(params[:q])
    donations = @q.result.order(date: :desc).page(params[:page]).per(params[:per_page] || 25)

    render json: {
      donations: CollectionPresenter.new(donations, DonationPresenter).as_json,
      meta: {
        total_count: donations.total_count,
        total_pages: donations.total_pages,
        current_page: donations.current_page,
        per_page: donations.limit_value
      }
    }, status: :ok
  end
end
```

### Benefits
- **Separation of Concerns**: View logic separated from controller logic
- **Testability**: Presenters can be unit tested independently
- **Reusability**: Same presenter can be used in multiple endpoints
- **Maintainability**: JSON structure changes in one place
- **Extensibility**: Easy to add conditional fields or different presentation formats
- **Performance**: Can optimize N+1 queries in presenter layer

### Testing Strategy

#### Presenter Unit Tests
```ruby
# spec/presenters/donation_presenter_spec.rb
RSpec.describe DonationPresenter do
  describe "#as_json" do
    let(:donor) { create(:donor, name: "John Doe") }
    let(:donation) { create(:donation, donor: donor, amount: 100.50) }
    let(:presenter) { described_class.new(donation) }

    it "includes all donation attributes" do
      json = presenter.as_json
      expect(json).to include(
        id: donation.id,
        amount: 100.50,
        donor_id: donor.id
      )
    end

    it "includes donor name" do
      json = presenter.as_json
      expect(json[:donor_name]).to eq("John Doe")
    end

    it "formats dates correctly" do
      json = presenter.as_json
      expect(json[:date]).to eq(donation.date)
    end
  end
end
```

#### Integration Tests
```ruby
# spec/requests/api/donations_spec.rb (existing test should still pass)
RSpec.describe "GET /api/donations" do
  it "includes donor names in response" do
    donor = create(:donor, name: "Jane Smith")
    create(:donation, donor: donor)

    get "/api/donations"

    expect(response).to have_http_status(:ok)
    expect(response.parsed_body["donations"].first["donor_name"]).to eq("Jane Smith")
  end
end
```

### Design Pattern Details

**Presenter Pattern** (aka Decorator/View Object):
- Wraps model objects to add presentation logic
- Keeps models focused on business logic
- Keeps controllers thin and focused on request/response handling
- Different from serializers (ActiveModel::Serializers) - simpler, no DSL

**When to use Presenters:**
- Complex JSON structures
- Conditional field inclusion
- Computed/derived fields
- Aggregating data from multiple models
- Different representations of same model

### Files Changed
- `app/presenters/base_presenter.rb` ✅ (NEW)
- `app/presenters/donation_presenter.rb` ✅ (NEW)
- `app/presenters/collection_presenter.rb` ✅ (NEW)
- `app/controllers/api/donations_controller.rb` ✅ (MODIFIED)
- `spec/presenters/base_presenter_spec.rb` ✅ (NEW - 3 tests)
- `spec/presenters/donation_presenter_spec.rb` ✅ (NEW - 3 tests)
- `spec/presenters/collection_presenter_spec.rb` ✅ (NEW - 2 tests)
- `CLAUDE.md` ✅ (UPDATED - added Presenter pattern to design pattern registry)

### Future Enhancements
- Create `DonorPresenter` for consistent donor JSON formatting
- Add presenter options for conditional field inclusion
- Consider presenter caching for expensive computations
- Add `PresentationHelper` module for common formatting (dates, currency)

### Related Tickets
- TICKET-028: Works well with extracted controller concerns
- TICKET-009: Presenter pattern prepares for adding project info to donations
- Part of broader code quality improvement initiative

### Implementation Notes
- ✅ Used strict TDD workflow (one test at a time)
- ✅ All existing 7 request specs pass without modification (no API contract changes)
- ✅ N+1 query for `donation.donor.name` already resolved with `includes(:donor)` in controller
- ✅ Presenters kept simple - no business logic, only presentation logic
- ✅ BasePresenter provides foundation for future presenters (DonorPresenter, ProjectPresenter)

### Why This Prepares for TICKET-009
When project support is added to donations:
1. Simply add `project_title` field to `DonationPresenter#as_json`
2. No controller changes needed
3. Centralized formatting logic makes it easy to add conditional project display
