## [TICKET-038] Define Cascade Delete Strategy for Donations, Sponsorships, and Projects

**Status:** 🔵 In Progress
**Priority:** 🔴 High (upgraded from Low - data integrity issue)
**Effort:** M (Medium - expanded scope)
**Created:** 2025-10-18
**Updated:** 2025-10-23 (expanded to include Projects)
**Dependencies:** None

### User Story
As a database administrator, I want a clear cascade delete strategy for donations, sponsorships, and projects so that referential integrity is maintained and data retention policies are explicit.

### Problem Statement
Currently, relationships lack explicit cascade delete strategies:

**Donors → Donations:**
- What happens to donations when a donor is soft-deleted?
- What happens to donations when a donor is permanently deleted?
- No documented data retention policy

**Projects → Donations:**
- Projects can be deleted even if donations exist (data corruption risk)
- No prevention of orphaned donation records
- Missing association: `Project` has no `has_many :sponsorships`

**Projects → Sponsorships:**
- Projects can be deleted even if sponsorships exist (data corruption risk)
- Sponsorships would be orphaned without project_id
- Frontend shows delete button for all non-system projects (no association check)

**Database Smells:**
- Missing cascade behavior definitions
- Donor model: `has_many :donations` with no `dependent:` option
- Project model: `has_many :donations` with no `dependent:` option
- Project model: Missing `has_many :sponsorships` association entirely

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

## Part 1: Donor → Donations Strategy

#### 1. Add Dependent Restriction to Donor Model

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

## Part 2: Project → Donations & Sponsorships Strategy

### Current Issues
1. **Missing association**: Project model has no `has_many :sponsorships`
2. **Missing dependent strategy**: Project can be deleted even with donations/sponsorships
3. **No database-level protection**: Only checks `system` flag
4. **Frontend allows deletion**: Delete button shown for all non-system projects

### Implementation

#### 1. Add Missing Association and Dependent Restrictions

```ruby
# app/models/project.rb
class Project < ApplicationRecord
  has_many :donations, dependent: :restrict_with_error
  has_many :sponsorships, dependent: :restrict_with_error

  enum :project_type, { general: 0, campaign: 1, sponsorship: 2 }, prefix: true

  validates :title, presence: true

  before_destroy :prevent_system_project_deletion
  before_destroy :prevent_deletion_with_associations

  private

  def prevent_system_project_deletion
    if system?
      errors.add(:base, "Cannot delete system projects")
      throw :abort
    end
  end

  def prevent_deletion_with_associations
    if donations.any?
      errors.add(:base, "Cannot delete project with associated donations")
      throw :abort
    end

    if sponsorships.any?
      errors.add(:base, "Cannot delete project with associated sponsorships")
      throw :abort
    end
  end

  def can_be_deleted?
    !system? && donations.empty? && sponsorships.empty?
  end
end
```

#### 2. Update API to Include Association Counts

```ruby
# app/presenters/project_presenter.rb (new file)
class ProjectPresenter < BasePresenter
  def as_json(options = {})
    {
      id: object.id,
      title: object.title,
      description: object.description,
      project_type: object.project_type,
      system: object.system,
      donations_count: object.donations.count,
      sponsorships_count: object.sponsorships.count,
      can_be_deleted: object.can_be_deleted?
    }
  end
end

# app/controllers/api/projects_controller.rb
def index
  scope = Project.all
  filtered_scope = apply_ransack_filters(scope)
  projects = paginate_collection(filtered_scope.order(title: :asc))

  render json: {
    projects: CollectionPresenter.new(projects, ProjectPresenter).as_json,
    meta: pagination_meta(projects)
  }
end
```

#### 3. Frontend: Hide Delete Button When Associations Exist

```tsx
// src/components/ProjectList.tsx
interface ProjectListProps {
  projects: Project[];
  onEdit?: (project: Project) => void;
  onDelete?: (project: Project) => void;
}

const ProjectList: React.FC<ProjectListProps> = ({ projects, onEdit, onDelete }) => {
  const canDelete = (project: Project) => {
    return !project.system &&
           project.donations_count === 0 &&
           project.sponsorships_count === 0;
  };

  return (
    <Stack spacing={2}>
      {projects.map((project) => (
        <Card key={project.id} variant="outlined">
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <Typography variant="subtitle1">{project.title}</Typography>
              {!project.system && (
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Tooltip title="Edit project">
                    <IconButton onClick={() => onEdit?.(project)}>
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  {canDelete(project) && (
                    <Tooltip title="Delete project">
                      <IconButton onClick={() => onDelete?.(project)}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
};
```

