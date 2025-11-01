## [TICKET-063] Standardize API Response Wrapping with Presenters

**Status:** 📋 Planned
**Priority:** 🔴 High
**Effort:** M (Medium - 2-3 hours)
**Created:** 2025-10-31
**Dependencies:** None

### User Story
As a frontend developer, I want consistent API response structures across all endpoints so that I can rely on predictable data formats and avoid conditional handling logic.

### Problem Statement

**Critical Pattern Drift: Inconsistent Presenter Usage**

Controllers return responses in **4 different formats**:

```ruby
# Pattern 1: Raw model (INCONSISTENT) ❌
def show
  donor = Donor.find(params[:id])
  render json: donor  # No presenter, no wrapper
end

# Pattern 2: Wrapped + Presenter (CORRECT) ✅
def show
  project = Project.find(params[:id])
  render json: { project: ProjectPresenter.new(project).as_json }
end

# Pattern 3: Service result (raw) ❌
def create
  result = DonorService.find_or_update_by_email(donor_params, Time.current)
  render json: result[:donor]  # Raw from service
end

# Pattern 4: Collection + Meta (CORRECT for index) ✅
def index
  render json: {
    donations: CollectionPresenter.new(donations, DonationPresenter).as_json,
    meta: pagination_meta(donations)
  }
end
```

**CLAUDE.md Established Pattern (TICKET-029):**
> "All responses use [Resource]Presenter for consistent JSON formatting"

**Impact:**
- Frontend must handle different structures for same resource type
- `displayable_email` only available in some responses
- Hard to add computed fields consistently
- Breaks Open-Closed Principle (presenters exist but not always used)

### Current State Analysis

| Controller Action | Current Format | Expected Format | Status |
|------------------|----------------|-----------------|--------|
| **DonorsController** | | | |
| `#index` | `{ donors: CollectionPresenter, meta }` | Same | ✅ CORRECT |
| `#show` | Raw `donor` model | `{ donor: DonorPresenter }` | ❌ WRONG |
| `#create` | Raw `result[:donor]` from service | `{ donor: DonorPresenter }` | ❌ WRONG |
| `#update` | Raw `donor` model | `{ donor: DonorPresenter }` | ❌ WRONG |
| **ChildrenController** | | | |
| `#index` | Manual presenter with nested logic | `CollectionPresenter` | ⚠️ PARTIAL |
| `#show` | Raw `child` model | `{ child: ChildPresenter }` | ❌ WRONG |
| `#create` | Wrapped raw `{ child: child }` | `{ child: ChildPresenter }` | ❌ WRONG |
| `#update` | Wrapped raw `{ child: child }` | `{ child: ChildPresenter }` | ❌ WRONG |
| **ProjectsController** | | | |
| `#show` | `{ project: ProjectPresenter }` | Same | ✅ CORRECT |
| `#create` | `{ project: ProjectPresenter }` | Same | ✅ CORRECT |
| `#update` | `{ project: ProjectPresenter }` | Same | ✅ CORRECT |
| **DonationsController** | | | |
| `#create` | `DonationPresenter` (no wrapper) | `{ donation: DonationPresenter }` | ⚠️ PARTIAL |
| `#show` | `DonationPresenter` (no wrapper) | `{ donation: DonationPresenter }` | ⚠️ PARTIAL |

**Summary:** 9 out of 15 actions need fixing (60% inconsistency rate)

### Acceptance Criteria

#### Fix All Show Actions
- [ ] `DonorsController#show` returns `{ donor: DonorPresenter.new(donor).as_json }`
- [ ] `ChildrenController#show` returns `{ child: ChildPresenter.new(child).as_json }`
- [ ] `DonationsController#show` returns `{ donation: DonationPresenter.new(donation).as_json }`

#### Fix All Create Actions
- [ ] `DonorsController#create` uses `DonorPresenter` after service call
- [ ] `ChildrenController#create` uses `ChildPresenter` instead of raw model
- [ ] All create actions return wrapped response: `{ resource: Presenter }`

#### Fix All Update Actions
- [ ] `DonorsController#update` uses `DonorPresenter` instead of raw model
- [ ] `ChildrenController#update` uses `ChildPresenter` instead of raw model

#### Fix Index Actions
- [ ] `ChildrenController#index` uses `CollectionPresenter` (remove manual logic)

#### Backend Testing
- [ ] Update all request specs to expect wrapped responses
- [ ] Verify computed fields present (e.g., `displayable_email`, `can_be_deleted`)
- [ ] All existing tests pass with updated expectations

