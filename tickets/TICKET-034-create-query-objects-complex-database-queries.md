## [TICKET-034] Create Query Objects for Complex Database Queries

**Status:** 📋 Planned
**Priority:** 🟢 Low
**Effort:** M (Medium)
**Created:** 2025-10-18
**Dependencies:** None

### User Story
As a developer, I want to encapsulate complex database queries into Query Objects so that query logic is reusable, testable, and separated from controllers.

### Problem Statement
Complex Ransack queries are built inline in controllers:
- Query building mixed with controller logic
- No reusability of common queries
- Difficult to test query logic independently
- Query complexity hidden in controllers

**Code Smell:** Fat queries in controllers, no abstraction
**Issue:** DonorsController:3-7, DonationsController:4-6

### Acceptance Criteria
- [ ] Create `app/queries/` directory for query objects
- [ ] Create base `ApplicationQuery` class
- [ ] Create `DonorSearchQuery` for donor filtering logic
- [ ] Create `DonationFilterQuery` for donation filtering logic
- [ ] Refactor `DonorsController` to use query objects
- [ ] Refactor `DonationsController` to use query objects
- [ ] Add comprehensive query object specs
- [ ] All existing tests pass
- [ ] Update CLAUDE.md with Query Objects pattern

### Technical Approach

#### 1. Create ApplicationQuery Base Class

```ruby
# app/queries/application_query.rb
class ApplicationQuery
  attr_reader :relation, :params

  def initialize(relation = nil, params = {})
    @relation = relation
    @params = params
  end

  def call
    raise NotImplementedError, "Subclasses must implement #call"
  end

  # Alias for call to support both styles
  def self.call(relation = nil, params = {})
    new(relation, params).call
  end
end
```

#### 2. Create DonorSearchQuery

```ruby
# app/queries/donor_search_query.rb
class DonorSearchQuery < ApplicationQuery
  def initialize(params = {})
    @params = params
  end

  def call
    scope = base_scope
    scope = apply_search(scope)
    scope = apply_discard_filter(scope)
    scope = exclude_merged(scope)
    scope
  end

  private

  def base_scope
    Donor.all
  end

  def apply_search(scope)
    return scope unless params[:q].present?

    scope.ransack(params[:q]).result
  end

  def apply_discard_filter(scope)
    if params[:include_discarded] == "true"
      scope.with_discarded
    else
      scope.kept
    end
  end

  def exclude_merged(scope)
    scope.where(merged_into_id: nil)
  end
end
```

#### 3. Create DonationFilterQuery

```ruby
# app/queries/donation_filter_query.rb
class DonationFilterQuery < ApplicationQuery
  def initialize(params = {})
    @params = params
  end

  def call
    scope = base_scope
    scope = apply_filters(scope)
    scope = apply_ordering(scope)
    scope
  end

  private

  def base_scope
    Donation.includes(:donor)
  end

  def apply_filters(scope)
    return scope unless params[:q].present?

    scope.ransack(params[:q]).result
  end

  def apply_ordering(scope)
    scope.order(date: :desc)
  end
end
```

#### 4. Refactor Controllers

**DonorsController:**
```ruby
class Api::DonorsController < ApplicationController
  include PaginationConcern

  def index
    authorize Donor

    donors = DonorSearchQuery.call(params)
    paginated_donors = paginate_collection(donors.order(name: :asc))

    render json: {
      donors: paginated_donors,
      meta: pagination_meta(paginated_donors)
    }
  end

  # ... rest of controller
end
```

**DonationsController:**
```ruby
class Api::DonationsController < ApplicationController
  include PaginationConcern

  def index
    authorize Donation

    donations = DonationFilterQuery.call(params)
    paginated_donations = paginate_collection(donations)

    render json: {
      donations: CollectionPresenter.new(paginated_donations, DonationPresenter).as_json,
      meta: pagination_meta(paginated_donations)
    }, status: :ok
  end

  # ... rest of controller
end
```

### Advanced Query Object Example

For more complex scenarios (future enhancement):

```ruby
# app/queries/donation_analytics_query.rb
class DonationAnalyticsQuery < ApplicationQuery
  def initialize(start_date:, end_date:, donor_id: nil)
    @start_date = start_date
    @end_date = end_date
    @donor_id = donor_id
  end

  def call
    {
      total_amount: total_donations,
      donation_count: count_donations,
      average_donation: average_donation_amount,
      top_donors: top_donors(limit: 10)
    }
  end

  private

  attr_reader :start_date, :end_date, :donor_id

  def base_scope
    scope = Donation.where(date: start_date..end_date)
    scope = scope.where(donor_id: donor_id) if donor_id.present?
    scope
  end

  def total_donations
    base_scope.sum(:amount)
  end

  def count_donations
    base_scope.count
  end

  def average_donation_amount
    base_scope.average(:amount)
  end

  def top_donors(limit: 10)
    Donor.joins(:donations)
         .where(donations: { date: start_date..end_date })
         .group('donors.id')
         .select('donors.*, SUM(donations.amount) as total_donated')
         .order('total_donated DESC')
         .limit(limit)
  end
end
```

