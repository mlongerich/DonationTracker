## [TICKET-038] Define Cascade Delete Strategy for Donations

**Status:** 📋 Planned
**Priority:** 🟢 Low
**Effort:** S (Small)
**Created:** 2025-10-18
**Dependencies:** None

### User Story
As a database administrator, I want a clear cascade delete strategy for donations so that referential integrity is maintained and data retention policies are explicit.

### Problem Statement
Currently, the relationship between donors and donations lacks an explicit cascade delete strategy:
- What happens to donations when a donor is soft-deleted?
- What happens to donations when a donor is permanently deleted?
- No documented data retention policy

**Database Smell:** Missing cascade behavior definition
**Issue:** Donor model has_many :donations with no dependent: option (donor.rb:5)

### Current Behavior Analysis

**Schema:**
```ruby
# donations table
t.bigint "donor_id", null: false  # Foreign key constraint exists
add_foreign_key "donations", "donors"
```

**Model:**
```ruby
class Donor < ApplicationRecord
  has_many :donations  # No dependent: option
end
```

**Current behavior when donor soft-deleted:**
- Donor.discard → Donor gets discarded_at timestamp
- Donations remain active, orphaned relationship
- Can still query donations.donor (returns discarded donor)

**Current behavior when donor hard-deleted:**
- Donor.destroy → Foreign key constraint violation error
- Cannot delete donor with associated donations

### Acceptance Criteria
- [ ] Decide on cascade delete strategy for soft deletes
- [ ] Decide on cascade delete strategy for hard deletes
- [ ] Implement chosen strategy in Donor model
- [ ] Add migration if database constraints needed
- [ ] Document data retention policy
- [ ] Add tests for cascade behavior
- [ ] All existing tests pass
- [ ] Update CLAUDE.md with data retention policy

### Technical Approach

#### Strategy Options

**Option 1: Restrict Delete (Recommended)**
```ruby
class Donor < ApplicationRecord
  has_many :donations, dependent: :restrict_with_error
end
```

**Pros:**
- Prevents accidental data loss
- Explicit - must handle donations first
- Clear audit trail

**Cons:**
- More complex to delete donors
- Requires cleanup workflow

**Use case:** Financial data should not be deleted casually

---

**Option 2: Nullify (Keep Donations, Remove Association)**
```ruby
class Donor < ApplicationRecord
  has_many :donations, dependent: :nullify
end
```

**Pros:**
- Preserves donation records
- Allows donor deletion

**Cons:**
- Orphaned donations (donor_id = null)
- Breaks NOT NULL constraint (would need migration)
- Loses important relationship data

**Use case:** Anonymous donations, but current schema requires donor_id

---

**Option 3: Cascade Delete**
```ruby
class Donor < ApplicationRecord
  has_many :donations, dependent: :destroy
end
```

**Pros:**
- Simple cleanup
- No orphaned records

**Cons:**
- Loses financial data
- Cannot recover donations if donor deleted by mistake
- Violates audit/compliance requirements

**Use case:** NOT recommended for financial applications

---

**Option 4: Soft Delete Cascade (Recommended for Soft Deletes)**
```ruby
class Donor < ApplicationRecord
  has_many :donations, dependent: :restrict_with_error

  # Custom soft delete behavior
  def discard
    # Keep donations, they remain associated to discarded donor
    super
  end
end
```

**Pros:**
- Donations preserved during soft delete
- Can query donations of archived donors
- Reversible (restore donor = restore access to donations)

**Cons:**
- Need to handle discarded donors in donation queries

**Use case:** Donor archive/restore feature (already implemented)

### Recommended Implementation

#### 1. Add Dependent Restriction

```ruby
# app/models/donor.rb
class Donor < ApplicationRecord
  include Discard::Model

  has_paper_trail
  has_many :donations, dependent: :restrict_with_error

  # Rest of model...
end
```

#### 2. Handle Soft Delete Separately

```ruby
# Soft delete keeps donations intact
donor.discard  # Donations remain associated

# Restore donor restores access to donations
donor.undiscard  # Donations still there
```

#### 3. Add Helper Method for Deletion Safety Check

```ruby
# app/models/donor.rb
class Donor < ApplicationRecord
  # ... existing code

  def safe_to_delete?
    donations.empty?
  end

  def delete_with_donations
    return false unless safe_to_delete?
    destroy
  end
end
```

#### 4. Update Controller for Hard Delete Protection

```ruby
# app/controllers/api/donors_controller.rb
def destroy
  donor = Donor.find(params[:id])
  authorize donor

  # Soft delete (archive) - always safe
  donor.discard
  head :no_content
rescue ActiveRecord::InvalidForeignKey
  render json: {
    error: "Cannot delete donor with associated donations"
  }, status: :unprocessable_entity
end
```