#### Frontend Compatibility
- [ ] No frontend changes required (already handles both formats)
- [ ] Document breaking change in API (optional - response structure more consistent)

### Technical Approach

#### 1. Fix DonorsController

**Before:**
```ruby
def show
  donor = Donor.find(params[:id])
  render json: donor
end

def create
  result = DonorService.find_or_update_by_email(donor_params, Time.current)
  status = result[:created] ? :created : :ok
  render json: result[:donor], status: status
end

def update
  donor = Donor.find(params[:id])
  donor.update!(donor_params.merge(last_updated_at: Time.current))
  render json: donor, status: :ok
end
```

**After:**
```ruby
def show
  donor = Donor.find(params[:id])
  render json: { donor: DonorPresenter.new(donor).as_json }
end

def create
  result = DonorService.find_or_update_by_email(donor_params, Time.current)
  status = result[:created] ? :created : :ok
  render json: { donor: DonorPresenter.new(result[:donor]).as_json }, status: status
end

def update
  donor = Donor.find(params[:id])
  donor.update!(donor_params.merge(last_updated_at: Time.current))
  render json: { donor: DonorPresenter.new(donor).as_json }, status: :ok
end
```

#### 2. Fix ChildrenController

**Before:**
```ruby
def show
  child = Child.find(params[:id])
  render json: child
end

def create
  child = Child.new(child_params)
  if child.save
    render json: { child: child }, status: :created
  else
    render json: { errors: child.errors }, status: :unprocessable_entity
  end
end

def index
  # ... complex manual presenter logic (35 lines)
  children_data = children.map do |child|
    child_json = ChildPresenter.new(child).as_json
    if params[:include_sponsorships] == "true"
      child_json[:sponsorships] = child.sponsorships.map { |s| { ... } }  # Manual!
    end
    child_json
  end
  render json: { children: children_data, meta: pagination_meta(children) }
end
```

**After:**
```ruby
def show
  child = Child.find(params[:id])
  render json: { child: ChildPresenter.new(child).as_json }
end

def create
  child = Child.new(child_params)
  if child.save
    render json: { child: ChildPresenter.new(child).as_json }, status: :created
  else
    render json: { errors: child.errors }, status: :unprocessable_entity
  end
end

def index
  scope = params[:include_discarded] == "true" ? Child.with_discarded : Child.kept
  scope = scope.includes(sponsorships: :donor) if params[:include_sponsorships] == "true"

  filtered_scope = apply_ransack_filters(scope)
  children = paginate_collection(filtered_scope.order(name: :asc))

  # Use CollectionPresenter with options
  presenter_options = { include_sponsorships: params[:include_sponsorships] == "true" }

  render json: {
    children: CollectionPresenter.new(children, ChildPresenter, presenter_options).as_json,
    meta: pagination_meta(children)
  }
end
```

#### 3. Update ChildPresenter to Support Options

```ruby
# app/presenters/child_presenter.rb
class ChildPresenter < BasePresenter
  def as_json(options = {})
    result = {
      id: object.id,
      name: object.name,
      created_at: object.created_at,
      updated_at: object.updated_at,
      discarded_at: object.discarded_at,
      can_be_deleted: object.can_be_deleted?
    }

    # Add sponsorships if requested
    if options[:include_sponsorships] && object.association(:sponsorships).loaded?
      result[:sponsorships] = object.sponsorships.map do |sponsorship|
        SponsorshipPresenter.new(sponsorship).as_json
      end
    end

    result
  end
end
```

#### 4. Update CollectionPresenter to Accept Options

```ruby
# app/presenters/collection_presenter.rb
class CollectionPresenter
  def initialize(collection, presenter_class, options = {})
    @collection = collection
    @presenter_class = presenter_class
    @options = options
  end

  def as_json
    @collection.map { |item| @presenter_class.new(item).as_json(@options) }
  end
end
```

#### 5. Fix DonationsController (Add Wrapper)

**Before:**
```ruby
def create
  donation = Donation.new(donation_params)
  if donation.save
    donation.reload
    render json: DonationPresenter.new(donation).as_json, status: :created
  else
    render json: { errors: donation.errors.full_messages }, status: :unprocessable_entity
  end
end

def show
  donation = Donation.includes(:donor).find(params[:id])
  render json: DonationPresenter.new(donation).as_json, status: :ok
end
```

