## [TICKET-098] Evaluate Form Objects Pattern (Research)

**Status:** 📋 Planned (Research Only)
**Priority:** 🟢 Low
**Effort:** S (Small - Research & Recommendation)
**Created:** 2025-11-11
**Dependencies:** None

### User Story
As a developer, I want to evaluate whether Form Objects pattern would benefit our codebase so that complex form validations and business logic are properly encapsulated.

### Problem Statement
Currently, form validation logic is split between:
- Frontend component validation (React forms)
- Backend model validation (ActiveRecord validations)
- Backend controller params filtering (strong parameters)

For complex forms with cross-model validations or business logic, this can become difficult to maintain.

**Research Question:** Would Form Objects pattern improve our codebase, or are current patterns sufficient?

### What are Form Objects?

Form Objects are Plain Old Ruby Objects (POROs) that encapsulate form-specific logic, validations, and persistence.

**Example:**
```ruby
# app/forms/sponsorship_creation_form.rb
class SponsorshipCreationForm
  include ActiveModel::Model
  include ActiveModel::Validations

  attr_accessor :donor_id, :child_id, :monthly_amount, :start_date

  validates :donor_id, :child_id, :monthly_amount, presence: true
  validates :monthly_amount, numericality: { greater_than: 0 }
  validate :no_duplicate_active_sponsorship

  def save
    return false unless valid?

    ActiveRecord::Base.transaction do
      create_sponsorship
      send_notification_email
      create_audit_log
    end

    true
  rescue ActiveRecord::RecordInvalid => e
    errors.add(:base, e.message)
    false
  end

  private

  def no_duplicate_active_sponsorship
    if Sponsorship.active.exists?(donor_id: donor_id, child_id: child_id)
      errors.add(:base, "Active sponsorship already exists")
    end
  end

  def create_sponsorship
    Sponsorship.create!(
      donor_id: donor_id,
      child_id: child_id,
      monthly_amount: monthly_amount,
      start_date: start_date
    )
  end

  def send_notification_email
    # Email logic
  end

  def create_audit_log
    # Audit log logic
  end
end

# Controller becomes thin:
def create
  form = SponsorshipCreationForm.new(form_params)

  if form.save
    render json: { sponsorship: form.sponsorship }, status: :created
  else
    render json: { errors: form.errors.full_messages }, status: :unprocessable_entity
  end
end
```

### When Form Objects Make Sense

**✅ Good Use Cases:**
1. Multi-model forms (e.g., create User + Profile + Settings in one form)
2. Complex business validations (e.g., sponsorship creation with duplicate checks)
3. Forms with side effects (e.g., send email, create audit log, update cache)
4. Wizards/multi-step forms
5. Virtual attributes that don't map directly to models

**❌ Bad Use Cases:**
1. Simple CRUD forms (use models directly)
2. Forms that map 1:1 to a single model (use model validations)
3. When validations belong in the model (domain logic)

### Current State Analysis

#### Forms in Our Codebase

**1. DonorForm (Frontend)**
- Simple create/update for Donor model
- **Verdict:** No need for Form Object - model validations sufficient

**2. DonationForm (Frontend)**
- Creates Donation with donor/project associations
- Has `child_id` virtual attribute for auto-sponsorship creation
- **Verdict:** ⚠️ Potential candidate - has business logic in model callbacks

**3. SponsorshipForm (Frontend)**
- Creates Sponsorship with donor/child associations
- Has duplicate sponsorship validation
- **Verdict:** ⚠️ Potential candidate - duplicate check is complex

**4. ChildForm (Frontend)**
- Simple create/update for Child model
- **Verdict:** No need for Form Object - model validations sufficient

**5. ProjectForm (Frontend)**
- Simple create/update for Project model
- **Verdict:** No need for Form Object - model validations sufficient

#### Current Validation Complexity

**Donation Model:**
```ruby
class Donation < ApplicationRecord
  attr_accessor :child_id  # Virtual attribute

  before_create :restore_archived_associations
  before_create :auto_create_sponsorship_from_child_id  # ⚠️ Business logic in callback

  validates :amount, presence: true, numericality: { greater_than: 0 }
  validates :date, presence: true
  validate :date_not_in_future
  validate :sponsorship_project_must_have_sponsorship_id
end
```

