## [TICKET-061] Auto-Create Sponsorship When Donation to Sponsorship Project Recorded

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Effort:** M (Medium - 2-3 hours)
**Created:** 2025-10-23
**Dependencies:** TICKET-010 (Sponsorship model) ✅, TICKET-056 (Sponsorship validation) ✅

### User Story
As a user recording a donation, when I select a sponsorship-type project (e.g., "Sponsor Maria"), I want the system to automatically create the sponsorship record if it doesn't already exist, so that I don't have to manually create sponsorships in a separate workflow.

### Problem Statement
**Current Behavior:**
- User can select sponsorship-type projects in DonationForm
- Donation gets recorded with `project_id` correctly
- But no `Sponsorship` record is created automatically
- User must manually go to Children or Sponsorships page to create the sponsorship
- Creates data inconsistency: donations exist for sponsorship projects without corresponding sponsorship records

**Desired Behavior:**
- When donation recorded to sponsorship-type project, auto-create `Sponsorship` if needed
- Monthly amount set to donation amount
- If sponsorship already exists, do nothing (just record donation)
- Maintains data consistency: every sponsorship project has corresponding sponsorship record

### Acceptance Criteria

#### Backend Business Logic
- [x] When donation created with `project_id` of type `sponsorship`:
  - [x] Find child associated with project via existing sponsorships
  - [x] Check if active sponsorship exists for `donor_id` + `child_id`
  - [x] If NO: Create `Sponsorship(donor_id, child_id, monthly_amount: donation.amount, project_id)`
  - [x] If YES: Do nothing (donation still recorded)
- [x] Transaction-safe: Sponsorship creation failure rolls back donation
- [x] Idempotent: Multiple donations to same project don't create duplicate sponsorships

#### Edge Cases Handled
- [x] Project has no existing sponsorships (cannot determine child) → Log warning, skip sponsorship creation
- [x] Project has multiple children linked → Use first active sponsorship's child (or error)
- [x] Donor already sponsors this child → Do nothing, record donation only
- [x] Sponsorship validation fails → Log error, still record donation (or fail transaction?)

### Technical Implementation

#### Backend Changes

**1. Add after_create callback to Donation model:**

```ruby
# app/models/donation.rb
class Donation < ApplicationRecord
  belongs_to :donor
  belongs_to :project, optional: true

  after_create :auto_create_sponsorship_if_needed

  private

  def auto_create_sponsorship_if_needed
    return unless project&.project_type_sponsorship?

    # Find child associated with this sponsorship project
    child = project.sponsorships.first&.child
    return unless child

    # Check if sponsorship already exists
    existing = Sponsorship.active.exists?(
      donor_id: donor_id,
      child_id: child.id
    )
    return if existing

    # Create new sponsorship
    Sponsorship.create!(
      donor_id: donor_id,
      child_id: child.id,
      monthly_amount: amount,
      project_id: project.id
    )
  rescue ActiveRecord::RecordInvalid => e
    Rails.logger.warn "Failed to auto-create sponsorship: #{e.message}"
    # Decision: Do not fail donation creation if sponsorship fails
  end
end
```

**Alternative Approach: Service Object**

```ruby
# app/services/donation_creation_service.rb
class DonationCreationService
  def initialize(donation_params)
    @params = donation_params
  end

  def call
    ActiveRecord::Base.transaction do
      donation = Donation.create!(@params)
      auto_create_sponsorship(donation) if sponsorship_project?(donation)
      donation
    end
  end

  private

  def sponsorship_project?(donation)
    donation.project&.project_type_sponsorship?
  end

  def auto_create_sponsorship(donation)
    child = donation.project.sponsorships.first&.child
    return unless child

    unless Sponsorship.active.exists?(donor_id: donation.donor_id, child_id: child.id)
      Sponsorship.create!(
        donor_id: donation.donor_id,
        child_id: child.id,
        monthly_amount: donation.amount,
        project_id: donation.project_id
      )
    end
  end
end
```

**2. Update DonationsController to use service (if using service approach):**

```ruby
# app/controllers/api/donations_controller.rb
def create
  donation = DonationCreationService.new(donation_params).call
  render json: DonationPresenter.new(donation).as_json, status: :created
rescue ActiveRecord::RecordInvalid => e
  render json: { errors: e.record.errors }, status: :unprocessable_entity
end
```

#### Testing Strategy

**Model Tests (RSpec):**