**After:**
```ruby
def create
  donation = Donation.new(donation_params)
  if donation.save
    donation.reload
    render json: { donation: DonationPresenter.new(donation).as_json }, status: :created
  else
    render json: { errors: donation.errors.full_messages }, status: :unprocessable_entity
  end
end

def show
  donation = Donation.includes(:donor).find(params[:id])
  render json: { donation: DonationPresenter.new(donation).as_json }, status: :ok
end
```

### Testing Strategy

#### Update Request Specs

```ruby
# spec/requests/api/donors_spec.rb
RSpec.describe "Donors API", type: :request do
  describe "GET /api/donors/:id" do
    it "returns donor with presenter format" do
      donor = create(:donor, name: "John Doe", email: "john@example.com")

      get "/api/donors/#{donor.id}"

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)

      # UPDATED: Expect wrapped response
      expect(json).to have_key("donor")
      expect(json["donor"]["id"]).to eq(donor.id)
      expect(json["donor"]["name"]).to eq("John Doe")
      expect(json["donor"]["displayable_email"]).to eq("john@example.com")
      expect(json["donor"]["can_be_deleted"]).to be_in([true, false])
    end
  end

  describe "POST /api/donors" do
    it "returns created donor with presenter format" do
      donor_params = { name: "Jane Smith", email: "jane@example.com" }

      post "/api/donors", params: { donor: donor_params }

      expect(response).to have_http_status(:created)
      json = JSON.parse(response.body)

      # UPDATED: Expect wrapped response
      expect(json).to have_key("donor")
      expect(json["donor"]["name"]).to eq("Jane Smith")
      expect(json["donor"]["displayable_email"]).to eq("jane@example.com")
    end
  end
end

# spec/requests/api/children_spec.rb
RSpec.describe "Children API", type: :request do
  describe "GET /api/children?include_sponsorships=true" do
    it "returns children with sponsorships using presenter" do
      child = create(:child, name: "Maria")
      sponsorship = create(:sponsorship, child: child, monthly_amount: 50)

      get "/api/children", params: { include_sponsorships: true }

      json = JSON.parse(response.body)
      expect(json["children"].first["sponsorships"]).to be_present
      expect(json["children"].first["sponsorships"].first).to have_key("donor_name")
    end
  end
end
```

### Benefits

- ✅ **Consistency**: All endpoints use same response format
- ✅ **Predictability**: Frontend knows exactly what to expect
- ✅ **Maintainability**: Easy to add computed fields (in presenter)
- ✅ **DRY**: No manual serialization logic in controllers
- ✅ **Extensibility**: Presenters can be enhanced without controller changes
- ✅ **Type Safety**: TypeScript interfaces match presenter output
- ✅ **Testability**: Presenters tested separately from controllers

### Files to Modify

**Controllers (4 files):**
- `app/controllers/api/donors_controller.rb` - Fix show, create, update (3 actions)
- `app/controllers/api/children_controller.rb` - Fix show, create, update, index (4 actions)
- `app/controllers/api/donations_controller.rb` - Fix show, create (2 actions)
- `app/controllers/api/projects_controller.rb` - Already correct ✅

**Presenters (2 files):**
- `app/presenters/child_presenter.rb` - Add options support for sponsorships
- `app/presenters/collection_presenter.rb` - Accept and pass options

**Tests (3 files):**
- `spec/requests/api/donors_spec.rb` - Update expectations (wrapped responses)
- `spec/requests/api/children_spec.rb` - Update expectations
- `spec/requests/api/donations_spec.rb` - Update expectations

### Migration Notes

**Breaking Changes:**
- Response structure changes from `donor` to `{ donor: {...} }`
- Frontend already handles both formats (optional chaining)
- No frontend changes required

**Backwards Compatibility:**
- Could add temporary support for both formats if needed
- Not recommended - better to fix inconsistency cleanly

### Related Tickets
- ✅ TICKET-029: Implement Presenter Pattern (established pattern)
- 📋 TICKET-034: Query Objects (will use updated ChildrenController pattern)
- Part of code quality improvement initiative (CODE_SMELL_ANALYSIS.md)

### Notes
- This fixes 60% inconsistency rate → 100% consistency
- All `index` actions already correct (CollectionPresenter)
- DonationPresenter might need `displayable_email` equivalent fields
- Consider adding `as_json` test coverage to all presenters after this change

---

**Estimated Time:** 2-3 hours
- Controller updates: 1 hour
- Presenter enhancements: 30 minutes
- Test updates: 1 hour
- Manual verification: 30 minutes