#### 4. Update TypeScript Types

```typescript
// src/types/project.ts
export interface Project {
  id: number;
  title: string;
  description?: string;
  project_type: ProjectType;
  system: boolean;
  donations_count: number;        // NEW
  sponsorships_count: number;     // NEW
  can_be_deleted: boolean;        // NEW
}
```

### Testing Strategy

```ruby
# spec/models/project_spec.rb
RSpec.describe Project, type: :model do
  describe "associations" do
    it "has many sponsorships" do
      expect(Project.new).to respond_to(:sponsorships)
    end

    it "restricts deletion when donations exist" do
      project = create(:project)
      create(:donation, project: project)

      expect { project.destroy }.to raise_error(ActiveRecord::DeleteRestrictionError)
    end

    it "restricts deletion when sponsorships exist" do
      project = create(:project, project_type: :sponsorship)
      child = create(:child)
      donor = create(:donor)
      create(:sponsorship, project: project, child: child, donor: donor)

      expect { project.destroy }.to raise_error(ActiveRecord::DeleteRestrictionError)
    end

    it "allows deletion when no donations or sponsorships exist" do
      project = create(:project)

      expect { project.destroy }.to change(Project, :count).by(-1)
    end
  end

  describe "#can_be_deleted?" do
    it "returns true when project has no associations and is not system" do
      project = create(:project, system: false)
      expect(project.can_be_deleted?).to be true
    end

    it "returns false when project has donations" do
      project = create(:project)
      create(:donation, project: project)
      expect(project.can_be_deleted?).to be false
    end

    it "returns false when project has sponsorships" do
      project = create(:project, project_type: :sponsorship)
      child = create(:child)
      donor = create(:donor)
      create(:sponsorship, project: project, child: child, donor: donor)
      expect(project.can_be_deleted?).to be false
    end

    it "returns false when project is system" do
      project = create(:project, system: true)
      expect(project.can_be_deleted?).to be false
    end
  end
end
```

```typescript
// src/components/ProjectList.test.tsx
describe('ProjectList', () => {
  it('shows delete button for project with no associations', () => {
    const projects = [{
      id: 1,
      title: 'Empty Project',
      project_type: 'general',
      system: false,
      donations_count: 0,
      sponsorships_count: 0,
      can_be_deleted: true
    }];

    render(<ProjectList projects={projects} onDelete={jest.fn()} />);

    expect(screen.getByLabelText('delete')).toBeInTheDocument();
  });

  it('hides delete button when donations exist', () => {
    const projects = [{
      id: 1,
      title: 'Project with Donations',
      project_type: 'general',
      system: false,
      donations_count: 5,
      sponsorships_count: 0,
      can_be_deleted: false
    }];

    render(<ProjectList projects={projects} onDelete={jest.fn()} />);

    expect(screen.queryByLabelText('delete')).not.toBeInTheDocument();
  });

  it('hides delete button when sponsorships exist', () => {
    const projects = [{
      id: 1,
      title: 'Sponsor Maria',
      project_type: 'sponsorship',
      system: false,
      donations_count: 0,
      sponsorships_count: 1,
      can_be_deleted: false
    }];

    render(<ProjectList projects={projects} onDelete={jest.fn()} />);

    expect(screen.queryByLabelText('delete')).not.toBeInTheDocument();
  });
});
```

### Files to Modify

**Backend - Donor:**
- `app/models/donor.rb` (ADD dependent: :restrict_with_error)
- `spec/models/donor_spec.rb` (ADD cascade delete tests)
- `spec/requests/api/donors_spec.rb` (VERIFY soft delete behavior)

**Backend - Project:**
- `app/models/project.rb` (ADD has_many :sponsorships, dependent strategies, callbacks)
- `app/presenters/project_presenter.rb` (NEW FILE - add counts and can_be_deleted)
- `app/controllers/api/projects_controller.rb` (UPDATE to use ProjectPresenter)
- `spec/models/project_spec.rb` (ADD 7 new tests for associations and can_be_deleted?)
- `spec/presenters/project_presenter_spec.rb` (NEW FILE - test JSON structure)

**Frontend - Project:**
- `src/types/project.ts` (ADD donations_count, sponsorships_count, can_be_deleted fields)
- `src/components/ProjectList.tsx` (ADD canDelete() logic, conditionally show delete button)
- `src/components/ProjectList.test.tsx` (ADD 3 new tests for delete button visibility)

**Documentation:**
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
