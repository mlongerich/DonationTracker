## [TICKET-026] Stripe Import & Webhook Integration (Core)

**Status:** 📋 Planned
**Priority:** 🔴 High
**Dependencies:** TICKET-009 (Projects), TICKET-010 (Sponsorships), TICKET-011 (Recurring)

### User Story
As an admin, I want to import historical Stripe donations from CSV and automatically sync new donations via webhooks so that I don't have to manually enter donations that come through Stripe.

### Acceptance Criteria
- [ ] Backend: Add Stripe fields to donations table (stripe_charge_id, stripe_customer_id, stripe_subscription_id)
- [ ] Backend: Add unique index on stripe_charge_id for idempotent imports
- [ ] Backend: Create `StripeDonationImportService` with hardcoded pattern matching
- [ ] Backend: CSV bulk import rake task `rails stripe:import_csv`
- [ ] Backend: Webhook endpoint POST /webhooks/stripe with signature verification
- [ ] Backend: Handle webhook event: charge.succeeded (one-time donations)
- [ ] Backend: Handle webhook event: invoice.payment_succeeded (recurring donations)
- [ ] Backend: Handle webhook event: customer.subscription.deleted (cancellations)
- [ ] Backend: Donor deduplication by email using DonorService
- [ ] Backend: Project extraction from description (General, Sponsorship, Campaign)
- [ ] Backend: Child extraction from sponsorship descriptions
- [ ] Backend: Automatic sponsorship creation for sponsorship-type donations
- [ ] Backend: Unknown descriptions create "UNMAPPED: {description}" projects
- [ ] Backend: RSpec tests for import service (10+ tests)
- [ ] Backend: RSpec tests for webhook handling (8+ tests)
- [ ] Backend: RSpec tests for deduplication and idempotency
- [ ] Frontend: Admin import status dashboard (show import progress)
- [ ] Frontend: Display Stripe metadata in donation details (charge ID, customer ID)
- [ ] Cypress E2E test for webhook receiving and donation creation

### Technical Notes
- **TDD approach**: Red-Green-Refactor cycle followed for all tests
- **CSV file**: `PFAOnlinePayments-Stripe.csv` (1,444 rows, 3.5MB)
- **Key CSV columns**:
  - Column 1: Amount (in cents)
  - Column 3: Billing Details Name (donor name)
  - Column 4: Cust Email (donor email)
  - Column 5: Created Formatted (transaction date)
  - Column 7: Description (project/child name extraction)
  - Column 21: Cust Subscription Data Plan Interval (recurring detection)
  - Column 188: Transaction ID (Stripe charge ID)
  - Column 9: Status (filter for "succeeded")

**Migration:**
```ruby
rails g migration AddStripeFieldsToDonations \
  stripe_charge_id:string \
  stripe_customer_id:string \
  stripe_subscription_id:string \
  recurring:boolean \
  frequency:integer

add_index :donations, :stripe_charge_id, unique: true
```

**Hardcoded Pattern Matching (MVP):**
```ruby
# app/services/stripe_donation_import_service.rb
def extract_project_info(description)
  case description
  when /general.*donation/i
    { type: :general, title: "General Donation" }
  when /sponsorship.*for\s+(\w+)/i
    { type: :sponsorship, child_name: $1, title: "Sponsor #{$1}" }
  when /building.*fund/i
    { type: :campaign, title: "Building Fund" }
  else
    { type: :general, title: "UNMAPPED: #{description}" }
  end
end
```

**Import Service Structure:**
```ruby
class StripeDonationImportService
  def initialize(stripe_data)
    @data = stripe_data  # Hash works for CSV row OR webhook payload
  end

  def import
    return if already_imported?  # Check stripe_charge_id

    ActiveRecord::Base.transaction do
      donor = find_or_create_donor
      project_info = extract_project_info(@data[:description])
      project = find_or_create_project(project_info)
      donation = create_donation(donor, project)

      create_sponsorship_if_needed(project_info, donor, project, donation)

      donation
    end
  end

  private

  def already_imported?
    Donation.exists?(stripe_charge_id: @data[:charge_id])
  end
end
```