### Benefits
- **Separation of Concerns**: Query logic separate from controllers
- **Reusability**: Same query usable in multiple contexts
- **Testability**: Query objects easily unit tested
- **Composability**: Can combine multiple query objects
- **Maintainability**: Complex queries in dedicated classes
- **Performance**: Easier to optimize and add caching
- **Readability**: Controller code becomes more declarative

### Testing Strategy

```ruby
# spec/queries/donor_search_query_spec.rb
RSpec.describe DonorSearchQuery do
  describe "#call" do
    let!(:active_donor) { create(:donor, name: "John Doe", email: "john@example.com") }
    let!(:archived_donor) { create(:donor, :discarded, name: "Jane Smith") }
    let!(:merged_donor) { create(:donor, merged_into_id: active_donor.id) }

    context "without filters" do
      it "returns only active, non-merged donors" do
        result = described_class.call({})
        expect(result).to include(active_donor)
        expect(result).not_to include(archived_donor)
        expect(result).not_to include(merged_donor)
      end
    end

    context "with include_discarded" do
      it "includes archived donors" do
        result = described_class.call({ include_discarded: "true" })
        expect(result).to include(active_donor, archived_donor)
        expect(result).not_to include(merged_donor)
      end
    end

    context "with ransack search" do
      it "filters by name" do
        result = described_class.call({ q: { name_cont: "John" } })
        expect(result).to include(active_donor)
        expect(result).not_to include(archived_donor)
      end

      it "filters by email" do
        result = described_class.call({ q: { email_cont: "john@" } })
        expect(result).to include(active_donor)
      end
    end

    context "excludes merged donors" do
      it "never returns merged donors" do
        result = described_class.call({ include_discarded: "true" })
        expect(result).not_to include(merged_donor)
      end
    end
  end
end

# spec/queries/donation_filter_query_spec.rb
RSpec.describe DonationFilterQuery do
  describe "#call" do
    let(:donor) { create(:donor) }
    let!(:recent_donation) { create(:donation, donor: donor, date: 1.day.ago, amount: 100) }
    let!(:old_donation) { create(:donation, donor: donor, date: 30.days.ago, amount: 50) }

    context "without filters" do
      it "returns all donations ordered by date desc" do
        result = described_class.call({})
        expect(result.to_a).to eq([recent_donation, old_donation])
      end

      it "includes donor association" do
        result = described_class.call({})
        expect { result.first.donor.name }.not_to make_database_queries
      end
    end

    context "with date range filter" do
      it "filters by date range" do
        result = described_class.call({
          q: {
            date_gteq: 2.days.ago.to_date,
            date_lteq: Date.today
          }
        })
        expect(result).to include(recent_donation)
        expect(result).not_to include(old_donation)
      end
    end

    context "with donor filter" do
      let(:other_donor) { create(:donor) }
      let!(:other_donation) { create(:donation, donor: other_donor) }

      it "filters by donor_id" do
        result = described_class.call({ q: { donor_id_eq: donor.id } })
        expect(result).to include(recent_donation, old_donation)
        expect(result).not_to include(other_donation)
      end
    end
  end
end
```

### Files to Create
- `app/queries/application_query.rb` (NEW)
- `app/queries/donor_search_query.rb` (NEW)
- `app/queries/donation_filter_query.rb` (NEW)
- `spec/queries/donor_search_query_spec.rb` (NEW)
- `spec/queries/donation_filter_query_spec.rb` (NEW)

### Files to Modify
- `app/controllers/api/donors_controller.rb` (REFACTOR)
- `app/controllers/api/donations_controller.rb` (REFACTOR)
- `CLAUDE.md` (UPDATE - add Query Objects pattern)

### Query Objects vs ActiveRecord Scopes

**When to use Query Objects:**
- Complex queries with multiple filters
- Queries combining multiple models
- Queries with business logic
- Queries reused across controllers/services

**When to use Scopes:**
- Simple, single-concern filters
- Frequently chained queries
- Model-specific filters (e.g., `Donor.active`)

**Example of complementary usage:**
```ruby
# Model scope
class Donor < ApplicationRecord
  scope :active, -> { kept.where(merged_into_id: nil) }
end

# Query object using scope
class DonorSearchQuery < ApplicationQuery
  def base_scope
    Donor.active # Uses scope
  end
end
```

### Future Enhancements
- Add query result caching
- Create `DonorAnalyticsQuery` for reporting
- Add query object composition helpers
- Implement query object instrumentation/logging
- Add query performance benchmarking

### Related Tickets
- Works well with TICKET-028 (Controller Concerns)
- Complements TICKET-033 (Policy Objects - can use policy scopes)
- Part of code quality improvement initiative

### Notes
- Query objects are POROs (Plain Old Ruby Objects)
- Can be tested without controller or database (using doubles)
- Keep query objects focused on database queries only
- Business logic belongs in services, not query objects
- Consider adding `frozen_string_literal: true` for immutability
