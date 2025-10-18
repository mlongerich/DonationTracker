## [TICKET-010] Children & Basic Sponsorship Tracking (Separate Sponsorship Model)

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Dependencies:** TICKET-006 (Donation model), TICKET-009 (Projects - for sponsorship project linkage)

### User Story
As an admin, I want to manage children profiles and link them to sponsors so that I can track sponsorship relationships, with each sponsorship creating its own project for donation tracking.

### Acceptance Criteria
- [ ] Backend: Child model (name, age, photo_url, bio, location)
- [ ] Backend: Sponsorship model (donor_id, child_id, project_id, monthly_amount, start_date, end_date, active)
- [ ] Backend: Each sponsorship creates a Project (type: sponsorship, title: "Sponsor {ChildName}")
- [ ] Backend: Donations link to sponsorship via project_id (not directly to sponsorship)
- [ ] Backend: Child CRUD endpoints (GET, POST, PUT, DELETE /api/children)
- [ ] Backend: Sponsorship assignment endpoints (POST, DELETE /api/sponsorships)
- [ ] Backend: GET /api/donors/:id/sponsorships (list donor's sponsored children)
- [ ] Backend: GET /api/children/:id/sponsors (list child's sponsors)
- [ ] Backend: Child name extraction from Stripe descriptions (for import)
- [ ] Backend: Automatic sponsorship creation when project type is :sponsorship
- [ ] Frontend: Child profile cards with photo and info
- [ ] Frontend: Sponsorship management interface
- [ ] Frontend: Link children to donors (creates sponsorship + project)
- [ ] Frontend: Show child info when viewing sponsorship project donations
- [ ] RSpec tests for models, associations, and import logic (10+ tests)
- [ ] Cypress E2E test for sponsorship workflow

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
- Backend: `app/models/child.rb` (new)
- Backend: `app/models/sponsorship.rb` (new)
- Backend: `app/models/donor.rb` (add has_many :sponsorships, :children)
- Backend: `db/migrate/..._create_children.rb` (new)
- Backend: `db/migrate/..._create_sponsorships.rb` (new)
- Backend: `app/controllers/api/children_controller.rb` (new)
- Backend: `app/controllers/api/sponsorships_controller.rb` (new)
- Frontend: `src/components/ChildCard.tsx` (new)
- Frontend: `src/components/SponsorshipManager.tsx` (new)

### Related Commits
- (To be added during commit)