**Analysis:**
- `auto_create_sponsorship_from_child_id` is complex business logic
- Could be extracted to Form Object if this grows more complex
- **Current state:** Manageable with callbacks, but watch for growth

**Sponsorship Model:**
```ruby
class Sponsorship < ApplicationRecord
  validates :monthly_amount, presence: true, numericality: { greater_than_or_equal_to: 0 }
  validate :no_duplicate_active_sponsorships  # ⚠️ Complex validation

  before_validation :create_sponsorship_project, on: :create  # ⚠️ Business logic
  before_create :restore_archived_associations
end
```

**Analysis:**
- `no_duplicate_active_sponsorships` is a custom validation that queries database
- `create_sponsorship_project` is business logic in callback
- **Potential Form Object:** `SponsorshipCreationForm` could encapsulate this

### Acceptance Criteria (Research Phase)
- [ ] Review all existing forms in codebase
- [ ] Identify forms with complex validations or business logic
- [ ] Evaluate gems: `reform`, `dry-validation`, or plain PORO
- [ ] Create proof-of-concept Form Object for one complex form
- [ ] Compare readability, testability, and maintainability
- [ ] Document recommendation in this ticket
- [ ] Update CLAUDE.md if pattern is adopted

### Research Approach

#### Phase 1: Gem Evaluation

**Option A: Plain PORO with ActiveModel::Model**
```ruby
class SponsorshipCreationForm
  include ActiveModel::Model
  include ActiveModel::Validations

  # Pros: No dependencies, simple, Rails-native
  # Cons: Manual attribute definition, boilerplate
end
```

**Option B: Reform Gem**
```ruby
class SponsorshipCreationForm < Reform::Form
  property :donor_id
  property :child_id
  property :monthly_amount

  validates :monthly_amount, presence: true

  # Pros: Less boilerplate, designed for this use case
  # Cons: External dependency, learning curve
end
```

**Option C: dry-validation**
```ruby
class SponsorshipCreationContract < Dry::Validation::Contract
  params do
    required(:donor_id).filled(:integer)
    required(:child_id).filled(:integer)
    required(:monthly_amount).filled(:integer)
  end

  # Pros: Powerful, functional, type-safe
  # Cons: Steep learning curve, different paradigm
end
```

**Recommendation:** Start with **Option A (PORO)** - Rails-native, no dependencies, easy to understand.

#### Phase 2: Proof of Concept

Create `SponsorshipCreationForm` as proof-of-concept:

```ruby
# app/forms/sponsorship_creation_form.rb
class SponsorshipCreationForm
  include ActiveModel::Model
  include ActiveModel::Validations

  attr_accessor :donor_id, :child_id, :monthly_amount, :start_date
  attr_reader :sponsorship

  validates :donor_id, :child_id, :monthly_amount, presence: true
  validates :monthly_amount, numericality: { greater_than: 0 }
  validate :no_duplicate_active_sponsorship
  validate :donor_and_child_exist

  def save
    return false unless valid?

    ActiveRecord::Base.transaction do
      @sponsorship = create_sponsorship
      restore_archived_associations
      create_or_find_sponsorship_project
    end

    true
  rescue ActiveRecord::RecordInvalid => e
    errors.add(:base, e.message)
    false
  end

  private

  def no_duplicate_active_sponsorship
    if Sponsorship.active.exists?(
      donor_id: donor_id,
      child_id: child_id,
      monthly_amount: monthly_amount
    )
      errors.add(:base, "#{child_name} is already actively sponsored by #{donor_name}")
    end
  end

  def donor_and_child_exist
    errors.add(:donor_id, "must exist") unless Donor.exists?(donor_id)
    errors.add(:child_id, "must exist") unless Child.exists?(child_id)
  end

  def create_sponsorship
    Sponsorship.create!(
      donor_id: donor_id,
      child_id: child_id,
      monthly_amount: monthly_amount,
      start_date: start_date || Date.current
    )
  end

  def restore_archived_associations
    @sponsorship.donor.undiscard if @sponsorship.donor&.discarded?
    @sponsorship.child.undiscard if @sponsorship.child&.discarded?
  end

  def create_or_find_sponsorship_project
    # Logic from Sponsorship model
  end

  def child_name
    Child.find_by(id: child_id)&.name
  end

  def donor_name
    Donor.find_by(id: donor_id)&.name
  end
end
```

