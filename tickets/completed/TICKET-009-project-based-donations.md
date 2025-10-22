## [TICKET-009] Project-Based Donations (Hybrid Approach)

**Status:** ✅ Complete
**Priority:** 🟡 Medium (Required for Stripe import - TICKET-024)
**Dependencies:** TICKET-006 (Donation model)
**Started:** 2025-10-18
**Completed:** 2025-10-19

### User Story
As an admin, I want to assign donations to specific projects/campaigns so that I can track funding for different initiatives, with all donations defaulting to "General Donation" if no project is specified.

### Acceptance Criteria
- [x] Backend: Project model (title, description, project_type, system)
- [x] Backend: Add nullable project_id to donations table (optional: true in model)
- [x] Backend: Seed "General Donation" system project in migration
- [x] Backend: Project CRUD endpoints (GET, POST, PUT, DELETE /api/projects)
- [x] Backend: Prevent deletion/editing of system projects (validation)
- [x] Backend: Include project info in donation responses via DonationPresenter
- [ ] Backend: Project extraction from description text (for Stripe import - deferred to TICKET-024)
- [x] Frontend: Project management page (list, create, edit - excluding system projects)
- [x] Frontend: Add project dropdown to DonationForm with "General Donation" pre-selected
- [x] Frontend: Show project title in DonationList (display "General Donation" for null project_id)
- [x] RSpec tests for Project model, validations, and API (8+ tests)
- [x] Cypress E2E test for project assignment and default behavior
- [x] Bug fix: Added project_id to donation_params permit list

### Technical Notes
- **TDD approach**: Red-Green-Refactor cycle followed for all tests
- **Hybrid Model Design**: Schema allows nullable project_id, but UI provides project selection
- **Model**: `rails g model Project title:string description:text project_type:integer system:boolean`
- **Migration**: `rails g migration AddProjectToDonations project:references`
- **Project types enum**: `enum project_type: { general: 0, campaign: 1, sponsorship: 2 }`
- **System project**: "General Donation" created in migration with `system: true, project_type: :general`
- **Validation**: Prevent deletion/editing of projects where `system: true`
- **Presenter pattern**: `DonationPresenter#as_json` includes `project_title: object.project&.title || "General Donation"`
- **Frontend logic**: Project dropdown with "General Donation" pre-selected by default
- **Migration path**: Existing donations with null project_id display as "General Donation" in UI
- **Stripe Integration** (future): Extract project titles from Stripe description field
  - "Monthly Sponsorship Donation for Sangwan" → Project: "Sponsor Sangwan"
  - "$100 - General Monthly Donation" → Project: "General Donation"

### Files Changed

**Backend:**
- `app/models/project.rb` - Project model with enum, validations, system flag
- `app/models/donation.rb` - Added belongs_to :project association
- `app/controllers/api/projects_controller.rb` - CRUD endpoints with system project protection
- `app/controllers/api/donations_controller.rb` - Added project_id to permit params
- `app/presenters/donation_presenter.rb` - Added project_title to JSON output
- `db/migrate/20251018123011_create_projects.rb` - Projects table with General Donation seed
- `db/migrate/20251018125407_add_project_to_donations.rb` - Added project_id to donations
- `spec/models/project_spec.rb` - 8 model tests
- `spec/requests/api/projects_spec.rb` - 7 API request tests
- `spec/requests/donations_spec.rb` - Added project_id save test
- `spec/factories/projects.rb` - Factory Bot project factory
- `config/routes.rb` - Added projects resource route

**Frontend:**
- `src/pages/ProjectsPage.tsx` - Full CRUD page with MUI styling
- `src/components/ProjectForm.tsx` - Create/update form with Stack spacing
- `src/components/ProjectForm.test.tsx` - 5 component tests
- `src/components/ProjectList.tsx` - List with Edit/Delete buttons
- `src/components/ProjectList.test.tsx` - 5 component tests
- `src/components/DonationForm.tsx` - Added project selection dropdown
- `src/components/DonationForm.test.tsx` - Updated tests for project field
- `src/components/DonationList.tsx` - Display project title or "General Donation"
- `src/components/DonationList.test.tsx` - Added project title display tests
- `src/api/client.ts` - Added fetchProjects, createProject, updateProject, deleteProject
- `src/App.tsx` - Added /projects route with BrowserRouter
- `src/App.test.tsx` - Added routing tests
- `cypress/e2e/project-management.cy.ts` - E2E test for projects page

**Documentation:**
- `BACKLOG.md` - Added page separation feature idea
- `tickets/TICKET-009-project-based-donations.md` - Updated to complete status

### Related Commits
- Backend commit: Project model, API endpoints, tests, donation integration
- Frontend commit: ProjectsPage, routing, components, tests, API client
- Docs commit: TICKET-009 and DonationTracking.md updates
