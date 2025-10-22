## [TICKET-048] Stripe Sponsorship & Child Extraction from Donation Descriptions

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Effort:** M (Medium - 4-6 hours)
**Created:** 2025-10-20
**Dependencies:** TICKET-010 (Child & Sponsorship models) ⏳, TICKET-026 (Stripe Import Service) ⏳

### User Story
As an admin, I want the system to automatically extract child names from Stripe donation descriptions and create sponsorship records during CSV import so that I don't have to manually enter sponsorship data from historical transactions.

### Problem Statement
Stripe CSV export contains sponsorship information embedded in donation descriptions:
- `"Monthly Sponsorship Donation for Sangwan"` → Should auto-create Child "Sangwan" + Sponsorship + Project
- `"$100 - General Monthly Donation"` → General donation (no child extraction)
- Current DonorImportService only handles donor data, not donation/sponsorship data

### Acceptance Criteria

#### Backend: Child Name Extraction Logic
- [ ] Create `ChildExtractionService` for parsing donation descriptions
- [ ] Pattern matching for sponsorship descriptions:
  - [ ] `/sponsorship.*for\s+([A-Z][a-z]+)/i` → Extract child name
  - [ ] `/sponsor\s+([A-Z][a-z]+)/i` → Alternative pattern
  - [ ] Return `nil` if no child name found (general donation)
- [ ] Case-insensitive matching with proper capitalization of extracted names
- [ ] Handle multiple name formats: "for Sangwan", "for John Smith", "Sponsor Maria"

#### Backend: Auto-Create Child Records
- [ ] `Child.find_or_create_by(name: extracted_name)`
- [ ] Set default values: age=nil, bio="Auto-created from Stripe import", location=nil
- [ ] Return existing child if name already exists (case-insensitive match)

#### Backend: Auto-Create Sponsorship Records
- [ ] When child is extracted, create Sponsorship record:
  - [ ] donor_id: from DonorService (existing logic)
  - [ ] child_id: from extracted/created child
  - [ ] monthly_amount: from Stripe amount field
  - [ ] start_date: from Stripe transaction date (first occurrence)
  - [ ] active: true
  - [ ] project_id: auto-created by Sponsorship model callback
