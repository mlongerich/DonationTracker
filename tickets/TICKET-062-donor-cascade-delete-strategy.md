## [TICKET-062] Donor Cascade Delete Strategy

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Effort:** S (Small - 1-2 hours)
**Created:** 2025-10-23
**Dependencies:** TICKET-001 (Donor soft delete) ✅
**Related:** TICKET-038 (Part 1 deferred to this ticket)

### User Story

As a database administrator, I want a clear cascade delete strategy for donors so that referential integrity is maintained when donors are permanently deleted and data retention policies are explicit.

### Problem Statement

Currently, donor deletion behavior is incomplete:

**Soft Delete (Archive) - ✅ Implemented:**
- Donor.discard → Sets `discarded_at` timestamp
- Donations/sponsorships remain associated
- Reversible via restore

**Hard Delete (Permanent) - ⚠️ Undefined:**
- No explicit `dependent:` strategy on associations
- What happens to donations when donor permanently deleted?
- What happens to sponsorships when donor permanently deleted?
- No documented data retention policy for hard deletes

**Database Smells:**
- Donor model: `has_many :donations` with no `dependent:` option
- Donor model: `has_many :sponsorships` with no `dependent:` option
- Foreign key constraints may prevent deletion silently

### Current Behavior

**Model Associations:**
```ruby
class Donor < ApplicationRecord
  include Discard::Model

  has_many :donations  # No dependent: option ❌
  has_many :sponsorships  # No dependent: option ❌
end
```

**Expected behavior when donor hard-deleted:**
- `Donor.undiscard.destroy` → Foreign key constraint violation
- Cannot delete donor with associated donations or sponsorships
- No explicit error handling or policy

### Acceptance Criteria

**Backend Implementation:**
- [ ] Add `dependent: :restrict_with_exception` to donations association
- [ ] Add `dependent: :restrict_with_exception` to sponsorships association
- [ ] Add `can_be_deleted?` helper method (checks donations/sponsorships empty)
- [ ] Model tests: 6 tests
  - Cannot delete donor with donations
  - Cannot delete donor with sponsorships
  - Can delete donor with no associations
  - Soft delete preserves donations
  - Soft delete preserves sponsorships
  - Restore after soft delete maintains associations

**Documentation:**
- [ ] Update `docs/project/data-models.md` with donor deletion rules
- [ ] Update CLAUDE.md if needed
- [ ] Document in TICKET-062 completion notes

**No Frontend Changes Required:**
- Frontend uses soft delete (archive) only
- Hard delete only used for cleanup/admin operations

### Recommended Implementation

#### 1. Update Donor Model

```ruby
# app/models/donor.rb
class Donor < ApplicationRecord
  include Discard::Model

  has_paper_trail
  has_many :donations, dependent: :restrict_with_exception
  has_many :sponsorships, dependent: :restrict_with_exception

  validates :name, presence: true
  validates :email, uniqueness: { case_sensitive: false }, allow_blank: true

  # Helper method for deletion safety check
  def can_be_deleted?
    donations.empty? && sponsorships.empty?
  end
end
```

#### 2. Add Tests

```ruby
# spec/models/donor_spec.rb
RSpec.describe Donor, type: :model do
  describe "associations" do
    it "restricts deletion when donations exist" do
      donor = create(:donor)
      create(:donation, donor: donor)

      expect { donor.destroy }.to raise_error(ActiveRecord::DeleteRestrictionError)
    end

    it "restricts deletion when sponsorships exist" do
      donor = create(:donor)
      child = create(:child)
      create(:sponsorship, donor: donor, child: child, monthly_amount: 100)

      expect { donor.destroy }.to raise_error(ActiveRecord::DeleteRestrictionError)
    end

    it "allows deletion when no associations exist" do
      donor = create(:donor)

      expect { donor.destroy }.to change(Donor, :count).by(-1)
    end
  end

  describe "#can_be_deleted?" do
    it "returns true when donor has no donations or sponsorships" do
      donor = create(:donor)
      expect(donor.can_be_deleted?).to be true
    end

    it "returns false when donor has donations" do
      donor = create(:donor)
      create(:donation, donor: donor)
      expect(donor.can_be_deleted?).to be false
    end

    it "returns false when donor has sponsorships" do
      donor = create(:donor)
      child = create(:child)
      create(:sponsorship, donor: donor, child: child, monthly_amount: 100)
      expect(donor.can_be_deleted?).to be false
    end
  end

  describe "soft delete with associations" do
    it "preserves donations when donor is discarded" do
      donor = create(:donor)
      donation = create(:donation, donor: donor)

      donor.discard

      expect(donor.discarded?).to be true
      expect(donation.reload.donor).to eq(donor)
    end

    it "preserves sponsorships when donor is discarded" do
      donor = create(:donor)
      child = create(:child)
      sponsorship = create(:sponsorship, donor: donor, child: child, monthly_amount: 100)

      donor.discard

      expect(donor.discarded?).to be true
      expect(sponsorship.reload.donor).to eq(donor)
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
```

