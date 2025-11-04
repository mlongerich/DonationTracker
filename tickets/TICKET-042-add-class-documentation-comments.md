## [TICKET-042] Add Class-Level Documentation Comments

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Effort:** S (Small - 1-2 hours)
**Created:** 2025-10-19
**Updated:** 2025-11-04
**Dependencies:** None

### User Story
As a developer, I want all classes and modules to have descriptive documentation comments so that I can quickly understand their purpose, responsibilities, and usage without reading the entire implementation.

### Problem Statement

**Current State (2025-11-04):**
Reek analysis identified **29 IrresponsibleModule warnings** across the codebase:
- Controllers: 8 files (Api::Children, Api::Donations, Api::Donors, Api::Projects, Api::Search, Api::Sponsorships, Api::Test, ApplicationController)
- Models: 6 files (Child, Donation, Donor, Project, Sponsorship, User, ApplicationRecord)
- Services: 5 files (DonorService, DonorImportService, DonorMergeService, StripeCsvBatchImporter, StripePaymentImportService)
- Concerns: 2 files (PaginationConcern, RansackFilterable)
- Jobs: 1 file (ApplicationJob)
- Mailers: 1 file (ApplicationMailer)
- Presenters: 0 files ✅ (already have documentation)

**Code Smell:** `IrresponsibleModule` (Reek warning)
**Issue:** Missing class-level comments make onboarding and maintenance harder
**Impact:** 29 out of 130 total Reek warnings (22% of all warnings)

### Acceptance Criteria
- [ ] Add documentation comments to all 8 controllers
- [ ] Add documentation comments to all 7 models (including ApplicationRecord)
- [ ] Add documentation comments to all 5 services
- [ ] Add documentation comments to all 2 concerns
- [ ] Add documentation comments to ApplicationJob
- [ ] Add documentation comments to ApplicationMailer
- [ ] All comments include purpose, responsibilities, and usage examples
- [ ] Run `bundle exec reek app/` - verify 29 fewer IrresponsibleModule warnings (130 → 101 total)
- [ ] All existing tests pass unchanged
- [ ] Update CLAUDE.md with documentation standards

### Technical Approach

#### Documentation Template

```ruby
# frozen_string_literal: true

# Handles CRUD operations for [Resource] via REST API endpoints.
#
# This controller provides:
# - Index endpoint with pagination and filtering (Ransack)
# - Create endpoint with validation
# - Show, Update, Delete endpoints
#
# All responses use [Resource]Presenter for consistent JSON formatting.
#
# @example Create a new [resource]
#   POST /api/[resources]
#   { "[resource]": { "field": "value" } }
#
# @see [Resource]Presenter for response format
# @see PaginationConcern for pagination helpers
# @see RansackFilterable for filtering logic
class Api::[Resources]Controller < ApplicationController
  # ...
end
```

#### Examples by Category

**Controllers:**
```ruby
# Handles CRUD operations for donations via REST API endpoints.
#
# Provides endpoints for:
# - Creating donations with donor and project associations
# - Listing donations with pagination and Ransack filtering (date range, donor)
# - Retrieving individual donation details
#
# All responses use DonationPresenter for consistent JSON formatting
# including donor_name and project_title computed fields.
#
# @example Create a donation
#   POST /api/donations
#   { "donation": { "amount": 100.50, "date": "2025-01-15", "donor_id": 1 } }
#
# @see DonationPresenter for response format
# @see PaginationConcern for pagination (25 per page default)
# @see RansackFilterable for filter syntax
module Api
  class DonationsController < ApplicationController
    # ...
  end
end
```

**Models:**
```ruby
# Represents a financial donation to the organization.
#
# A donation must have:
# - Positive amount (validates numericality)
# - Date (not in future)
# - Associated donor (required)
# - Optional project association
#
# Supports Ransack filtering on all attributes for search/filter features.
#
# @example Create a donation
#   Donation.create!(amount: 100.50, date: Date.today, donor: donor)
#
# @see Donor for donor relationship
# @see Project for optional project relationship
class Donation < ApplicationRecord
  # ...
end
```

**Services:**
```ruby
# Merges multiple donor records into a single donor with field-level selection.
#
# This service handles:
# - Validation of donor IDs and field selections
# - Building merged donor attributes from field selections
# - Reassigning donations from source donors to target donor
# - Soft-deleting source donors with merged_into_id tracking
# - Transaction safety (all-or-nothing merge)
#
# Uses instance pattern for complex multi-step operations.
#
# @example Merge two donors
#   service = DonorMergeService.new(
#     donor_ids: [1, 2],
#     field_selections: { name: 1, email: 2 }
#   )
#   result = service.merge
#   # => { merged_donor: Donor, merged_count: 2 }
#
# @see Donor for donor model
# @see DonorsController#merge for API endpoint
class DonorMergeService
  # ...
end
```