- [ ] Check for existing sponsorship (donor + child) to avoid duplicates
- [ ] Update existing sponsorship if found (don't create duplicate)

#### Backend: Integration with StripeDonationImportService
- [ ] Extend `StripeDonationImportService` (from TICKET-026) to:
  1. Extract donor info (existing logic)
  2. Extract child name from description (NEW)
  3. Create/find Child record (NEW)
  4. Create/find Sponsorship record (NEW)
  5. Auto-create Project via Sponsorship (existing TICKET-010 logic)
  6. Create Donation linked to project_id (existing logic)
- [ ] Transaction-wrapped to ensure atomicity (donor + child + sponsorship + project + donation)
- [ ] Rollback entire operation if any step fails

#### Backend Testing (RSpec)
- [ ] ChildExtractionService specs:
  - [ ] Extracts child name from "Monthly Sponsorship Donation for Sangwan"
  - [ ] Extracts child name from "Sponsor John"
  - [ ] Returns nil for "General Monthly Donation"
  - [ ] Handles case-insensitive matching
  - [ ] Properly capitalizes extracted names
  - [ ] **5+ tests**
- [ ] StripeDonationImportService specs (child extraction):
  - [ ] Creates new child when sponsorship description found
  - [ ] Finds existing child by name (case-insensitive)
  - [ ] Creates new sponsorship linking donor + child
  - [ ] Finds existing sponsorship and doesn't duplicate
  - [ ] Auto-creates project via sponsorship
  - [ ] Links donation to sponsorship project
  - [ ] Skips child extraction for general donations
  - [ ] Handles transaction rollback on failure
  - [ ] **8+ tests**
- [ ] Integration tests:
  - [ ] Full CSV import creates donors + children + sponsorships + projects + donations
  - [ ] Re-importing same CSV doesn't create duplicates
  - [ ] **2+ tests**
- [ ] **Total: 15+ tests**

#### CSV Import Enhancement
- [ ] Update `rails stripe:import_csv` rake task to use enhanced import service
- [ ] Log child extraction results: "Created 15 children, 20 sponsorships"
- [ ] Report unmapped descriptions (no child extracted but contains "sponsorship" keyword)
- [ ] Dry-run mode: `rails stripe:import_csv[dry_run]` to preview without saving

#### Documentation
- [ ] Update TICKET-026 to reference TICKET-048 for child extraction
- [ ] Document pattern matching rules in CLAUDE.md
- [ ] Add examples to DonationTracking.md

### Technical Approach

#### 1. Create ChildExtractionService

```ruby
# app/services/child_extraction_service.rb
class ChildExtractionService
  SPONSORSHIP_PATTERNS = [
    /sponsorship.*for\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /sponsor\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /for\s+([A-Z][a-z]+)(?:\s+sponsorship)?/i
  ].freeze

  def initialize(description)
    @description = description
  end

  def extract_child_name
    return nil if @description.blank?

    SPONSORSHIP_PATTERNS.each do |pattern|
      match = @description.match(pattern)
      return capitalize_name(match[1]) if match
    end

    nil
  end

  private

  def capitalize_name(name)
    name.split.map(&:capitalize).join(' ')
  end
end
```

#### 2. Enhance StripeDonationImportService

```ruby
# app/services/stripe_donation_import_service.rb
class StripeDonationImportService
  def initialize(stripe_data)
    @data = stripe_data
  end

  def import
    return if already_imported?

    ActiveRecord::Base.transaction do
      donor = find_or_create_donor
      child_name = extract_child_name

      if child_name.present?
        child = find_or_create_child(child_name)
        sponsorship = find_or_create_sponsorship(donor, child)
        project = sponsorship.project  # Auto-created by Sponsorship callback
      else
        project = find_or_create_project_from_description
      end

      create_donation(donor, project)
    end
  end

  private

  def extract_child_name
    ChildExtractionService.new(@data[:description]).extract_child_name
  end

  def find_or_create_child(name)
    Child.find_or_create_by(name: name) do |child|
      child.bio = "Auto-created from Stripe import on #{Time.current.to_date}"
    end
  end

  def find_or_create_sponsorship(donor, child)
    # Find existing or create new sponsorship
    sponsorship = Sponsorship.find_by(donor: donor, child: child, active: true)

    return sponsorship if sponsorship.present?

    # Create new sponsorship (will auto-create project via callback)
    Sponsorship.create!(
      donor: donor,
      child: child,
      monthly_amount: @data[:amount] / 100.0,  # Convert cents to dollars
      start_date: @data[:created_at].to_date,
      active: true
    )
  end
end
```

#### 3. Update Sponsorship Model with Callback

```ruby
# app/models/sponsorship.rb (enhancement)
class Sponsorship < ApplicationRecord
  belongs_to :donor
  belongs_to :child
  belongs_to :project, optional: true  # Will be set by callback

  after_create :create_sponsorship_project

  validates :donor, :child, :monthly_amount, presence: true
  validates :monthly_amount, numericality: { greater_than: 0 }
  validates :active, inclusion: { in: [true, false] }

  private

  def create_sponsorship_project
    return if project.present?  # Skip if already assigned

    self.project = Project.create!(
      project_type: :sponsorship,
      title: "Sponsor #{child.name}",
      system: false
    )
    save!
  end
end
```

#### 4. Rake Task Enhancement

```ruby
# lib/tasks/stripe_import.rake (enhancement)
namespace :stripe do
  desc "Import historical Stripe donations with sponsorship extraction"
  task :import_csv, [:mode] => :environment do |t, args|
    mode = args[:mode] || 'live'  # 'live' or 'dry_run'

    puts "Running in #{mode.upcase} mode..."

    imported_donations = 0
    created_donors = 0
    created_children = 0
    created_sponsorships = 0
    skipped = 0
    errors = []

    CSV.foreach(file_path, headers: true) do |row|
      next unless row['Status'] == 'succeeded'

      stripe_data = build_stripe_data(row)

      begin
        if mode == 'dry_run'
          # Preview what would be created
          preview_import(stripe_data)
        else
          result = StripeDonationImportService.new(stripe_data).import
          imported_donations += 1
          created_donors += 1 if result[:donor_created]
          created_children += 1 if result[:child_created]
          created_sponsorships += 1 if result[:sponsorship_created]
        end

        print "."
      rescue => e
        skipped += 1
        errors << { charge_id: row['Transaction ID'], error: e.message }
        print "E"
      end
    end

    puts "\n\nImport Summary:"
    puts "Donations: #{imported_donations}"
    puts "Donors created: #{created_donors}"
    puts "Children created: #{created_children}"
    puts "Sponsorships created: #{created_sponsorships}"
    puts "Skipped: #{skipped}"
    puts "\nErrors:" if errors.any?
    errors.each { |e| puts "  - #{e[:charge_id]}: #{e[:error]}" }
  end
end
```

### Pattern Matching Examples

| Stripe Description | Extracted Child Name | Result |
|-------------------|---------------------|---------|
| "Monthly Sponsorship Donation for Sangwan" | "Sangwan" | ✅ Creates child + sponsorship |
| "Sponsor John Smith" | "John Smith" | ✅ Creates child + sponsorship |
| "Sponsorship for Maria" | "Maria" | ✅ Creates child + sponsorship |
| "$100 - General Monthly Donation" | nil | ❌ General donation (no child) |
| "Building Fund Contribution" | nil | ❌ Campaign donation (no child) |
| "for Aiden - Monthly Support" | "Aiden" | ✅ Creates child + sponsorship |

### Edge Cases to Handle

1. **Duplicate Child Names**: If "Sangwan" already exists, reuse existing child
2. **Duplicate Sponsorships**: If donor already sponsors child, don't create duplicate
3. **Multiple Children per Donor**: One donor can sponsor many children (allowed)
4. **Multiple Sponsors per Child**: One child can have many sponsors (allowed)
5. **Name Variations**: "Sangwan" vs "sangwan" vs "SANGWAN" → Normalize to "Sangwan"
6. **Partial Matches**: "sponsorship" keyword but no extractable name → Log warning

### Benefits
- **Automated Data Entry**: Historical sponsorships imported automatically
- **Donor-Child Linking**: Relationships preserved from Stripe data
- **Project Creation**: Each sponsorship gets its own project automatically
- **Donation Tracking**: Donations correctly linked to sponsorship projects
- **Idempotency**: Re-running import is safe (no duplicates)
- **Audit Trail**: Auto-created children have "imported from Stripe" in bio field

### Files to Create
- `app/services/child_extraction_service.rb`
- `spec/services/child_extraction_service_spec.rb` (5+ tests)
- Enhancement to `app/services/stripe_donation_import_service.rb` (from TICKET-026)
- Enhancement to `spec/services/stripe_donation_import_service_spec.rb` (8+ tests)
- Enhancement to `lib/tasks/stripe_import.rake` (dry-run mode, summary stats)

**Total: 2 new files + 3 enhanced files**

### Files to Modify
- `app/models/sponsorship.rb` - Add `after_create :create_sponsorship_project` callback
- `spec/models/sponsorship_spec.rb` - Add tests for auto-project creation
- `CLAUDE.md` - Document child extraction patterns
- `DonationTracking.md` - Add Stripe import examples

### Implementation Strategy

**Phase 1: Child Extraction Service (1 hour)**
1. TDD: Write ChildExtractionService specs
2. Implement pattern matching logic
3. Test with real Stripe description examples

**Phase 2: Sponsorship Auto-Creation (2 hours)**
1. Add after_create callback to Sponsorship model
2. Write specs for auto-project creation
3. Test find_or_create logic for children and sponsorships

**Phase 3: Import Service Integration (2 hours)**
1. Enhance StripeDonationImportService
2. Write integration specs
3. Test full import flow with sponsorship descriptions

**Phase 4: Rake Task Enhancement (1 hour)**
1. Add dry-run mode
2. Add summary statistics
3. Test with actual Stripe CSV file

**Total Estimated Time: 6 hours**

### Testing Strategy

**Unit Tests:**
- ChildExtractionService: Pattern matching accuracy
- Sponsorship model: Auto-project creation callback
- Child model: find_or_create logic

**Integration Tests:**
- Full import flow: CSV row → Donor + Child + Sponsorship + Project + Donation
- Idempotency: Re-importing same data doesn't duplicate
- Transaction rollback: Failed import doesn't leave partial data

**Manual Testing:**
- Run dry-run mode with actual Stripe CSV
- Verify child extraction report
- Check database for correct relationships

### Related Tickets
- 📋 TICKET-010: Child & Sponsorship models (prerequisite)
- 📋 TICKET-026: Stripe Import & Webhook Integration (base import service)
- ✅ TICKET-009: Projects with sponsorship type (complete)

### Related Commits
- (To be added during implementation)

### Future Enhancements (Out of Scope)
- Machine learning for fuzzy name matching
- Admin UI to review/correct auto-extracted children
- Photo extraction from Stripe metadata (if available)
- Bulk sponsorship reassignment tools
