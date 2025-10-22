## [TICKET-028] Extract Controller Concerns for Pagination/Filtering

**Status:** ✅ Complete
**Priority:** 🟡 Medium
**Effort:** S (Small)
**Created:** 2025-10-18
**Completed:** 2025-10-18
**Dependencies:** None

### User Story
As a developer, I want to extract repeated pagination and filtering logic into reusable controller concerns so that I can maintain DRY principles and reduce code duplication across API controllers.

### Problem Statement
Currently, both `DonorsController` and `DonationsController` have similar pagination and Ransack filtering logic:
- Pagination setup with Kaminari (`page`, `per_page`)
- Ransack query building (`@q = scope.ransack(params[:q])`)
- Metadata formatting (`total_count`, `total_pages`, `current_page`, `per_page`)

**Code Smell:** Duplication across controllers (DonorsController:3-17, DonationsController:4-22)

### Acceptance Criteria
- [ ] Create `PaginationConcern` module in `app/controllers/concerns/`
- [ ] Extract pagination metadata formatting into concern
- [ ] Create `RansackFilterable` concern for query building
- [ ] Refactor `DonorsController#index` to use concerns
- [ ] Refactor `DonationsController#index` to use concerns
- [ ] All existing tests pass without modification
- [ ] Add concern specs with shared examples
- [ ] Update CLAUDE.md with concern pattern documentation

### Technical Approach

#### 1. Create PaginationConcern
```ruby
# app/controllers/concerns/pagination_concern.rb
module PaginationConcern
  extend ActiveSupport::Concern

  def paginate_collection(collection)
    collection.page(params[:page]).per(params[:per_page] || 25)
  end

  def pagination_meta(paginated_collection)
    {
      total_count: paginated_collection.total_count,
      total_pages: paginated_collection.total_pages,
      current_page: paginated_collection.current_page,
      per_page: paginated_collection.limit_value
    }
  end
end
```

#### 2. Create RansackFilterable Concern
```ruby
# app/controllers/concerns/ransack_filterable.rb
module RansackFilterable
  extend ActiveSupport::Concern

  def apply_ransack_filters(scope)
    @q = scope.ransack(params[:q])
    @q.result
  end
end
```

#### 3. Refactor Controllers
```ruby
class Api::DonorsController < ApplicationController
  include PaginationConcern
  include RansackFilterable

  def index
    scope = params[:include_discarded] == "true" ? Donor.with_discarded : Donor.kept
    scope = scope.where(merged_into_id: nil)

    filtered_scope = apply_ransack_filters(scope)
    donors = paginate_collection(filtered_scope.order(name: :asc))

    render json: {
      donors: donors,
      meta: pagination_meta(donors)
    }
  end
end
```

### Benefits
- **DRY**: Single source of truth for pagination logic
- **Maintainability**: Changes to pagination apply everywhere
- **Testability**: Concerns can be tested in isolation with shared examples
- **Scalability**: New controllers can easily include concerns
- **Rails Convention**: Follows Rails patterns for cross-cutting concerns

### Testing Strategy
```ruby
# spec/controllers/concerns/pagination_concern_spec.rb
RSpec.describe PaginationConcern, type: :controller do
  controller(ApplicationController) do
    include PaginationConcern

    def index
      collection = Donor.all
      paginated = paginate_collection(collection)
      render json: { data: paginated, meta: pagination_meta(paginated) }
    end
  end

  it "paginates collection with default per_page" do
    create_list(:donor, 30)
    get :index
    expect(response.parsed_body['meta']['per_page']).to eq(25)
  end

  it "accepts custom per_page parameter" do
    get :index, params: { per_page: 10 }
    expect(response.parsed_body['meta']['per_page']).to eq(10)
  end
end
```

### Files Changed
- `app/controllers/concerns/pagination_concern.rb` ✅ (NEW - 14 lines)
- `app/controllers/concerns/ransack_filterable.rb` ✅ (NEW - 8 lines)
- `app/controllers/api/donors_controller.rb` ✅ (MODIFIED - refactored index action)
- `app/controllers/api/donations_controller.rb` ✅ (MODIFIED - refactored index action)
- `spec/controllers/concerns/pagination_concern_spec.rb` ✅ (NEW - 3 tests)
- `spec/controllers/concerns/ransack_filterable_spec.rb` ✅ (NEW - 2 tests)
- `CLAUDE.md` ✅ (UPDATED - added Controller Concerns pattern documentation)

### Implementation Summary
**Created PaginationConcern:**
- `paginate_collection(collection)` - Applies Kaminari pagination with params
- `pagination_meta(paginated_collection)` - Generates consistent metadata hash

**Created RansackFilterable:**
- `apply_ransack_filters(scope)` - Builds Ransack query from params[:q]

**Refactored Controllers:**
- DonorsController: Reduced index action from 10 lines to 8 lines using concerns
- DonationsController: Reduced index action from 9 lines to 7 lines using concerns
- Both controllers now include PaginationConcern and RansackFilterable

**Test Results:**
- All 81 specs passing (18 donor + 9 donation + 5 concern + 49 other specs)
- No API contract changes - all existing integration tests pass

### Related Tickets
- ✅ Prepares for TICKET-009 (Projects will use same concerns)
- Part of code quality improvement initiative
- TICKET-029 (Presenter Pattern) already complete - works well together

### Notes
- This is a refactoring ticket - no functionality changes
- All existing tests pass without modification
- Concerns tested in isolation using anonymous controllers
- Pattern documented in CLAUDE.md for future reference