```ruby
# spec/models/donation_spec.rb
describe "#auto_create_sponsorship_if_needed" do
  let(:donor) { create(:donor) }
  let(:child) { create(:child) }
  let(:sponsorship_project) { create(:project, project_type: :sponsorship) }
  let!(:existing_sponsorship) { create(:sponsorship, child: child, project: sponsorship_project) }

  context "when donation is for sponsorship project" do
    it "creates sponsorship if donor does not already sponsor child" do
      expect {
        create(:donation, donor: donor, project: sponsorship_project, amount: 100)
      }.to change(Sponsorship, :count).by(1)

      new_sponsorship = Sponsorship.last
      expect(new_sponsorship.donor_id).to eq(donor.id)
      expect(new_sponsorship.child_id).to eq(child.id)
      expect(new_sponsorship.monthly_amount).to eq(100)
    end

    it "does not create duplicate sponsorship if donor already sponsors child" do
      create(:sponsorship, donor: donor, child: child, project: sponsorship_project)

      expect {
        create(:donation, donor: donor, project: sponsorship_project, amount: 100)
      }.not_to change(Sponsorship, :count)
    end

    it "does not create sponsorship if project has no linked child" do
      orphan_project = create(:project, project_type: :sponsorship)

      expect {
        create(:donation, donor: donor, project: orphan_project, amount: 100)
      }.not_to change(Sponsorship, :count)
    end
  end

  context "when donation is NOT for sponsorship project" do
    let(:general_project) { create(:project, project_type: :general) }

    it "does not create sponsorship" do
      expect {
        create(:donation, donor: donor, project: general_project, amount: 100)
      }.not_to change(Sponsorship, :count)
    end
  end

  context "when donation has no project" do
    it "does not create sponsorship" do
      expect {
        create(:donation, donor: donor, project: nil, amount: 100)
      }.not_to change(Sponsorship, :count)
    end
  end
end
```

**Integration Tests (RSpec Request):**

```ruby
# spec/requests/api/donations_spec.rb
describe "POST /api/donations with sponsorship project" do
  let(:donor) { create(:donor) }
  let(:child) { create(:child) }
  let(:sponsorship_project) { create(:project, project_type: :sponsorship) }
  let!(:existing_sponsorship) { create(:sponsorship, child: child, project: sponsorship_project) }

  it "creates both donation and sponsorship when donor has no active sponsorship" do
    expect {
      post '/api/donations', params: {
        donation: {
          donor_id: donor.id,
          project_id: sponsorship_project.id,
          amount: 150,
          date: Date.today
        }
      }
    }.to change(Donation, :count).by(1)
     .and change(Sponsorship, :count).by(1)

    expect(response).to have_http_status(:created)
  end

  it "creates only donation when sponsorship already exists" do
    create(:sponsorship, donor: donor, child: child, project: sponsorship_project)

    expect {
      post '/api/donations', params: {
        donation: {
          donor_id: donor.id,
          project_id: sponsorship_project.id,
          amount: 150,
          date: Date.today
        }
      }
    }.to change(Donation, :count).by(1)
     .and change(Sponsorship, :count).by(0)
  end
end
```

### Files to Create
- `tickets/TICKET-061-auto-create-sponsorship-from-donation.md`

### Files to Modify
- **Backend:**
  - `app/models/donation.rb` - Add after_create callback
  - OR `app/services/donation_creation_service.rb` - New service object (if using service pattern)
  - OR `app/controllers/api/donations_controller.rb` - Use service if created
  - `spec/models/donation_spec.rb` - Add 5 new tests for auto-creation logic
  - `spec/requests/api/donations_spec.rb` - Add 2 integration tests
- **Frontend:** No changes required (transparent to user)

### Design Decisions

**Q: Should sponsorship creation failure fail the donation?**
- **Decision A (Recommended):** No - Log warning, record donation anyway
  - Rationale: Donation data integrity more important; user can manually create sponsorship later
- **Decision B:** Yes - Transaction rollback if sponsorship fails
  - Rationale: Maintain strict data consistency

**Q: How to determine child if project has multiple children?**
- **Current assumption:** One project per child (enforced by TICKET-056)
- **Fallback:** Use `project.sponsorships.first.child` (deterministic due to ID ordering)
- **Future:** Add explicit `project.child_id` foreign key if needed

**Q: What if donation amount differs from existing sponsorship's monthly_amount?**
- **Decision:** Use donation amount for new sponsorship
- **Rationale:** User explicitly chose this amount; reflects actual sponsorship commitment

### Edge Cases & Error Handling

1. **Project has no sponsorships:** Log warning, skip sponsorship creation
2. **Child not found:** Log warning, skip sponsorship creation
3. **Sponsorship validation fails:** Log error, do not fail donation (Decision A)
4. **Donor already sponsors child with different amount:** Do nothing, record donation only
5. **Concurrent donations creating duplicate sponsorships:** Database uniqueness constraint prevents (TICKET-056)

### Related Tickets
- ✅ TICKET-010: Children & Sponsorship tracking (backend complete)
- ✅ TICKET-056: Sponsorship uniqueness validation (prevents duplicates)
- 📋 TICKET-052: Improve sponsorship donation linking (frontend UX)
- 📋 TICKET-061: This ticket (auto-create backend logic)

### Success Metrics
- Reduced manual sponsorship creation steps
- Improved data consistency (donations ↔ sponsorships)
- Zero duplicate sponsorships created (validated by TICKET-056)

---

*This ticket implements automatic sponsorship creation to improve data consistency and reduce manual workflow steps.*