#### 3. Update Documentation

Add to `docs/project/data-models.md` under "Cascade Delete Strategy":

```markdown
### Donor Deletion Rules (TICKET-062)

**Implementation:**
```ruby
class Donor < ApplicationRecord
  include Discard::Model

  has_many :donations, dependent: :restrict_with_exception
  has_many :sponsorships, dependent: :restrict_with_exception

  def can_be_deleted?
    donations.empty? && sponsorships.empty?
  end
end
```

**Deletion Behavior:**

**Soft Delete (Archive):**
- Donor is marked as discarded (`discarded_at` timestamp)
- All donations remain intact and associated
- All sponsorships remain intact and associated
- Donor can be restored with all associations preserved
- Archived donors hidden from default queries
- Donations/sponsorships of archived donors remain queryable

**Hard Delete (Permanent):**
- Prevented if donor has any donations (raises `ActiveRecord::DeleteRestrictionError`)
- Prevented if donor has any sponsorships (raises `ActiveRecord::DeleteRestrictionError`)
- Must manually delete or reassign all donations/sponsorships first
- Once donor has zero associations, can be permanently deleted
- Irreversible - no recovery possible
```

### Data Retention Policy

**Financial Records Protection:**
- Donations should never be casually deleted (financial audit compliance)
- Sponsorships represent commitments and should be preserved
- Soft delete (archive) is the preferred method for donor removal
- Hard delete only for cleanup or data correction scenarios

**Recommended Workflow for Donor Removal:**
1. Archive donor (soft delete) - preserves all relationships
2. If permanent deletion needed:
   - Review all associated donations
   - Review all associated sponsorships
   - Reassign or delete associations if appropriate
   - Then permanently delete donor record

### Benefits

- **Data Safety**: Prevents accidental donation/sponsorship data loss
- **Compliance**: Maintains financial records integrity
- **Consistency**: Matches Project deletion strategy (TICKET-038)
- **Clarity**: Explicit policy documented
- **Recoverability**: Soft delete preferred, hard delete protected

### Files to Modify

**Backend:**
- `app/models/donor.rb` - Add dependent: :restrict_with_exception
- `spec/models/donor_spec.rb` - Add 9 new tests (3 deletion restrictions, 3 can_be_deleted?, 3 soft delete)

**Documentation:**
- `docs/project/data-models.md` - Add "Donor Deletion Rules" section under "Cascade Delete Strategy"

### Related Tickets

- TICKET-001: Donor Soft Delete with Archive/Restore ✅ (implemented soft delete)
- TICKET-038: Define Cascade Delete Strategy for Donations, Sponsorships, and Projects ✅ (Part 1 deferred to this ticket)
- TICKET-005: Auto-reassign Donations After Merge (related to donation reassignment)

### Notes

**Why Medium Priority:**
- Data integrity issue, but less urgent than project deletion (TICKET-038)
- Soft delete already implemented and working well
- Hard delete is edge case (rarely used in production)
- Should be implemented before production deployment

**Rails 8 Syntax:**
- Use `dependent: :restrict_with_exception` (not Rails 7's `restrict_with_error`)
- Raises `ActiveRecord::DeleteRestrictionError` when restricted

**Testing Strategy:**
- Follow TDD strict workflow (one test at a time)
- Test both positive and negative cases
- Verify soft delete doesn't trigger restrictions
- Verify hard delete does trigger restrictions when appropriate
