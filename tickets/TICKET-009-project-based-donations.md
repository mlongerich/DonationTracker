## [TICKET-009] Project-Based Donations (Hybrid Approach)

**Status:** 📋 Planned
**Priority:** 🟡 Medium (Required for Stripe import - TICKET-024)
**Dependencies:** TICKET-006 (Donation model)

### User Story
As an admin, I want to assign donations to specific projects/campaigns so that I can track funding for different initiatives, with all donations defaulting to "General Donation" if no project is specified.

### Acceptance Criteria
- [ ] Backend: Project model (title, description, goal_amount, start_date, end_date, project_type, system)
- [ ] Backend: Add nullable project_id to donations table (optional: true in model)
- [ ] Backend: Seed "General Donation" system project in migration
- [ ] Backend: Project CRUD endpoints (GET, POST, PUT, DELETE /api/projects)
- [ ] Backend: Prevent deletion/editing of system projects (validation)
- [ ] Backend: Include project info in donation responses
- [ ] Backend: Project extraction from description text (for Stripe import)
- [ ] Frontend: Project management page (list, create, edit - excluding system projects)
- [ ] Frontend: Add project dropdown to DonationForm with "General Donation" default
- [ ] Frontend: Auto-create/assign "General Donation" if user doesn't select project
- [ ] Frontend: Show project title in DonationList (display "General Donation" for null project_id)
- [ ] Frontend: Project dashboard showing total raised vs goal
- [ ] RSpec tests for Project model, validations, and API (8+ tests)
- [ ] Cypress E2E test for project assignment and default behavior

### Technical Notes
- **TDD approach**: Red-Green-Refactor cycle followed for all tests
- **Hybrid Model Design**: Schema allows nullable project_id, but UI enforces project selection
- **Model**: `rails g model Project title:string description:text goal_amount:decimal start_date:date end_date:date project_type:integer system:boolean`
- **Migration**: `rails g migration AddProjectToDonations project:references`
- **Project types enum**: `enum project_type: { general: 0, campaign: 1, sponsorship: 2 }`
- **System project**: "General Donation" created in migration with `system: true, project_type: :general`
- **Validation**: Prevent deletion/editing of projects where `system: true`
- **Calculations**: `project.donations.sum(:amount)` for total raised
- **Frontend logic**: `projectId = selectedProject?.id || await getOrCreateGeneralProject()`
- **Virtual attribute**: `donation.project_title` returns `project&.title || "General Donation"`
- **Migration path**: Existing donations with null project_id display as "General Donation" in UI
- **Stripe Integration**: Extract project titles from Stripe description field
  - "Monthly Sponsorship Donation for Sangwan" → Project: "Sponsor Sangwan"
  - "$100 - General Monthly Donation" → Project: "General Donation"
- **Future**: Backfill null project_id values to "General Donation" project if desired

### Files Changed
- Backend: `app/models/project.rb` (new)
- Backend: `app/models/donation.rb` (add belongs_to :project)
- Backend: `db/migrate/..._create_projects.rb` (new)
- Backend: `db/migrate/..._add_project_to_donations.rb` (new)
- Backend: `app/controllers/api/projects_controller.rb` (new)
- Frontend: `src/components/ProjectForm.tsx` (new)
- Frontend: `src/components/ProjectList.tsx` (new)
- Frontend: `src/components/DonationForm.tsx` (update)

### Related Commits
- (To be added during commit)
