## [TICKET-063] Archive/Unarchive Business Logic for Active Sponsorships

**Status:** 🔵 Pending
**Priority:** 🔴 High
**Type:** Feature
**Component:** Backend, Frontend

---

### User Story

As a system administrator, I need to ensure data integrity when archiving donors, children, and projects, so that active sponsorships are not orphaned and webhook integrations can automatically restore archived entities when needed.

---

### Business Rules

#### 1. Prevent Archiving Entities with Active Sponsorships

**Rule:** Cannot archive a donor, child, or project if they have any active sponsorships.

**Entities Affected:**
- **Donors**: Cannot archive if they have any active sponsorships (as sponsor)
- **Children**: Cannot archive if they have any active sponsorships (as beneficiary)
- **Projects**: Cannot archive if they have any active sponsorships (associated project)

**Expected Behavior:**
- Archive action fails with validation error
- Frontend displays clear error message
- Entity remains active (not archived)

#### 2. Auto-Unarchive on New Donation/Sponsorship Creation

**Rule:** When creating a donation or sponsorship that references an archived donor, child, or project, automatically unarchive (restore) that entity.

**Scenarios:**
- **Webhook creates donation** with archived donor → auto-unarchive donor
- **Webhook creates sponsorship** with archived child → auto-unarchive child
- **Manual/API creation** references archived project → auto-unarchive project

**Expected Behavior:**
- Entity is silently restored (undiscarded)
- Donation/sponsorship creation succeeds
- No error shown to user

---

### Acceptance Criteria

#### Backend Validation

- [ ] **Donor Model**
  - [ ] Add validation: cannot discard if `sponsorships.active.exists?`
  - [ ] Custom error message: "Cannot archive donor with active sponsorships"
  - [ ] Test: attempting to archive donor with active sponsorship fails
  - [ ] Test: archiving donor with no active sponsorships succeeds
  - [ ] Test: archiving donor with only ended sponsorships succeeds

- [ ] **Child Model**
  - [ ] Add validation: cannot discard if `sponsorships.active.exists?`
  - [ ] Custom error message: "Cannot archive child with active sponsorships"
  - [ ] Test: attempting to archive child with active sponsorship fails
  - [ ] Test: archiving child with no active sponsorships succeeds

- [ ] **Project Model**
  - [ ] Add validation: cannot discard if has active sponsorships through children
  - [ ] Custom error message: "Cannot archive project with active sponsorships"
  - [ ] Test: attempting to archive project with active sponsorships fails
  - [ ] Test: archiving project with no active sponsorships succeeds

#### Auto-Unarchive Logic

- [ ] **Donation Creation**
  - [ ] Before create callback: if `donor.discarded?` → `donor.undiscard`
  - [ ] Before create callback: if `project.discarded?` → `project.undiscard`
  - [ ] Test: creating donation with archived donor auto-restores donor
  - [ ] Test: creating donation with archived project auto-restores project
  - [ ] Test: creating donation with active donor does not modify state

- [ ] **Sponsorship Creation**
  - [ ] Before create callback: if `donor.discarded?` → `donor.undiscard`
  - [ ] Before create callback: if `child.discarded?` → `child.undiscard`
  - [ ] Before create callback: if `project.discarded?` → `project.undiscard`
  - [ ] Test: creating sponsorship with archived entities auto-restores all
  - [ ] Test: webhook scenario - Stripe creates sponsorship with archived child

#### API Error Handling

- [ ] **Archive Endpoint (POST /api/:resource/:id/archive)**
  - [ ] Returns 422 Unprocessable Entity if validation fails
  - [ ] Returns JSON error: `{ errors: ["Cannot archive X with active sponsorships"] }`
  - [ ] Test: POST /api/donors/1/archive with active sponsorship returns 422
  - [ ] Test: POST /api/children/1/archive with active sponsorship returns 422
  - [ ] Test: POST /api/projects/1/archive with active sponsorship returns 422

#### Frontend Error Handling

- [ ] **DonorsPage.tsx**
  - [ ] Catch 422 error on archive
  - [ ] Display error message in snackbar/alert
  - [ ] Do not remove donor from list
  - [ ] Test: attempting to archive donor with active sponsorship shows error

- [ ] **ChildrenPage.tsx**
  - [ ] Catch 422 error on archive
  - [ ] Display error message in snackbar/alert
  - [ ] Do not remove child from list
  - [ ] Test: attempting to archive child with active sponsorship shows error

- [ ] **ProjectsPage.tsx**
  - [ ] Catch 422 error on archive
  - [ ] Display error message in snackbar/alert
  - [ ] Do not remove project from list
  - [ ] Test: attempting to archive project with active sponsorship shows error

---

### Technical Implementation

#### Backend Changes

**1. Model Validations (app/models/)**

