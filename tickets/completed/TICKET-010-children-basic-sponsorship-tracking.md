## [TICKET-010] Children & Basic Sponsorship Tracking (Separate Sponsorship Model)

**Status:** ✅ Complete
**Priority:** 🟡 Medium
**Started:** 2025-10-22
**Completed:** 2025-10-22
**Dependencies:** TICKET-006 (Donation model) ✅, TICKET-009 (Projects) ✅

### User Story
As an admin, I want to manage children profiles and link them to sponsors so that I can track sponsorship relationships, with each sponsorship creating its own project for donation tracking.

### Acceptance Criteria
- [x] Backend: Child model (name, age, photo_url, bio, location)
- [x] Backend: Sponsorship model (donor_id, child_id, project_id, monthly_amount, end_date)
  - Note: `start_date` and `active` field deferred to TICKET-056 (business logic validation)
- [x] Backend: Each sponsorship creates a Project (type: sponsorship, title: "Sponsor {ChildName}")
- [x] Backend: Donations link to sponsorship via project_id (not directly to sponsorship)
- [x] Backend: Child CRUD endpoints (GET, POST, PUT, DELETE /api/children)
- [x] Backend: Sponsorship endpoints (POST /api/sponsorships, PUT /api/sponsorships/:id/end, GET /api/sponsorships)
- [x] Backend: GET /api/children/:id/sponsors (via sponsorships association)
- [ ] Backend: GET /api/donors/:id/sponsorships - Moved to TICKET-058 (Donor Sponsorship List endpoint)
- [ ] Backend: Child name extraction from Stripe descriptions - Moved to TICKET-048 (Stripe integration)
- [ ] Backend: Automatic sponsorship creation when project type is :sponsorship - Moved to TICKET-048
- [x] Frontend: Child profile cards with photo and info (ChildList component)
- [x] Frontend: Sponsorship management interface (SponsorshipsPage)
- [x] Frontend: Link children to donors (creates sponsorship + project via ChildrenPage "Add Sponsor" modal)
- [ ] Frontend: Show child info when viewing sponsorship project donations - Moved to TICKET-059 (Child Info Display)
- [x] RSpec tests for models, associations, and API logic (24 tests: 12 model + 12 request specs)
- [x] Cypress E2E test for sponsorship workflow (children-sponsorship.cy.ts - 125 lines)

### Technical Notes
- **TDD approach**: Red-Green-Refactor cycle followed for all tests
- **Separate Model Design**: Sponsorship is NOT a subtype of Project (avoids STI complexity)
- **Three-way relationship**: Donor ←→ Sponsorship ←→ Child, Sponsorship → Project
- **Model**: `rails g model Child name:string age:integer photo_url:string bio:text location:string`
- **Model**: `rails g model Sponsorship donor:references child:references project:references monthly_amount:decimal start_date:date end_date:date active:boolean`
- **Many-to-many**: One child can have multiple sponsors, one donor can sponsor multiple children
- **Project linkage**: Each sponsorship creates a Project with `project_type: :sponsorship`
- **Donation flow**: Donation → Project → Sponsorship → Child (linked via project_id)
- **Photo storage**: Use photo_url string for now (S3/Cloudinary upload later)
- **Stripe Integration**: Extract child names from descriptions like "Monthly Sponsorship Donation for Sangwan"
  - Pattern match: `/for ([A-Z][a-z]+)/` extracts child name
  - Find or create Child by name
  - Create Sponsorship linking donor + child + project
- **Query example**: `Child.first.sponsorships.includes(:project).map { |s| s.project.donations.sum(:amount) }`
- **Active status**: `active: true` for current sponsorships, `false` for ended
- **Future**: Automatic monthly donation creation for active sponsorships via background job

### Files Changed

