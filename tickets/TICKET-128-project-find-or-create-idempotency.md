## [TICKET-128] Project Find-or-Create Idempotency

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Effort:** M (Medium - 3-4 hours)
**Created:** 2025-11-19
**Dependencies:** None
**Related:** TICKET-021 (Quick Project Creation), Donor idempotency pattern

### User Story
As a user, I want the system to prevent duplicate projects when I create a project with the same title, so that I don't accidentally create multiple "Christmas Campaign" or "General Donation" projects.

### Problem Statement

**Current Behavior:**
- Creating a project via `/api/projects POST` always creates a new record
- No deduplication logic exists
- User can create 10 projects all titled "Christmas Campaign"
- Inconsistent with Donor behavior (donors are deduplicated by email)

**Donor Pattern (Idempotent):**
```ruby
# app/controllers/api/donors_controller.rb
def create
  donor_params = params.require(:donor).permit(:name, :email)
  result = DonorService.find_or_update_by_email(donor_params, Time.current)

  status = result[:created] ? :created : :ok
  render json: { donor: DonorPresenter.new(result[:donor]).as_json }, status: status
end
```

**Project Pattern (NOT Idempotent):**
```ruby
# app/controllers/api/projects_controller.rb
def create
  project = Project.new(project_params)
  project.save!  # Always creates new
  render json: { project: ProjectPresenter.new(project).as_json }, status: :created
end
```

### Acceptance Criteria

#### Backend
- [ ] Create `ProjectService.find_or_update_by_title(project_attributes, timestamp)`
- [ ] Service finds existing project by title (case-insensitive)
- [ ] If found: update `description` and `project_type` if timestamp newer
- [ ] If not found: create new project
- [ ] Return `{ project: Project, created: Boolean }`
- [ ] Update `ProjectsController#create` to use service
- [ ] Return `:created` (201) if new, `:ok` (200) if existing
- [ ] RSpec tests for service (5+ tests)
- [ ] RSpec tests for controller behavior

#### Frontend
- [ ] No changes needed (already handles 200/201 responses)
- [ ] QuickProjectCreateDialog works same as before
- [ ] ProjectsPage works same as before

#### Documentation
- [ ] Update CLAUDE.md with ProjectService pattern
- [ ] Document find-or-create behavior in API docs

### Technical Approach

**1. Create ProjectService:**

```ruby
# app/services/project_service.rb
class ProjectService
  # Find existing project by title (case-insensitive) or create new
  #
  # @param project_attributes [Hash] { title:, description:, project_type: }
  # @param transaction_date [Time] For conflict resolution
  # @return [Hash] { project: Project, created: Boolean }
  #
  # @example
  #   result = ProjectService.find_or_update_by_title(
  #     { title: "Christmas Campaign", description: "...", project_type: "campaign" },
  #     Time.current
  #   )
  #   result[:project] # => #<Project id: 5, title: "Christmas Campaign">
  #   result[:created] # => false (found existing)
  def self.find_or_update_by_title(project_attributes, transaction_date)
    title = project_attributes[:title]
    existing = Project.where("LOWER(title) = LOWER(?)", title).first

    if existing
      # Update if newer
      if existing.updated_at.nil? || transaction_date > existing.updated_at
        existing.update!(
          description: project_attributes[:description],
          project_type: project_attributes[:project_type],
          updated_at: transaction_date
        )
      end
      { project: existing, created: false }
    else
      # Create new
      project = Project.create!(project_attributes.merge(
        created_at: transaction_date,
        updated_at: transaction_date
      ))
      { project: project, created: true }
    end
  end
end
```

**2. Update ProjectsController:**

```ruby
# app/controllers/api/projects_controller.rb
def create
  project_params = params.require(:project).permit(:title, :description, :project_type)
  result = ProjectService.find_or_update_by_title(project_params, Time.current)

  status = result[:created] ? :created : :ok
  render json: { project: ProjectPresenter.new(result[:project]).as_json }, status: status
end
```

**3. RSpec Tests:**