**Test Comparison:**
```ruby
# Before (Model tests):
RSpec.describe Sponsorship do
  it "validates no duplicate active sponsorships" do
    create(:sponsorship, donor: donor, child: child)
    duplicate = build(:sponsorship, donor: donor, child: child)

    expect(duplicate).not_to be_valid
    expect(duplicate.errors[:base]).to include(/already actively sponsored/)
  end
end

# After (Form Object tests):
RSpec.describe SponsorshipCreationForm do
  describe "validations" do
    it "prevents duplicate active sponsorships" do
      create(:sponsorship, donor: donor, child: child, monthly_amount: 5000)

      form = SponsorshipCreationForm.new(
        donor_id: donor.id,
        child_id: child.id,
        monthly_amount: 5000
      )

      expect(form.valid?).to be false
      expect(form.errors[:base]).to include(/already actively sponsored/)
    end
  end

  describe "#save" do
    it "creates sponsorship and restores archived associations" do
      child.discard

      form = SponsorshipCreationForm.new(
        donor_id: donor.id,
        child_id: child.id,
        monthly_amount: 5000
      )

      expect { form.save }.to change(Sponsorship, :count).by(1)
      expect(child.reload).not_to be_discarded
    end
  end
end
```

#### Phase 3: Evaluate Trade-offs

**Pros of Form Objects:**
- ✅ Encapsulate complex form logic
- ✅ Keep models focused on domain logic
- ✅ Easier to test (no database required for validation tests)
- ✅ Better separation of concerns
- ✅ Reusable across controllers (API vs Web UI)

**Cons of Form Objects:**
- ❌ Additional layer of abstraction
- ❌ More files to maintain
- ❌ Duplication if form matches model 1:1
- ❌ Team needs to learn pattern

### Decision Matrix

| Criteria | Current (Model Validations) | Form Objects |
|----------|----------------------------|--------------|
| Simple CRUD | ✅ Perfect | ❌ Overkill |
| Complex Multi-Step | ❌ Callbacks messy | ✅ Clean |
| Testability | ⚠️ Requires DB | ✅ Fast unit tests |
| Learning Curve | ✅ Known pattern | ⚠️ New pattern |
| Code Organization | ⚠️ Fat models | ✅ Thin models |

### Recommendation (To Be Determined)

**After proof-of-concept:**
1. If Form Object is cleaner → Document pattern in CLAUDE.md, create TICKET to refactor Sponsorship
2. If current pattern is sufficient → Close ticket, document decision

### Files to Create (If Adopted)
- `app/forms/` directory (NEW)
- `app/forms/application_form.rb` (NEW - base class)
- `app/forms/sponsorship_creation_form.rb` (NEW - proof of concept)
- `spec/forms/sponsorship_creation_form_spec.rb` (NEW)

### Files to Modify (If Adopted)
- `app/models/sponsorship.rb` (REFACTOR - remove business logic from callbacks)
- `app/controllers/api/sponsorships_controller.rb` (UPDATE - use form object)
- `CLAUDE.md` (ADD Form Objects pattern section)

### Related Tickets
- Part of CODE_SMELL_ANALYSIS initiative
- May inform TICKET-037 (Service Object patterns)
- Identified in code smell review on 2025-11-11

### Notes
- This is a **research ticket only** - no implementation required yet
- Goal: Evaluate if pattern is beneficial for our use case
- If beneficial, create follow-up ticket for implementation
- If not beneficial, document why and close ticket
- Pattern commonly used in complex Rails apps, but not always necessary for simpler apps
- **Next Step:** Create proof-of-concept and compare with current approach
