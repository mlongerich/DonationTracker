## [TICKET-009] Project-Based Donations

**Status:** 📋 Planned
**Priority:** 🟢 Low
**Dependencies:** TICKET-006 (Donation model)

### User Story
As an admin, I want to assign donations to specific projects/campaigns so that I can track funding for different initiatives.

### Acceptance Criteria
- [ ] Backend: Project model (name, description, goal_amount, start_date, end_date)
- [ ] Backend: Add project_id to donations table
- [ ] Backend: Project CRUD endpoints (GET, POST, PUT, DELETE /api/projects)
- [ ] Backend: Include project info in donation responses
- [ ] Frontend: Project management page (list, create, edit)
- [ ] Frontend: Add project dropdown to DonationForm
- [ ] Frontend: Show project name in DonationList
- [ ] Frontend: Project dashboard showing total raised vs goal
- [ ] RSpec tests for Project model and API
- [ ] Cypress E2E test for project assignment

### Technical Notes
- **TDD approach**: Red-Green-Refactor cycle followed for all tests
- **Model**: `rails g model Project name:string description:text goal_amount:decimal start_date:date end_date:date`
- **Migration**: `rails g migration AddProjectToDonations project:references`
- **Optional field**: project_id nullable (not all donations need projects)
- **Calculations**: `project.donations.sum(:amount)` for total raised
- **Future**: Project progress bars, analytics

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