**Presenters:**
```ruby
# Formats Donation objects for JSON API responses.
#
# Adds computed fields:
# - donor_name: Associated donor's name
# - project_title: Associated project's title or "General Donation"
#
# Inherits from BasePresenter for standard as_json interface.
#
# @example Format a donation
#   presenter = DonationPresenter.new(donation)
#   presenter.as_json
#   # => { id: 1, amount: "100.50", donor_name: "John Doe", project_title: "Summer Campaign" }
#
# @see BasePresenter for inheritance pattern
# @see Donation model
class DonationPresenter < BasePresenter
  # ...
end
```

**Concerns:**
```ruby
# Provides Kaminari pagination helpers for controller actions.
#
# Included in controllers that need paginated collection responses
# with metadata (total_count, total_pages, current_page, per_page).
#
# Methods:
# - paginate_collection(collection): Apply Kaminari pagination (default 25/page)
# - pagination_meta(collection): Generate pagination metadata hash
#
# @example Usage in controller
#   class Api::DonorsController < ApplicationController
#     include PaginationConcern
#
#     def index
#       donors = paginate_collection(Donor.all)
#       render json: { donors: donors, meta: pagination_meta(donors) }
#     end
#   end
#
# @see Kaminari gem for pagination
module PaginationConcern
  # ...
end
```

### Benefits
- **Onboarding**: New developers understand purpose at a glance
- **Maintainability**: Clear responsibilities prevent scope creep
- **Documentation**: Comments serve as inline documentation
- **Code Quality**: Eliminates 29 IrresponsibleModule warnings (130 → 101 total Reek warnings)
- **IDE Support**: Better IntelliSense and code navigation
- **22% Improvement**: Addresses 22% of all Reek warnings in the codebase

### Files to Modify (29 total)

**Controllers (8 files):**
- `app/controllers/api/children_controller.rb`
- `app/controllers/api/donations_controller.rb`
- `app/controllers/api/donors_controller.rb`
- `app/controllers/api/projects_controller.rb`
- `app/controllers/api/search_controller.rb`
- `app/controllers/api/sponsorships_controller.rb`
- `app/controllers/api/test_controller.rb`
- `app/controllers/application_controller.rb`

**Models (7 files):**
- `app/models/application_record.rb`
- `app/models/child.rb`
- `app/models/donation.rb`
- `app/models/donor.rb`
- `app/models/project.rb`
- `app/models/sponsorship.rb`
- `app/models/user.rb`

**Services (5 files):**
- `app/services/donor_service.rb`
- `app/services/donor_import_service.rb`
- `app/services/donor_merge_service.rb`
- `app/services/stripe_csv_batch_importer.rb`
- `app/services/stripe_payment_import_service.rb`

**Concerns (2 files):**
- `app/controllers/concerns/pagination_concern.rb`
- `app/controllers/concerns/ransack_filterable.rb`

**Jobs (1 file):**
- `app/jobs/application_job.rb`

**Mailers (1 file):**
- `app/mailers/application_mailer.rb`

**Presenters (6 files):**
- ✅ Already documented (not flagged by Reek)

### Documentation Standards (for CLAUDE.md)

**Required Elements:**
1. **Purpose**: One-sentence description of what the class does
2. **Responsibilities**: Bullet list of key features/capabilities
3. **Usage Example**: Simple code example with expected output
4. **Related Classes**: @see tags for related models/services/presenters

**Best Practices:**
- Use present tense ("Handles", "Provides", "Formats")
- Include @example blocks with realistic code
- Add @see tags for discoverability
- Keep comments concise but complete
- Update comments when behavior changes

### Testing Strategy
- No new tests needed (documentation-only change)
- Run `bundle exec reek app/` to verify 0 IrresponsibleModule warnings
- All existing RSpec tests should pass unchanged

### Related Tickets
- Part of code quality improvement initiative
- Addresses Reek code smell warnings

### Notes
- This is a documentation-only ticket (no functionality changes)
- Consider adding `frozen_string_literal: true` to files that don't have it
- Use YARD documentation format for consistency with Ruby ecosystem
- Documentation helps prepare for future contributors/team expansion
