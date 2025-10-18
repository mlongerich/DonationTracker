## [TICKET-033] Implement Policy Objects for Authorization

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Effort:** M (Medium)
**Created:** 2025-10-18
**Dependencies:** None

### User Story
As a developer, I want to centralize authorization logic into Policy Objects so that permission checks are consistent, testable, and maintainable across the application.

### Problem Statement
Authorization logic is currently scattered throughout controllers:
- Environment-based checks inline in controllers (DonorsController:71 - production check)
- No consistent pattern for permission checks
- Authorization logic mixed with business logic

**Code Smell:** Authorization scattered across controllers, no single source of truth
**Issue:** Hard to audit permissions, difficult to test, prone to inconsistency

### Acceptance Criteria
- [ ] Install and configure Pundit gem for policy-based authorization
- [ ] Create base `ApplicationPolicy` class
- [ ] Create `DonorPolicy` with permission rules
- [ ] Create `DonationPolicy` with permission rules
- [ ] Refactor `DonorsController` to use policies
- [ ] Refactor `DonationsController` to use policies
- [ ] Add comprehensive policy specs
- [ ] All existing tests pass
- [ ] Update CLAUDE.md with Policy Objects pattern documentation

### Technical Approach

#### 1. Install Pundit

```ruby
# Gemfile
gem 'pundit'

# Bundle install
bundle install

# Generate pundit installation
rails generate pundit:install
```

#### 2. Include Pundit in ApplicationController

```ruby
# app/controllers/application_controller.rb
class ApplicationController < ActionController::API
  include Pundit::Authorization

  rescue_from Pundit::NotAuthorizedError, with: :user_not_authorized

  private

  def user_not_authorized
    render json: { error: "You are not authorized to perform this action" },
           status: :forbidden
  end
end
```

#### 3. Create ApplicationPolicy

```ruby
# app/policies/application_policy.rb
class ApplicationPolicy
  attr_reader :user, :record

  def initialize(user, record)
    @user = user
    @record = record
  end

  def index?
    false
  end

  def show?
    false
  end

  def create?
    false
  end

  def update?
    false
  end

  def destroy?
    false
  end

  class Scope
    def initialize(user, scope)
      @user = user
      @scope = scope
    end

    def resolve
      raise NotImplementedError, "You must define #resolve in #{self.class}"
    end

    private

    attr_reader :user, :scope
  end
end
```

#### 4. Create DonorPolicy

```ruby
# app/policies/donor_policy.rb
class DonorPolicy < ApplicationPolicy
  def index?
    true # Anyone can view donors (adjust based on auth requirements)
  end

  def show?
    true
  end

  def create?
    true # Adjust when authentication is implemented (TICKET-008)
  end

  def update?
    true
  end

  def destroy?
    true
  end

  def restore?
    true
  end

  def merge?
    true
  end

  def destroy_all?
    # Only allow in non-production environments
    !Rails.env.production?
  end

  class Scope < ApplicationPolicy::Scope
    def resolve
      scope.all # Adjust based on user permissions
    end
  end
end
```

#### 5. Create DonationPolicy

```ruby
# app/policies/donation_policy.rb
class DonationPolicy < ApplicationPolicy
  def index?
    true
  end

  def show?
    true
  end

  def create?
    true
  end

  def update?
    owner? || admin?
  end

  def destroy?
    owner? || admin?
  end

  private

  def owner?
    # For now, always true. Adjust when authentication implemented
    true
  end

  def admin?
    # For now, check environment. Adjust when user roles implemented
    !Rails.env.production?
  end
end
```

#### 6. Refactor Controllers to Use Policies

**DonorsController:**
```ruby
class Api::DonorsController < ApplicationController
  def index
    # Use policy scope for filtering based on permissions
    authorize Donor
    scope = policy_scope(Donor)
    scope = params[:include_discarded] == "true" ? scope.with_discarded : scope.kept
    # ... rest of index logic
  end

  def create
    donor = Donor.new(donor_params)
    authorize donor
    # ... rest of create logic
  end

  def update
    donor = Donor.find(params[:id])
    authorize donor
    # ... rest of update logic
  end

  def destroy
    donor = Donor.find(params[:id])
    authorize donor
    donor.discard
    head :no_content
  end

  def restore
    donor = Donor.with_discarded.find(params[:id])
    authorize donor
    donor.undiscard
    render json: donor, status: :ok
  end

  def merge
    # Authorize all donors being merged
    donors = Donor.where(id: params[:donor_ids])
    donors.each { |donor| authorize donor, :merge? }

    result = DonorMergeService.new(
      donor_ids: params[:donor_ids].map(&:to_i),
      field_selections: params[:field_selections].to_unsafe_h.symbolize_keys.transform_values(&:to_i)
    ).merge

    render json: result[:merged_donor], status: :ok
  end

  def destroy_all
    authorize Donor, :destroy_all?

    count = Donor.count
    Donor.destroy_all

    render json: { deleted_count: count }, status: :ok
  end
end
```

