## [TICKET-068] Global Error Handling in ApplicationController

**Status:** ✅ Complete
**Priority:** 🟡 Medium
**Effort:** S (Small - 1-2 hours)
**Created:** 2025-10-31
**Completed:** 2025-11-04
**Dependencies:** None

### User Story
As a developer, I want consistent error handling across all API endpoints so that I don't have to write the same error handling logic in every controller action and users receive predictable error responses.

### Problem Statement

**Code Smell: Inconsistent Error Handling**

Controllers handle errors in **4 different ways**:

```ruby
# Pattern 1: No error handling (relies on exceptions) ❌
def create
  result = DonorService.find_or_update_by_email(donor_params, Time.current)
  render json: result[:donor]  # What if service raises exception?
end

# Pattern 2: Uses save! (raises exception, no rescue) ❌
def update
  donor.update!(donor_params)  # Raises ActiveRecord::RecordInvalid
  render json: donor
end

# Pattern 3: Uses save (checks boolean) ✅
def create
  if project.save
    render json: { project: ProjectPresenter.new(project).as_json }
  else
    render json: { errors: project.errors }, status: :unprocessable_entity
  end
end

# Pattern 4: Manual rescue (one-off) ⚠️
def destroy
  donor.discard
rescue ActiveRecord::RecordNotDestroyed
  render json: { error: "Cannot archive donor" }, status: :unprocessable_entity
end
```

**Issues:**
1. **No global exception handling** - uncaught exceptions crash requests
2. **Inconsistent error formats** - `{ errors: [...] }` vs `{ error: "..." }`
3. **Repetitive code** - if/else blocks in every create/update action
4. **Missing 404s** - `find` can raise `RecordNotFound`, but no rescue

**Impact:**
- API returns 500 errors instead of proper 4xx responses
- Error messages inconsistent across endpoints
- Controllers bloated with error handling boilerplate

### Acceptance Criteria

#### Global Exception Handlers
- [ ] Add `rescue_from ActiveRecord::RecordNotFound` → 404 response
- [ ] Add `rescue_from ActiveRecord::RecordInvalid` → 422 response
- [ ] Add `rescue_from ActionController::ParameterMissing` → 400 response
- [ ] All handlers return consistent JSON format: `{ error: "message" }` or `{ errors: [...] }`

#### Error Response Format
- [ ] Single error: `{ error: "Resource not found" }`
- [ ] Multiple errors: `{ errors: ["Field is required", "Field is invalid"] }`
- [ ] Status codes: 400 (bad request), 404 (not found), 422 (validation)

#### Controllers Simplified
- [ ] All controllers can use `save!` / `update!` / `find` without rescue blocks
- [ ] Remove manual if/else error handling (let global handlers catch)
- [ ] Exception-based flow (cleaner than boolean checks)

#### Testing
- [ ] Request specs verify proper error responses
- [ ] 404 errors return correct format
- [ ] Validation errors return correct format
- [ ] All existing tests pass

### Technical Approach

#### 1. Add Global Handlers to ApplicationController

```ruby
# app/controllers/application_controller.rb
class ApplicationController < ActionController::API
  # Global exception handlers
  rescue_from ActiveRecord::RecordNotFound, with: :render_not_found
  rescue_from ActiveRecord::RecordInvalid, with: :render_unprocessable_entity
  rescue_from ActionController::ParameterMissing, with: :render_bad_request

  private

  def render_not_found(exception)
    render json: { error: exception.message }, status: :not_found
  end

  def render_unprocessable_entity(exception)
    render json: {
      errors: exception.record.errors.full_messages
    }, status: :unprocessable_entity
  end

  def render_bad_request(exception)
    render json: { error: exception.message }, status: :bad_request
  end
end
```

#### 2. Simplify Controllers (Before/After)

**DonorsController - Before:**
```ruby
def create
  donor_params = params.require(:donor).permit(:name, :email)
  result = DonorService.find_or_update_by_email(donor_params, Time.current)
  status = result[:created] ? :created : :ok
  render json: result[:donor], status: status
  # ❌ No error handling - service exception crashes request
end

def update
  donor = Donor.find(params[:id])
  donor_params = params.require(:donor).permit(:name, :email)

  # Update with current timestamp
  donor.update!(donor_params.merge(last_updated_at: Time.current))
  render json: donor, status: :ok
  # ❌ update! raises exception, but no rescue
end

def destroy
  donor = Donor.find(params[:id])

  if donor.discard
    head :no_content
  else
    render json: { errors: donor.errors.full_messages }, status: :unprocessable_entity
  end
  # ⚠️ Works, but verbose
end
```

**DonorsController - After:**
```ruby
def create
  donor_params = params.require(:donor).permit(:name, :email)
  result = DonorService.find_or_update_by_email(donor_params, Time.current)
  status = result[:created] ? :created : :ok
  render json: { donor: DonorPresenter.new(result[:donor]).as_json }, status: status
  # ✅ Global handler catches service exceptions
end

def update
  donor = Donor.find(params[:id])
  donor_params = params.require(:donor).permit(:name, :email)

  donor.update!(donor_params.merge(last_updated_at: Time.current))
  render json: { donor: DonorPresenter.new(donor).as_json }, status: :ok
  # ✅ RecordInvalid caught by global handler → 422
end

def destroy
  donor = Donor.find(params[:id])
  donor.discard!  # Raises if fails
  head :no_content
  # ✅ Cleaner - exception handled globally
end
```

**ProjectsController - Before:**
```ruby
def create
  project = Project.new(project_params)

  if project.save
    render json: { project: ProjectPresenter.new(project).as_json }, status: :created
  else
    render json: { errors: project.errors }, status: :unprocessable_entity
  end
end
```