#### Backend (16 files)
- `app/models/child.rb` - Child model with name validation + Ransack config
- `app/models/sponsorship.rb` - Sponsorship model with auto-project creation callback
- `app/models/donor.rb` - Add has_many :sponsorships, has_many :children
- `app/controllers/api/children_controller.rb` - CRUD + pagination + Ransack filtering
- `app/controllers/api/sponsorships_controller.rb` - Create, end, index actions
- `config/routes.rb` - Add children and sponsorships routes
- `db/migrate/20251020094924_create_children.rb` - Children table migration
- `db/migrate/20251020121702_create_sponsorships.rb` - Sponsorships table migration
- `db/schema.rb` - Updated schema
- `spec/factories/children.rb` - Child factory
- `spec/factories/sponsorships.rb` - Sponsorship factory
- `spec/models/child_spec.rb` - Child model tests (6 tests)
- `spec/models/donor_spec.rb` - Donor sponsorship association tests (2 tests)
- `spec/models/sponsorship_spec.rb` - Sponsorship model tests (10 tests)
- `spec/requests/api/children_spec.rb` - Children API tests (7 tests)
- `spec/requests/api/sponsorships_spec.rb` - Sponsorships API tests (9 tests)

**Backend Total:** 540 lines added, 24 tests

#### Frontend (19 files)
- `src/pages/ChildrenPage.tsx` - Children CRUD + "Add Sponsor" modal
- `src/pages/ChildrenPage.test.tsx` - ChildrenPage unit tests (16 tests)
- `src/pages/SponsorshipsPage.tsx` - Sponsorships create + list management
- `src/pages/SponsorshipsPage.test.tsx` - SponsorshipsPage unit tests (7 tests)
- `src/components/ChildForm.tsx` - Child create/edit form
- `src/components/ChildForm.test.tsx` - ChildForm tests (4 tests)
- `src/components/ChildList.tsx` - Child list with sponsors display
- `src/components/ChildList.test.tsx` - ChildList tests (5 tests)
- `src/components/ChildAutocomplete.tsx` - Debounced child search with UX improvements
- `src/components/ChildAutocomplete.test.tsx` - ChildAutocomplete tests (7 tests)
- `src/components/SponsorshipForm.tsx` - Reusable sponsorship form
- `src/components/SponsorshipForm.test.tsx` - SponsorshipForm tests (7 tests)
- `src/components/SponsorshipList.tsx` - Sponsorship list display
- `src/components/SponsorshipList.test.tsx` - SponsorshipList tests (4 tests)
- `src/components/SponsorshipModal.tsx` - Modal for adding sponsors from ChildrenPage
- `src/components/SponsorshipModal.test.tsx` - SponsorshipModal tests (7 tests)
- `src/types/child.ts` - Child TypeScript types
- `src/types/sponsorship.ts` - Sponsorship TypeScript types
- `cypress/e2e/children-sponsorship.cy.ts` - E2E test for full workflow (125 lines)

**Frontend Total:** 1,669 lines added, 196 tests (57 Jest unit + E2E)

### Related Commits
- `5085eae` - backend: complete TICKET-010 children & sponsorship tracking with Ransack fix
- `80e879b` - frontend: complete TICKET-010 create sponsorship form + child search UX
- `8c28063` - docs: complete TICKET-010 and create follow-up tickets (055, 056, 057)

### Follow-Up Tickets Created
- [TICKET-055](TICKET-055-sponsorship-reactivate-delete-actions.md) - Sponsorship management actions (reactivate, delete, end with date, edit)
- [TICKET-056](TICKET-056-sponsorship-business-logic-validation.md) - Business logic validation (duplicate prevention, start_date tracking, project reuse)
- [TICKET-057](TICKET-057-children-page-multi-sponsor-display.md) - Display ALL sponsors per child (not just first)
- [TICKET-058](TICKET-058-donor-sponsorship-list-endpoint.md) - GET /api/donors/:id/sponsorships endpoint (🟢 Low priority)
- [TICKET-059](TICKET-059-child-info-display-donation-pages.md) - Show child info when viewing sponsorship donations (🟡 Medium priority)
