## [TICKET-010] Children & Basic Sponsorship Tracking

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Dependencies:** TICKET-006 (Donation model)

### User Story
As an admin, I want to manage children profiles and link them to sponsors so that I can track sponsorship relationships.

### Acceptance Criteria
- [ ] Backend: Child model (name, age, photo_url, bio, location)
- [ ] Backend: Sponsorship model (donor_id, child_id, monthly_amount, start_date, end_date)
- [ ] Backend: Child CRUD endpoints
- [ ] Backend: Sponsorship assignment endpoints (POST, DELETE)
- [ ] Backend: GET /api/donors/:id/sponsorships (list donor's sponsored children)
- [ ] Backend: GET /api/children/:id/sponsors (list child's sponsors)
- [ ] Frontend: Child profile cards with photo and info
- [ ] Frontend: Sponsorship management interface
- [ ] Frontend: Link children to donors
- [ ] RSpec tests for models and associations
- [ ] Cypress E2E test for sponsorship workflow

### Technical Notes
- **TDD approach**: Red-Green-Refactor cycle followed for all tests
- **Models**: Child, Sponsorship (join table with additional data)
- **Many-to-many**: One child can have multiple sponsors, one donor can sponsor multiple children
- **Photo storage**: Use image_url string for now (upload later)
- **Monthly amount**: Track per-sponsorship amount
- **Status**: Add active/inactive to sponsorship
- **Future**: Automatic donation creation for sponsorships

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