**DonationsController:**
```ruby
class Api::DonationsController < ApplicationController
  def index
    authorize Donation
    scope = policy_scope(Donation).includes(:donor)
    # ... rest of index logic
  end

  def create
    donation = Donation.new(donation_params)
    authorize donation
    # ... rest of create logic
  end

  def show
    donation = Donation.find(params[:id])
    authorize donation
    render json: donation, status: :ok
  end
end
```

### Benefits
- **Centralized Authorization**: All permission logic in one place per model
- **Testability**: Policies can be unit tested independently
- **Consistency**: Same authorization pattern across all controllers
- **Auditability**: Easy to review and understand permissions
- **Future-Ready**: Easy to add role-based or attribute-based access control
- **Rails Convention**: Pundit is industry standard for Rails authorization

### Testing Strategy

```ruby
# spec/policies/donor_policy_spec.rb
RSpec.describe DonorPolicy do
  subject { described_class.new(user, donor) }

  let(:user) { nil } # Adjust when authentication implemented
  let(:donor) { build(:donor) }

  context "permissions" do
    it { is_expected.to permit_action(:index) }
    it { is_expected.to permit_action(:show) }
    it { is_expected.to permit_action(:create) }
    it { is_expected.to permit_action(:update) }
    it { is_expected.to permit_action(:destroy) }
    it { is_expected.to permit_action(:restore) }
    it { is_expected.to permit_action(:merge) }
  end

  describe "#destroy_all?" do
    context "in production environment" do
      before { allow(Rails).to receive(:env).and_return(ActiveSupport::StringInquirer.new("production")) }

      it "denies access" do
        expect(subject.destroy_all?).to be false
      end
    end

    context "in development environment" do
      before { allow(Rails).to receive(:env).and_return(ActiveSupport::StringInquirer.new("development")) }

      it "allows access" do
        expect(subject.destroy_all?).to be true
      end
    end

    context "in test environment" do
      it "allows access" do
        expect(subject.destroy_all?).to be true
      end
    end
  end
end

# spec/policies/donation_policy_spec.rb
RSpec.describe DonationPolicy do
  subject { described_class.new(user, donation) }

  let(:user) { nil }
  let(:donation) { build(:donation) }

  context "permissions" do
    it { is_expected.to permit_action(:index) }
    it { is_expected.to permit_action(:show) }
    it { is_expected.to permit_action(:create) }
    it { is_expected.to permit_action(:update) }
    it { is_expected.to permit_action(:destroy) }
  end
end
```

#### Request Specs (Integration Tests)
```ruby
# spec/requests/api/donors_spec.rb
RSpec.describe "DELETE /api/donors/destroy_all" do
  context "in production environment" do
    before { allow(Rails).to receive(:env).and_return(ActiveSupport::StringInquirer.new("production")) }

    it "returns forbidden status" do
      delete "/api/donors/destroy_all"
      expect(response).to have_http_status(:forbidden)
      expect(response.parsed_body["error"]).to include("not authorized")
    end
  end

  context "in test environment" do
    it "deletes all donors" do
      create_list(:donor, 3)
      delete "/api/donors/destroy_all"
      expect(response).to have_http_status(:ok)
      expect(Donor.count).to eq(0)
    end
  end
end
```

### Pundit Matcher Setup

```ruby
# spec/support/pundit_matchers.rb
require "pundit/rspec"

RSpec.configure do |config|
  config.include Pundit::RSpec::Matchers, type: :policy
end
```

### Files to Create
- `app/policies/application_policy.rb` (NEW)
- `app/policies/donor_policy.rb` (NEW)
- `app/policies/donation_policy.rb` (NEW)
- `spec/policies/donor_policy_spec.rb` (NEW)
- `spec/policies/donation_policy_spec.rb` (NEW)
- `spec/support/pundit_matchers.rb` (NEW)

### Files to Modify
- `Gemfile` (ADD pundit gem)
- `app/controllers/application_controller.rb` (MODIFY - include Pundit)
- `app/controllers/api/donors_controller.rb` (REFACTOR - use policies)
- `app/controllers/api/donations_controller.rb` (REFACTOR - use policies)
- `spec/requests/api/donors_spec.rb` (UPDATE - test authorization)
- `spec/requests/api/donations_spec.rb` (UPDATE - test authorization)
- `CLAUDE.md` (UPDATE - add Policy Objects pattern)

### Future Enhancements (Post-Authentication)
When TICKET-008 (Authentication) is complete:
- Add user roles (admin, user, viewer)
- Implement user-specific scopes
- Add ownership checks (users can only edit their own donations)
- Add admin-only operations (merge, bulk delete)
- Add policy-based API rate limiting

### Policy Evolution Example
```ruby
# Future state after authentication
class DonorPolicy < ApplicationPolicy
  def update?
    user.admin? || owner?
  end

  def destroy?
    user.admin?
  end

  def merge?
    user.admin?
  end

  private

  def owner?
    record.created_by_id == user.id
  end
end
```

### Related Tickets
- Prerequisite for TICKET-008 (Authentication - will need user context)
- Part of code quality improvement initiative
- Enables role-based access control in future

### Notes
- Policies work with `nil` user for now (public access)
- When authentication implemented, pass `current_user` to policies
- Pundit automatically finds policies based on model name
- `authorize` raises exception if unauthorized (caught by ApplicationController)
- `policy_scope` filters collections based on permissions