```ruby
# spec/services/project_service_spec.rb
describe ProjectService do
  describe '.find_or_update_by_title' do
    it 'creates new project if none exists' do
      result = ProjectService.find_or_update_by_title(
        { title: "New Campaign", description: "Test", project_type: "campaign" },
        Time.current
      )
      expect(result[:created]).to be true
      expect(result[:project].title).to eq("New Campaign")
    end

    it 'finds existing project by exact title' do
      existing = create(:project, title: "Christmas Campaign")
      result = ProjectService.find_or_update_by_title(
        { title: "Christmas Campaign", description: "Updated", project_type: "campaign" },
        Time.current
      )
      expect(result[:created]).to be false
      expect(result[:project].id).to eq(existing.id)
    end

    it 'finds existing project case-insensitively' do
      existing = create(:project, title: "Christmas Campaign")
      result = ProjectService.find_or_update_by_title(
        { title: "christmas campaign", description: "Test", project_type: "campaign" },
        Time.current
      )
      expect(result[:created]).to be false
      expect(result[:project].id).to eq(existing.id)
    end

    it 'updates description if newer timestamp' do
      existing = create(:project, title: "Campaign", description: "Old", updated_at: 1.day.ago)
      result = ProjectService.find_or_update_by_title(
        { title: "Campaign", description: "New", project_type: "campaign" },
        Time.current
      )
      expect(result[:project].description).to eq("New")
    end

    it 'does not update if older timestamp' do
      existing = create(:project, title: "Campaign", description: "Newer", updated_at: Time.current)
      result = ProjectService.find_or_update_by_title(
        { title: "Campaign", description: "Older", project_type: "campaign" },
        1.day.ago
      )
      expect(result[:project].description).to eq("Newer")
    end
  end
end

# spec/requests/api/projects_spec.rb
describe 'POST /api/projects' do
  it 'returns 201 when creating new project' do
    post '/api/projects', params: { project: { title: "New", description: "Test", project_type: "general" } }
    expect(response).to have_http_status(:created)
  end

  it 'returns 200 when finding existing project' do
    create(:project, title: "Existing")
    post '/api/projects', params: { project: { title: "Existing", description: "Test", project_type: "general" } }
    expect(response).to have_http_status(:ok)
  end
end
```

### Edge Cases

**System Projects:**
- "General Donation" is a system project (`system: true`)
- Should NOT be updated by find-or-create
- Consider adding check: `existing.system? ? create_new : update_existing`

**Whitespace/Trimming:**
- Titles should be trimmed and normalized
- "  Christmas  " should match "Christmas"

**Soft-Deleted Projects:**
- Should `discarded_at IS NULL` be part of the query?
- Or should we restore soft-deleted projects?

### Files to Create/Modify

**Backend:**
- `app/services/project_service.rb` (new - ~60 lines)
- `app/controllers/api/projects_controller.rb` (modify create action)
- `spec/services/project_service_spec.rb` (new - ~80 lines)
- `spec/requests/api/projects_spec.rb` (add idempotency tests)

**Documentation:**
- `docs/CLAUDE.md` (add ProjectService pattern)
- `docs/DonationTracking.md` (update project creation workflow)

### Testing Strategy

1. **Unit Tests (Service):** 8-10 tests covering all scenarios
2. **Request Tests (API):** 3-4 tests for HTTP status codes
3. **Integration Tests:** Create same project twice from frontend, verify no duplicates
4. **Manual Testing:** Use QuickProjectCreateDialog to create duplicate projects

### Open Questions

1. **System projects:** Should system projects be excluded from find-or-update?
2. **Soft-deleted projects:** Restore or ignore?
3. **Title normalization:** Trim whitespace? Lowercase comparison only?
4. **Conflict resolution:** Always use timestamp, or allow manual override?

### Notes

- This brings Projects in line with Donors (both idempotent)
- Frontend requires NO changes (already sends POST /api/projects)
- Backend change is transparent to existing code
- Test coverage should match DonorService tests

### Estimated Breakdown

- ProjectService implementation: 1 hour
- RSpec tests (service + controller): 1.5 hours
- Frontend validation (manual testing): 0.5 hours
- Documentation updates: 0.5 hours
- **Total: 3.5-4 hours**
