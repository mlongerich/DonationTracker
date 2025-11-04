## [TICKET-043] Refine Controller Concerns Implementation

**Status:** 🔀 Merged into TICKET-069
**Priority:** 🟢 Low (duplicate)
**Effort:** S (Small)
**Created:** 2025-10-19
**Merged:** 2025-11-04
**Dependencies:** TICKET-028 (completed)

### User Story
As a developer, I want controller concerns to follow Rails best practices so that the code is clean, maintainable, and passes code quality checks without warnings.

## ⚠️ TICKET MERGED INTO TICKET-069

**All issues identified in this ticket are now covered by TICKET-069 (Code Quality Cleanup Batch):**

- ✅ DuplicateMethodCall in RansackFilterable → TICKET-069 Section 2
- ✅ UncommunicativeVariableName (`@q`) → TICKET-069 Section 4
- ✅ UtilityFunction in PaginationConcern → TICKET-069 Section 3
- ✅ IrresponsibleModule warnings → TICKET-042 (separate documentation ticket)

**Please refer to TICKET-069 for implementation details.**

---

### Original Problem Statement (for reference)

Reek identified 5 code smells in the newly created controller concerns (from TICKET-028):

**RansackFilterable (3 warnings):**
1. `DuplicateMethodCall`: Calls `params[:q]` 2 times (lines 5, 7) → **TICKET-069**
2. `UncommunicativeVariableName`: Variable `@q` is unclear → **TICKET-069**
3. `IrresponsibleModule`: Missing documentation → **TICKET-042**

**PaginationConcern (2 warnings):**
1. `UtilityFunction`: `pagination_meta` doesn't use instance state → **TICKET-069**
2. `IrresponsibleModule`: Missing documentation → **TICKET-042**

**Code Smell:** Reek warnings in recently created code
**Issue:** Minor quality issues that should be addressed for consistency

### Current Implementation

```ruby
# app/controllers/concerns/ransack_filterable.rb
module RansackFilterable
  extend ActiveSupport::Concern

  def apply_ransack_filters(scope)
    return scope unless params[:q].present?

    @q = scope.ransack(params[:q])
    @q.result
  end
end

# app/controllers/concerns/pagination_concern.rb
module PaginationConcern
  extend ActiveSupport::Concern

  def paginate_collection(collection, per_page: 25)
    page = params[:page] || 1
    collection.page(page).per(per_page)
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

### Acceptance Criteria
- [ ] Fix DuplicateMethodCall in RansackFilterable with memoization
- [ ] Rename `@q` to `@ransack_query` for clarity
- [ ] Add documentation comments to both concerns (addresses TICKET-042 overlap)
- [ ] Consider extracting `pagination_meta` to module method if it doesn't need instance state
- [ ] All existing tests pass
- [ ] Reek warnings reduced from 5 to 0 for concerns
- [ ] Update concern specs if needed

### Technical Approach

#### 1. Fix RansackFilterable

**Before:**
```ruby
module RansackFilterable
  extend ActiveSupport::Concern

  def apply_ransack_filters(scope)
    return scope unless params[:q].present?

    @q = scope.ransack(params[:q])
    @q.result
  end
end
```

**After:**
```ruby
# Provides Ransack query building for filtered collection endpoints.
#
# Automatically builds Ransack queries from params[:q] hash and applies
# filtering to ActiveRecord scopes.
#
# @example Usage in controller
#   class Api::DonorsController < ApplicationController
#     include RansackFilterable
#
#     def index
#       scope = Donor.all
#       filtered_scope = apply_ransack_filters(scope)
#       render json: filtered_scope
#     end
#   end
#
# @see Ransack gem for query syntax
module RansackFilterable
  extend ActiveSupport::Concern

  # Applies Ransack filters from params[:q] to the given scope.
  #
  # @param scope [ActiveRecord::Relation] The scope to filter
  # @return [ActiveRecord::Relation] The filtered scope
  def apply_ransack_filters(scope)
    ransack_params = params[:q]
    return scope unless ransack_params.present?

    @ransack_query = scope.ransack(ransack_params)
    @ransack_query.result
  end
