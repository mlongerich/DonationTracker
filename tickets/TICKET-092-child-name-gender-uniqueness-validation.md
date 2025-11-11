## [TICKET-092] Child Name+Gender Uniqueness Validation

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Effort:** S (Small - 1-2 hours)
**Created:** 2025-11-11
**Dependencies:** TICKET-052 (Child gender field) ✅

### User Story

As a user managing children, I want the system to prevent duplicate child records based on name and gender so that I can distinguish between children with the same name but different genders while preventing true duplicates.

### Problem Statement

Currently, the Child model only validates presence of name. This allows:
- ❌ Multiple "Maria" (girl) records (true duplicates)
- ❌ Multiple "Juan" (boy) records (true duplicates)
- ❌ "Maria" (girl) + "Maria" (null) (ambiguous)

**Desired behavior:**
- ✅ Allow "Maria" (girl) + "Maria" (boy) (different children)
- ❌ Prevent "Maria" (girl) + "Maria" (girl) (duplicate)
- ❌ Prevent "Juan" (boy) + "Juan" (boy) (duplicate)
- ✅ Allow "Sam" (null) IF no "Sam" (boy) OR "Sam" (girl) exists
- ❌ Prevent "Sam" (null) IF "Sam" (boy) OR "Sam" (girl) exists

### Acceptance Criteria

**Backend Validation:**
- [ ] Add Rails uniqueness validation: `validates :name, uniqueness: { scope: :gender }`
- [ ] Add custom validation for null gender edge case:
  - [ ] If gender is null, name must not exist with boy OR girl gender
  - [ ] Validation error: "Name already exists with a specified gender. Please select the appropriate gender."
- [ ] Add database unique index: `add_index :children, [:name, :gender], unique: true`

**Error Handling:**
- [ ] Return 422 Unprocessable Entity with validation errors
- [ ] Frontend displays validation error below name field
- [ ] Clear, actionable error messages

**Test Coverage:**
- [ ] RSpec model tests:
  - [ ] Allows same name with different genders (boy/girl)
  - [ ] Prevents duplicate name+boy
  - [ ] Prevents duplicate name+girl
  - [ ] Allows name+null if no name+boy or name+girl exists
  - [ ] Prevents name+null if name+boy exists
  - [ ] Prevents name+null if name+girl exists
- [ ] RSpec request tests:
  - [ ] POST /api/children returns 422 for duplicate name+gender
  - [ ] PUT /api/children/:id returns 422 for duplicate name+gender
- [ ] Frontend Jest tests:
  - [ ] ChildForm displays validation error from API
  - [ ] Error clears when name or gender changed
- [ ] Cypress E2E tests:
  - [ ] Create child "Maria" (girl) → success
  - [ ] Create child "Maria" (girl) again → error shown
  - [ ] Create child "Maria" (boy) → success (different gender)

### Technical Implementation

#### Backend Changes

**1. Update Child Model:**

```ruby
# app/models/child.rb
class Child < ApplicationRecord
  validates :name, presence: true
  validates :name, uniqueness: { scope: :gender, message: "already exists with this gender" }
  validate :name_unique_when_gender_null

  private

  def name_unique_when_gender_null
    return unless gender.nil?

    if Child.where(name: name, gender: ['boy', 'girl']).where.not(id: id).exists?
      errors.add(:name, "already exists with a specified gender. Please select the appropriate gender.")
    end
  end
end
```

**2. Add Database Index:**

```ruby
# db/migrate/20251111XXXXXX_add_unique_index_to_children_name_gender.rb
class AddUniqueIndexToChildrenNameGender < ActiveRecord::Migration[7.2]
  def change
    add_index :children, [:name, :gender], unique: true
  end
end
```

**Note:** This index allows multiple null genders (SQL null behavior), but Rails validation enforces stricter rules.

#### Frontend Changes

**1. Update ChildForm Error Handling:**

```tsx
// src/components/ChildForm.tsx
const handleSubmit = async () => {
  try {
    await onSubmit({ name, gender: gender === '' ? null : gender });
    setError('');
  } catch (err: any) {
    if (err.response?.data?.errors?.name) {
      setError(err.response.data.errors.name[0]);
    } else {
      setError('An error occurred. Please try again.');
    }
  }
};
```

**2. Update ChildrenPage to Handle Errors:**

```tsx
// src/pages/ChildrenPage.tsx
const handleCreate = async (data: ChildFormData) => {
  try {
    await createChild(data);
    fetchChildren();
  } catch (error: any) {
    // Error is now handled by ChildForm
    throw error; // Re-throw to let ChildForm display it
  }
};
```

### Edge Cases

**Case 1: Editing child name/gender**
- Maria (girl) exists
- Edit to change name to "Sofia" → ✅ Allowed
- Edit to change gender to null → ❌ Prevented (if "Maria" (boy) or "Maria" (girl) exists)

**Case 2: Multiple children with null gender**
- "Unknown Child 1" (null) exists
- Create "Unknown Child 2" (null) → ✅ Allowed (different names)

**Case 3: Soft-deleted children**
- Maria (girl) archived (discarded_at set)
- Create new "Maria" (girl) → ⚠️ **Decision needed:**
  - Option A: Allow (archived children excluded from uniqueness)
  - Option B: Prevent (show error: "This child name already exists but is archived. Would you like to restore it?")

**Recommendation:** Option A (exclude archived children from uniqueness validation)

```ruby
validates :name, uniqueness: {
  scope: :gender,
  conditions: -> { kept }, # Discard gem method
  message: "already exists with this gender"
}
```

### Files to Modify

**Backend:**
- `app/models/child.rb` - Add uniqueness validation and custom null validation
- `db/migrate/XXXXXX_add_unique_index_to_children_name_gender.rb` - Add database index
- `spec/models/child_spec.rb` - Add 6 uniqueness validation tests
- `spec/requests/api/children_spec.rb` - Add 2 error response tests

**Frontend:**
- `src/components/ChildForm.tsx` - Add error handling for uniqueness errors
- `src/components/ChildForm.test.tsx` - Add validation error display test
- `src/pages/ChildrenPage.tsx` - Update error handling
- `cypress/e2e/children-sponsorship.cy.ts` - Add 3 E2E uniqueness tests

**Documentation:**
- `DonationTracking.md` - Document child uniqueness rules
- `CLAUDE.md` - Add pattern for uniqueness with scope + custom validation

### Related Tickets

- ✅ TICKET-052: Child gender field (dependency)
- 📋 TICKET-092: This ticket (child uniqueness validation)

### Success Metrics

- ✅ No duplicate children with same name+gender
- ✅ Clear error messages guide users to fix duplicates
- ✅ Users can create same-name children with different genders
- ✅ Null gender edge case handled correctly

---

*This ticket adds business logic validation to prevent duplicate child records while allowing legitimate same-name children with different genders.*
