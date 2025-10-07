## [TICKET-006] Simple Donation Entry (Vertical Slice 2)

**Status:** 📋 Planned
**Priority:** 🔴 High
**Dependencies:** None (Donor model exists)

### User Story
As a user, I want to record donations with amount and date linked to a donor so that I can track giving history.

### Acceptance Criteria
- [ ] Backend: Donation model with amount, date, donor_id (belongs_to :donor)
- [ ] Backend: Amount validation (must be positive number)
- [ ] Backend: Date validation (not future date)
- [ ] Backend: POST /api/donations endpoint
- [ ] Backend: GET /api/donations/:id endpoint
- [ ] Frontend: DonationForm component with amount, date, donor selection
- [ ] Frontend: Donor dropdown/autocomplete (search by name)
- [ ] Frontend: Form validation (required fields)
- [ ] Frontend: Success message after submission
- [ ] RSpec tests for Donation model and API
- [ ] Jest tests for DonationForm component
- [ ] Cypress E2E test for donation creation flow

### Technical Notes
- **TDD approach**: Red-Green-Refactor cycle followed for all tests
- **Model**: `rails g model Donation amount:decimal date:date donor:references`
- **Validations**: `validates :amount, presence: true, numericality: { greater_than: 0 }`
- **Donor dropdown**: Use existing donors from GET /api/donors
- **Future**: Add recurring, project, payment method fields later
- **Keep it simple**: Just amount, date, donor for this slice

### Files Changed
- Backend: `app/models/donation.rb` (new)
- Backend: `db/migrate/..._create_donations.rb` (new)
- Backend: `app/controllers/api/donations_controller.rb` (new)
- Backend: `config/routes.rb` (add donation routes)
- Backend: `spec/models/donation_spec.rb` (new)
- Backend: `spec/requests/donations_spec.rb` (new)
- Frontend: `src/components/DonationForm.tsx` (new)
- Frontend: `src/api/client.ts` (add createDonation method)
- Frontend: `cypress/e2e/donation-entry.cy.ts` (new)

### Related Commits
- (To be added during commit)