### Data Retention Policy Documentation

```markdown
# Data Retention Policy

## Donor Deletion

### Soft Delete (Archive)
- Donor is marked as discarded (discarded_at timestamp)
- All donations remain intact and associated
- Donor can be restored with all donations
- Archived donors hidden from default queries
- Donations of archived donors remain queryable

### Hard Delete
- Prevented if donor has any donations (dependent: :restrict_with_error)
- Must manually delete or reassign all donations first
- Once donor has zero donations, can be permanently deleted
- Irreversible - no recovery possible

## Donation Deletion

### Direct Deletion
- Donations can be deleted individually
- Does not affect donor record
- Irreversible - no soft delete for donations (yet)

## Compliance Notes
- Financial records (donations) should never be casually deleted
- All deletions logged via PaperTrail (versioning enabled)
- Soft delete preferred for data retention and audit compliance
- Consider adding soft delete to Donations model in future
```

### Benefits
- **Data Safety**: Prevents accidental donation data loss
- **Compliance**: Maintains financial records integrity
- **Flexibility**: Soft delete for donors, hard delete restricted
- **Clarity**: Explicit policy documented
- **Recoverability**: Archived donors can be restored with donations

### Testing Strategy

```ruby
# spec/models/donor_spec.rb
RSpec.describe Donor, type: :model do
  describe "associations" do
    it "restricts deletion when donations exist" do
      donor = create(:donor)
      create(:donation, donor: donor)

      expect { donor.destroy }.to raise_error(ActiveRecord::DeleteRestrictionError)
    end

    it "allows deletion when no donations exist" do
      donor = create(:donor)

      expect { donor.destroy }.to change(Donor, :count).by(-1)
    end
  end

  describe "#safe_to_delete?" do
    it "returns true when donor has no donations" do
      donor = create(:donor)
      expect(donor.safe_to_delete?).to be true
    end

    it "returns false when donor has donations" do
      donor = create(:donor)
      create(:donation, donor: donor)
      expect(donor.safe_to_delete?).to be false
    end
  end

  describe "soft delete with donations" do
    it "preserves donations when donor is discarded" do
      donor = create(:donor)
      donation = create(:donation, donor: donor)

      donor.discard

      expect(donor.discarded?).to be true
      expect(donation.reload.donor).to eq(donor)
    end

    it "restores access to donations when donor is restored" do
      donor = create(:donor)
      donation = create(:donation, donor: donor)

      donor.discard
      donor.undiscard

      expect(donor.discarded?).to be false
      expect(donation.reload.donor).to eq(donor)
    end
  end
end

# spec/requests/api/donors_spec.rb
RSpec.describe "DELETE /api/donors/:id", type: :request do
  context "when donor has donations" do
    it "soft deletes the donor" do
      donor = create(:donor)
      create(:donation, donor: donor)

      delete "/api/donors/#{donor.id}"

      expect(response).to have_http_status(:no_content)
      expect(donor.reload).to be_discarded
    end
  end
end
```

### Files to Modify
- `app/models/donor.rb` (ADD dependent: :restrict_with_error)
- `spec/models/donor_spec.rb` (ADD cascade delete tests)
- `spec/requests/api/donors_spec.rb` (VERIFY soft delete behavior)
- `CLAUDE.md` (ADD data retention policy section)
- `DonationTracking.md` (ADD data retention policy)

### Future Enhancements
- Add soft delete to Donation model for reversibility
- Implement donation reassignment workflow
- Add admin UI for managing orphaned donations
- Implement audit log for all deletions
- Add bulk donation deletion for donors (after reassignment)

### Alternative: Donation Soft Delete

If donations should also be soft-deletable:

```ruby
# app/models/donation.rb
class Donation < ApplicationRecord
  include Discard::Model

  # Migration needed:
  # add_column :donations, :discarded_at, :datetime
  # add_index :donations, :discarded_at
end

# Then donor can cascade soft delete:
class Donor < ApplicationRecord
  has_many :donations

  after_discard :discard_donations

  def discard_donations
    donations.discard_all
  end
end
```

### Related Tickets
- Part of data integrity improvement initiative
- Complements soft delete feature from TICKET-001

### Notes
- `dependent: :restrict_with_error` raises ActiveRecord::DeleteRestrictionError
- Soft delete with Discard gem bypasses dependent: restrictions
- PaperTrail tracks all deletions for audit compliance
- Consider regulatory requirements for financial data retention
- Test thoroughly before deploying to production