**ProjectsController - After:**
```ruby
def create
  project = Project.new(project_params)
  project.save!  # Raises RecordInvalid if validation fails
  render json: { project: ProjectPresenter.new(project).as_json }, status: :created
  # ✅ Validation errors caught by global handler → 422
end
```

#### 3. Update Models to Support save!/update! Pattern

Most models already support this (Rails default). Just verify:

```ruby
# app/models/donor.rb
# No changes needed - ActiveRecord::RecordInvalid raised automatically
validates :name, presence: true
validates :email, presence: true
```

### Error Response Examples

#### 404 Not Found
```ruby
GET /api/donors/99999

{
  "error": "Couldn't find Donor with 'id'=99999"
}
```

#### 422 Validation Error
```ruby
POST /api/donors
{ "donor": { "name": "" } }

{
  "errors": [
    "Name can't be blank",
    "Email can't be blank"
  ]
}
```

#### 400 Bad Request
```ruby
POST /api/donors
{ "invalid": {} }  # Missing required 'donor' param

{
  "error": "param is missing or the value is empty: donor"
}
```

### Testing Strategy

#### Add Error Handling Tests

```ruby
# spec/requests/api/donors_spec.rb
RSpec.describe "Donors API", type: :request do
  describe "GET /api/donors/:id" do
    it "returns 404 for non-existent donor" do
      get "/api/donors/99999"

      expect(response).to have_http_status(:not_found)
      json = JSON.parse(response.body)
      expect(json["error"]).to include("Couldn't find Donor")
    end
  end

  describe "POST /api/donors" do
    it "returns 422 for validation errors" do
      post "/api/donors", params: { donor: { name: "", email: "" } }

      expect(response).to have_http_status(:unprocessable_entity)
      json = JSON.parse(response.body)
      expect(json["errors"]).to include("Name can't be blank")
      expect(json["errors"]).to include("Email can't be blank")
    end

    it "returns 400 for missing donor param" do
      post "/api/donors", params: { invalid: {} }

      expect(response).to have_http_status(:bad_request)
      json = JSON.parse(response.body)
      expect(json["error"]).to include("param is missing")
    end
  end

  describe "PUT /api/donors/:id" do
    it "returns 422 for update validation errors" do
      donor = create(:donor)

      put "/api/donors/#{donor.id}", params: { donor: { email: "invalid" } }

      expect(response).to have_http_status(:unprocessable_entity)
      json = JSON.parse(response.body)
      expect(json["errors"]).to be_present
    end
  end
end

# spec/requests/api/projects_spec.rb
RSpec.describe "Projects API", type: :request do
  describe "POST /api/projects" do
    it "returns 422 for validation errors with save!" do
      post "/api/projects", params: { project: { title: "" } }

      expect(response).to have_http_status(:unprocessable_entity)
      json = JSON.parse(response.body)
      expect(json["errors"]).to include("Title can't be blank")
    end
  end
end
```

### Benefits

- ✅ **Consistency**: All errors use same format across API
- ✅ **DRY**: No repetitive if/else blocks in controllers
- ✅ **Cleaner Code**: Controllers focus on happy path
- ✅ **Proper HTTP Codes**: 404, 422, 400 instead of 500
- ✅ **Centralized Logging**: Can add error tracking in one place
- ✅ **Testability**: Error handling tested once, not in every spec

### Files to Modify

**Controllers (1 file):**
- `app/controllers/application_controller.rb` - Add rescue_from handlers

**Controllers to Simplify (5 files):**
- `app/controllers/api/donors_controller.rb` - Remove if/else, use save!
- `app/controllers/api/children_controller.rb` - Remove if/else, use save!
- `app/controllers/api/projects_controller.rb` - Change save to save!
- `app/controllers/api/donations_controller.rb` - Change save to save!
- `app/controllers/api/sponsorships_controller.rb` - Change save to save!

**Tests (5 files):**
- `spec/requests/api/donors_spec.rb` - Add error handling tests
- `spec/requests/api/children_spec.rb` - Add error handling tests
- `spec/requests/api/projects_spec.rb` - Add error handling tests
- `spec/requests/api/donations_spec.rb` - Add error handling tests
- `spec/requests/api/sponsorships_spec.rb` - Add error handling tests

### Optional Enhancements

#### Add Error Logging (Future)

```ruby
class ApplicationController < ActionController::API
  rescue_from ActiveRecord::RecordNotFound, with: :render_not_found

  private

  def render_not_found(exception)
    log_error(exception)
    render json: { error: exception.message }, status: :not_found
  end

  def log_error(exception)
    Rails.logger.error("API Error: #{exception.class} - #{exception.message}")
    # Future: Send to error tracking service (Sentry, etc.)
  end
end
```

#### Add Custom Exception Classes (Future)

```ruby
# app/errors/authorization_error.rb
class AuthorizationError < StandardError; end

# app/controllers/application_controller.rb
rescue_from AuthorizationError, with: :render_forbidden

def render_forbidden(exception)
  render json: { error: exception.message }, status: :forbidden
end
```

### Related Tickets
- 📋 TICKET-036: React Error Boundary (frontend error handling)
- 📋 TICKET-063: Standardize Presenter Responses (complements this)
- Part of code quality improvement initiative (CODE_SMELL_ANALYSIS.md)

### Notes
- Rails already has some exception handling (500 errors)
- This adds **proper HTTP status codes** and **consistent JSON**
- Can add more `rescue_from` handlers as needed
- Consider adding `Pundit::NotAuthorizedError` when auth is implemented

---

**Estimated Time:** 1-2 hours
- ApplicationController updates: 30 minutes
- Controller simplification: 30 minutes
- Test updates: 30 minutes
- Manual verification: 30 minutes