```ruby
# app/models/donor.rb
class Donor < ApplicationRecord
  include Discard::Model

  before_discard :check_active_sponsorships

  private

  def check_active_sponsorships
    if sponsorships.active.exists?
      errors.add(:base, "Cannot archive donor with active sponsorships")
      throw :abort
    end
  end
end

# app/models/child.rb
class Child < ApplicationRecord
  include Discard::Model

  before_discard :check_active_sponsorships

  private

  def check_active_sponsorships
    if sponsorships.active.exists?
      errors.add(:base, "Cannot archive child with active sponsorships")
      throw :abort
    end
  end
end

# app/models/project.rb
class Project < ApplicationRecord
  include Discard::Model

  before_discard :check_active_sponsorships

  private

  def check_active_sponsorships
    # Projects might have sponsorships through children or directly
    if has_active_sponsorships?
      errors.add(:base, "Cannot archive project with active sponsorships")
      throw :abort
    end
  end

  def has_active_sponsorships?
    # Check if any child in this project has active sponsorships
    # OR if project has direct sponsorships (depending on data model)
    children.joins(:sponsorships).merge(Sponsorship.active).exists?
  end
end
```

**2. Auto-Unarchive Callbacks**

```ruby
# app/models/donation.rb
class Donation < ApplicationRecord
  before_create :restore_archived_associations

  private

  def restore_archived_associations
    donor.undiscard if donor&.discarded?
    project.undiscard if project&.discarded?
  end
end

# app/models/sponsorship.rb
class Sponsorship < ApplicationRecord
  before_create :restore_archived_associations

  private

  def restore_archived_associations
    donor.undiscard if donor&.discarded?
    child.undiscard if child&.discarded?
    project.undiscard if project&.discarded?
  end
end
```

**3. Controller Error Handling**

```ruby
# app/controllers/api/donors_controller.rb
def archive
  donor = Donor.find(params[:id])

  if donor.discard
    head :no_content
  else
    render json: { errors: donor.errors.full_messages }, status: :unprocessable_entity
  end
end
```

#### Frontend Changes

**Error Snackbar/Alert Component**

```typescript
// Use MUI Snackbar or Alert for error display
import { Snackbar, Alert } from '@mui/material';

const [error, setError] = useState<string | null>(null);

const handleArchive = async (id: number) => {
  try {
    await apiClient.post(`/api/donors/${id}/archive`);
    // Reload list...
  } catch (err: any) {
    if (err.response?.status === 422) {
      setError(err.response.data.errors.join(', '));
    } else {
      setError('Failed to archive donor');
    }
  }
};

<Snackbar
  open={!!error}
  autoHideDuration={6000}
  onClose={() => setError(null)}
>
  <Alert severity="error">{error}</Alert>
</Snackbar>
```

---

### Edge Cases

#### 1. Race Condition: Sponsorship Created While Archiving
**Scenario:** User archives donor, webhook creates sponsorship simultaneously
**Solution:** Database-level transaction ensures atomicity

#### 2. Webhook Creates Sponsorship with Archived Entity
**Scenario:** Stripe webhook references archived child ID
**Solution:** Auto-unarchive restores child silently, sponsorship created successfully

#### 3. User Archives Donor, Then Creates Donation
**Scenario:** Manual UI flow where user archives, then realizes mistake
**Solution:** Creating donation auto-restores donor, no error shown

#### 4. Batch Archive Operation
**Scenario:** User tries to archive multiple donors, some have active sponsorships
**Solution:** Each fails individually with specific error message

---

### Testing Strategy

#### Backend Tests (RSpec)

**Model Tests:**
- `donor_spec.rb`: `before_discard` callback tests
- `child_spec.rb`: `before_discard` callback tests
- `project_spec.rb`: `before_discard` callback tests
- `donation_spec.rb`: `before_create` restore callback tests
- `sponsorship_spec.rb`: `before_create` restore callback tests

**Request Tests:**
- `donors_spec.rb`: Archive endpoint 422 error tests
- `children_spec.rb`: Archive endpoint 422 error tests
- `projects_spec.rb`: Archive endpoint 422 error tests

#### Frontend Tests (Jest + React Testing Library)

**Component Tests:**
- `DonorsPage.test.tsx`: Error handling for failed archive
- `ChildrenPage.test.tsx`: Error handling for failed archive
- `ProjectsPage.test.tsx`: Error handling for failed archive

**Integration Tests (Cypress - Optional):**
- E2E: Attempt to archive donor with active sponsorship, verify error message
- E2E: Create donation with archived donor, verify donor auto-restored

---

### Dependencies

- Discard gem (already installed)
- MUI Snackbar/Alert (already available)
- Sponsorship model `active` scope (assumed to exist)

---

### Related Tickets

- TICKET-049: Child Soft Delete (Archive/Restore)
- TICKET-062: Donor Cascade Delete Strategy
- TICKET-038: Define Cascade Delete Strategy for Donations
- TICKET-012: Stripe Webhook Integration

---

### Notes

- **Webhook Safety:** Auto-unarchive ensures webhooks never fail due to archived entities
- **Data Integrity:** Prevents orphaned active sponsorships
- **User Experience:** Clear error messages guide users to resolve conflicts
- **Silent Restoration:** Auto-unarchive happens transparently for webhooks
- **Audit Trail:** Consider logging auto-unarchive events for debugging

---

**Created:** 2025-10-24
**Last Updated:** 2025-10-24