**Webhook Endpoint:**
```ruby
# config/routes.rb
post '/webhooks/stripe', to: 'webhooks/stripe#create'

# app/controllers/webhooks/stripe_controller.rb
class Webhooks::StripeController < ApplicationController
  skip_before_action :verify_authenticity_token

  def create
    payload = request.body.read
    sig_header = request.env['HTTP_STRIPE_SIGNATURE']

    event = Stripe::Webhook.construct_event(
      payload,
      sig_header,
      Rails.application.credentials.stripe[:webhook_secret]
    )

    case event.type
    when 'charge.succeeded'
      handle_successful_charge(event.data.object)
    when 'invoice.payment_succeeded'
      handle_subscription_payment(event.data.object)
    when 'customer.subscription.deleted'
      handle_subscription_cancelled(event.data.object)
    end

    render json: { status: 'success' }, status: 200
  rescue Stripe::SignatureVerificationError => e
    render json: { error: 'Invalid signature' }, status: 400
  end
end
```

**CSV Import Rake Task:**
```bash
# lib/tasks/stripe_import.rake
namespace :stripe do
  desc "Import historical Stripe donations from CSV"
  task import_csv: :environment do
    require 'csv'

    file_path = Rails.root.join('PFAOnlinePayments-Stripe.csv')
    imported = 0
    skipped = 0

    CSV.foreach(file_path, headers: true) do |row|
      next unless row['Status'] == 'succeeded'

      stripe_data = {
        charge_id: row['Transaction ID'],
        customer_id: row['Cust ID'],
        customer_email: row['Cust Email'],
        customer_name: row['Billing Details Name'],
        amount: row['Amount'].to_i,
        description: row['Description'],
        created_at: DateTime.parse(row['Created Formatted']),
        subscription_id: row['Cust Subscription Data ID'],
        recurring: row['Cust Subscription Data Plan Interval'].present?
      }

      begin
        StripeDonationImportService.new(stripe_data).import
        imported += 1
        print "."
      rescue => e
        puts "\nError: #{row['Transaction ID']} - #{e.message}"
        skipped += 1
      end
    end

    puts "\n\nImport complete!"
    puts "Imported: #{imported}"
    puts "Skipped: #{skipped}"
  end
end
```

**Recurring Detection:**
- If `stripe_subscription_id` present → recurring = true
- Extract frequency from Stripe plan interval ("month" = monthly)
- Set status to :active for recurring donations

**Unknown Descriptions:**
- Create project with title "UNMAPPED: {description}"
- Admin can manually reassign later
- TICKET-027 will add proper mapping management

**Idempotency:**
- Unique index on `stripe_charge_id` prevents duplicate imports
- Re-running CSV import is safe (skips existing donations)
- Webhook replays are safe (same charge_id = no duplicate)

**Testing Strategy:**
1. Unit tests: Pattern extraction, project creation, donor deduplication
2. Integration tests: Full import flow from CSV row to database
3. Webhook tests: Signature verification, event handling
4. Idempotency tests: Re-import same donation = no duplicates

### Files Changed
- Backend: `db/migrate/..._add_stripe_fields_to_donations.rb` (new)
- Backend: `app/services/stripe_donation_import_service.rb` (new)
- Backend: `app/controllers/webhooks/stripe_controller.rb` (new)
- Backend: `lib/tasks/stripe_import.rake` (new)
- Backend: `spec/services/stripe_donation_import_service_spec.rb` (new)
- Backend: `spec/requests/webhooks/stripe_spec.rb` (new)
- Backend: `config/routes.rb` (add webhook route)
- Backend: `Gemfile` (add stripe gem if not present)
- Frontend: `src/components/StripeImportDashboard.tsx` (new - optional for MVP)

### Related Commits
- (To be added during commit)