end
```

**Changes:**
1. Extract `params[:q]` to local variable `ransack_params` (eliminates DuplicateMethodCall)
2. Rename `@q` to `@ransack_query` (eliminates UncommunicativeVariableName)
3. Add module-level documentation (eliminates IrresponsibleModule)
4. Add method-level documentation with @param and @return

#### 2. Refine PaginationConcern

**Option A: Keep as instance methods (recommended)**
```ruby
# Provides Kaminari pagination helpers for controller actions.
#
# Included in controllers that need paginated collection responses
# with metadata (total_count, total_pages, current_page, per_page).
#
# Methods:
# - paginate_collection(collection): Apply Kaminari pagination
# - pagination_meta(collection): Generate pagination metadata hash
#
# @example Usage in controller
#   class Api::DonorsController < ApplicationController
#     include PaginationConcern
#
#     def index
#       donors = paginate_collection(Donor.all)
#       render json: { donors: donors, meta: pagination_meta(donors) }
#     end
#   end
#
# @see Kaminari gem for pagination
module PaginationConcern
  extend ActiveSupport::Concern

  # Paginates a collection using Kaminari.
  #
  # @param collection [ActiveRecord::Relation] The collection to paginate
  # @param per_page [Integer] Number of items per page (default: 25)
  # @return [Kaminari::PaginatableArray] The paginated collection
  def paginate_collection(collection, per_page: 25)
    page = params[:page] || 1
    collection.page(page).per(per_page)
  end

  # Generates pagination metadata from a paginated collection.
  #
  # @param paginated_collection [Kaminari::PaginatableArray] The paginated collection
  # @return [Hash] Pagination metadata
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

**Rationale for keeping instance methods:**
- `pagination_meta` is conceptually a controller helper (fits in concern pattern)
- Controllers expect instance methods for consistent API
- Reek's UtilityFunction warning is a suggestion, not a hard rule
- No performance benefit to making it a class method
- Current pattern works well and is Rails-idiomatic

**Option B: Extract to module method (alternative)**
```ruby
module PaginationConcern
  extend ActiveSupport::Concern

  def paginate_collection(collection, per_page: 25)
    page = params[:page] || 1
    collection.page(page).per(per_page)
  end

  def pagination_meta(paginated_collection)
    PaginationConcern.build_meta(paginated_collection)
  end

  # Module-level utility for building pagination metadata.
  # Can be called directly or via instance method.
  def self.build_meta(paginated_collection)
    {
      total_count: paginated_collection.total_count,
      total_pages: paginated_collection.total_pages,
      current_page: paginated_collection.current_page,
      per_page: paginated_collection.limit_value
    }
  end
end
```

**Recommendation:** Use Option A (keep instance methods) for simplicity and Rails conventions.

### Benefits
- **Code Quality**: Eliminates all Reek warnings for concerns
- **Readability**: Clear variable names (`@ransack_query` vs `@q`)
- **Maintainability**: Well-documented concerns easier to use and extend
- **Best Practices**: Follows Rails concern patterns
- **DRY**: Removes code duplication (memoization fix)

### Testing Strategy

```ruby
# spec/controllers/concerns/ransack_filterable_spec.rb
RSpec.describe RansackFilterable, type: :controller do
  controller(ApplicationController) do
    include RansackFilterable

    def index
      scope = Donor.all
      filtered = apply_ransack_filters(scope)
      render json: filtered
    end
  end

  describe "#apply_ransack_filters" do
    it "stores ransack query in @ransack_query instance variable" do
      get :index, params: { q: { name_cont: "John" } }

      expect(controller.instance_variable_get(:@ransack_query)).to be_a(Ransack::Search)
    end

    it "does not call params[:q] multiple times" do
      allow(controller).to receive(:params).and_return({ q: { name_cont: "John" } })

      expect(controller.params).to receive(:[]).with(:q).once.and_call_original

      get :index, params: { q: { name_cont: "John" } }
    end
  end
end
```

### Files to Modify
- `app/controllers/concerns/ransack_filterable.rb`
- `app/controllers/concerns/pagination_concern.rb`
- `spec/controllers/concerns/ransack_filterable_spec.rb` (update test expectations)
- `spec/controllers/concerns/pagination_concern_spec.rb` (verify still passes)

### Reek Configuration (Optional)

If we decide Option A is correct and want to suppress the UtilityFunction warning:

```yaml
# .reek.yml
PaginationConcern:
  UtilityFunction:
    enabled: false
    exclude:
      - pagination_meta # Intentionally a utility, fits concern pattern
```

### Related Tickets
- Follow-up to TICKET-028 (Controller Concerns extraction)
- Overlaps with TICKET-042 (documentation) for concerns section
- Part of code quality improvement initiative

### Notes
- This is a refinement ticket (improves existing code, no new features)
- All controller functionality remains unchanged
- Can be combined with TICKET-042 if working on both simultaneously
- Consider running `bundle exec reek app/controllers/concerns/` before and after to verify fixes
