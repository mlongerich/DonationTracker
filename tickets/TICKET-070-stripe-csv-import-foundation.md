## [TICKET-070] Stripe CSV Import Foundation

**Status:** ✅ Complete
**Priority:** 🔴 High
**Dependencies:** None
**Created:** 2025-11-01
**Updated:** 2025-11-02
**Completed:** 2025-11-02

## Final Summary

**✅ Complete: Production-Ready StripePaymentImportService**
- 17 comprehensive tests, 245 total suite tests passing
- 95.46% test coverage (exceeds 95% requirement)
- All acceptance criteria met
- Transaction-wrapped, error-handled, fully tested

**Key Features Delivered:**
- StripeInvoice abstraction (handles multi-child sponsorships)
- Smart field selection (Nickname with Description fallback)
- 5-tier pattern matching (sponsorship, general, campaign, email, unmapped)
- Child & donor deduplication
- Idempotent imports
- Atomicity via transactions

**⭐ CODE LIFECYCLE: PERMANENT - Core Reusable Service**

**This ticket creates the PERMANENT foundation that TICKET-026 (webhooks) depends on.**
The `StripePaymentImportService` will be reused by both:
- One-time CSV import (TICKET-071 - temporary)
- Long-term webhook integration (TICKET-026 - permanent)

**DO NOT treat this as throwaway code.** This is production-critical infrastructure.

### User Story
As an admin, I want to import historical Stripe donation data from CSV so that I can migrate existing donation records into the system without manual entry.

### Problem Statement
The project has a Stripe CSV export (`PFAOnlinePayments-Stripe.csv`) with 1,303 successful transactions that need to be imported. The data includes:
- One-time donations
- Recurring sponsorships (monthly child sponsorships)
- General recurring donations
- Multi-child sponsorships (single transaction → multiple children)
- Various edge cases (missing emails, unmapped descriptions)

**Current Gap:** No mechanism to import Stripe CSV data into the database.

### Acceptance Criteria

**Database Schema (PERMANENT):**
- [x] Backend: Migration adds Stripe fields to donations table
  - `stripe_charge_id:string` (indexed, non-unique)
  - `stripe_customer_id:string`
  - `stripe_subscription_id:string`
  - `stripe_invoice_id:string` (references stripe_invoices)
- [x] Backend: Created stripe_invoices table for 1-to-many relationship
  - `stripe_invoice_id:string` (indexed, unique)
  - `stripe_charge_id:string`
  - `stripe_customer_id:string`
  - `stripe_subscription_id:string`
  - `total_amount_cents:integer`
  - `invoice_date:date`

**Core Service (PERMANENT - Reused by Webhooks):**
- [x] Backend: `StripePaymentImportService` processes single Stripe payment record
- [x] Backend: Service accepts Hash input (works for CSV rows OR webhook payloads)
- [x] Backend: Extract donor info (name, email) with deduplication via `DonorService`
- [x] Backend: Extract child names from sponsorship descriptions
- [x] Backend: Handle multi-child sponsorships (split into separate donations, share StripeInvoice)
- [x] Backend: Pattern matching for project extraction
  - [x] "Monthly Sponsorship Donation for {ChildName}" → sponsorship project
  - [x] "$X - General Monthly Donation" → general project
  - [x] "Donation for Campaign {ID}" → campaign project
  - [x] Email addresses → "General Donation" project
  - [x] Unmapped → "UNMAPPED: {description}" project
- [x] Backend: Smart field selection (Nickname primary, Description fallback)
- [x] Backend: Amount conversion (CSV is in dollars, convert to cents for DB)
- [x] Backend: Idempotent import (skip if StripeInvoice exists)
- [x] Backend: Auto-create Child, Sponsorship, Project as needed
- [x] Backend: Child deduplication (find_or_create_by)
- [x] Backend: Comprehensive error handling with detailed messages
- [x] Backend: Transaction wrapper for atomicity

**Testing & Documentation:**
- [x] Backend: RSpec tests (17 tests covering all patterns, 245 total suite tests)
- [x] All tests pass (95.46% coverage exceeds 95%)
- [x] Update CLAUDE.md with Stripe import service pattern
- [x] SimpleCov configured with 95% threshold
- [x] Pre-commit hooks enforce coverage

### Technical Approach

#### 1. Database Migration

```ruby
# db/migrate/YYYYMMDD_add_stripe_fields_to_donations.rb
class AddStripeFieldsToDonations < ActiveRecord::Migration[8.0]
  def change
    add_column :donations, :stripe_charge_id, :string
    add_column :donations, :stripe_customer_id, :string
    add_column :donations, :stripe_subscription_id, :string

    add_index :donations, :stripe_charge_id, unique: true
    add_index :donations, :stripe_customer_id
  end
end
```

#### 2. Service Object Structure

```ruby
# app/services/stripe_payment_import_service.rb
#
# Imports a single Stripe payment record from CSV into the database.
#
# Handles:
# - Donor deduplication via DonorService
# - Child extraction from sponsorship descriptions
# - Multi-child sponsorship splitting
# - Project creation/lookup with pattern matching
# - Sponsorship auto-creation
# - Idempotent imports via stripe_charge_id
#
# @example Import from CSV row hash
#   csv_row = {
#     'Amount' => '100',
#     'Billing Details Name' => 'John Doe',
#     'Cust Email' => 'john@example.com',
#     'Created Formatted' => '2020-06-15 00:56:17 +0000',
#     'Description' => 'Monthly Sponsorship Donation for Sangwan',
#     'Transaction ID' => 'txn_123',
#     'Cust ID' => 'cus_abc',
#     'Cust Subscription Data ID' => 'sub_xyz',
#     'Status' => 'succeeded'
#   }
#   service = StripePaymentImportService.new(csv_row)
#   result = service.import
#   # => { success: true, donations: [<Donation>], skipped: false }
#
# @example Idempotent re-import
#   service = StripePaymentImportService.new(csv_row)
#   service.import # => { success: true, skipped: true, reason: 'Already imported' }
#
class StripePaymentImportService
  SPONSORSHIP_PATTERN = /Monthly Sponsorship Donation for (.+)/i
  GENERAL_PATTERN = /\$(\d+) - General Monthly Donation/i
  CAMPAIGN_PATTERN = /Donation for Campaign (\d+)/i

  def initialize(csv_row)
    @csv_row = csv_row
    @imported_donations = []
    @errors = []
  end

  # Main import method
  # @return [Hash] { success: true/false, donations: Array, skipped: true/false, reason: String, errors: Array }
  def import
    return skip_result('Status not succeeded') unless succeeded?
    return skip_result('Already imported') if already_imported?

    ActiveRecord::Base.transaction do
      donor = find_or_create_donor
      child_names = extract_child_names

      if child_names.any?
        import_sponsorship_donations(donor, child_names)
      else
        import_single_donation(donor)
      end
    end

    success_result
  rescue StandardError => error
    error_result(error)
  end

  private

  attr_reader :csv_row, :imported_donations, :errors

  # Check if transaction succeeded
  def succeeded?
    csv_row['Status']&.downcase == 'succeeded'
  end

  # Check if already imported (idempotency)
  def already_imported?
    return false if stripe_charge_id.blank?
    Donation.exists?(stripe_charge_id: stripe_charge_id)
  end

  # Find or create donor using DonorService
  def find_or_create_donor
    donor_attributes = {
      name: csv_row['Billing Details Name']&.strip,
      email: csv_row['Cust Email']&.strip&.downcase
    }

    result = DonorService.new(
      donor_attributes: donor_attributes,
      transaction_date: transaction_date
    ).find_or_update

    result[:donor]
  end

  # Extract child name(s) from description
  # @return [Array<String>] Child names (empty if not sponsorship)
  def extract_child_names
    description = csv_row['Description']
    return [] if description.blank?

    match = description.match(SPONSORSHIP_PATTERN)
    return [] unless match

    # Handle comma-separated children (e.g., "Wan,Monthly Sponsorship Donation for Orawan")
    child_text = match[1]
    child_text.split(',').map(&:strip).reject(&:blank?)
  end

  # Import sponsorship donations (one per child)
  def import_sponsorship_donations(donor, child_names)
    child_names.each do |child_name|
      child = find_or_create_child(child_name)
      project = find_or_create_sponsorship_project(child)

      donation = create_donation(
        donor: donor,
        project: project,
        child_id: child.id
      )

      imported_donations << donation
    end
  end

  # Import single non-sponsorship donation
  def import_single_donation(donor)
    project = find_or_create_project_from_description

    donation = create_donation(
      donor: donor,
      project: project,
      child_id: nil
    )

    imported_donations << donation
  end

  # Find or create child by name
  def find_or_create_child(child_name)
    Child.find_or_create_by!(name: child_name.strip)
  end

  # Find or create sponsorship project for child
  def find_or_create_sponsorship_project(child)
    # Reuse existing sponsorship project for this child if available
    existing_project = child.sponsorships
                            .where.not(project_id: nil)
                            .first&.project

    return existing_project if existing_project

    # Create new sponsorship project
    Project.create!(
      title: "Sponsor #{child.name}",
      project_type: :sponsorship,
      system: false
    )
  end

  # Extract project from description using pattern matching
  def find_or_create_project_from_description
    description = csv_row['Description']

    # General donation pattern
    if description&.match(GENERAL_PATTERN)
      return find_or_create_general_project
    end

    # Campaign donation pattern
    if match = description&.match(CAMPAIGN_PATTERN)
      campaign_id = match[1]
      return find_or_create_campaign_project(campaign_id)
    end

    # Unmapped - create project with description for admin review
    find_or_create_unmapped_project(description)
  end

  def find_or_create_general_project
    Project.find_or_create_by!(
      title: "General Donation",
      project_type: :general,
      system: true
    )
  end

  def find_or_create_campaign_project(campaign_id)
    title = "Campaign #{campaign_id}"
    Project.find_or_create_by!(title: title) do |project|
      project.project_type = :campaign
      project.system = false
    end
  end

  def find_or_create_unmapped_project(description)
    # Truncate description to reasonable title length
    truncated = description.to_s.truncate(100)
    title = "UNMAPPED: #{truncated}"

    Project.find_or_create_by!(title: title) do |project|
      project.project_type = :general
      project.system = false
      project.description = "Auto-created from Stripe import. Original description: #{description}"
    end
  end

  # Create donation record
  def create_donation(donor:, project:, child_id:)
    Donation.create!(
      donor: donor,
      project: project,
      child_id: child_id,
      amount: amount_in_cents,
      date: transaction_date,
      status: 'succeeded',
      description: csv_row['Description'],
      stripe_charge_id: stripe_charge_id,
      stripe_customer_id: csv_row['Cust ID'],
      stripe_subscription_id: csv_row['Cust Subscription Data ID']
    )
  end

  # Convert amount from dollars to cents
  # CSV shows "100" for $100.00, DB stores 10000 cents
  def amount_in_cents
    amount_dollars = csv_row['Amount'].to_f
    (amount_dollars * 100).to_i
  end

  def transaction_date
    @transaction_date ||= DateTime.parse(csv_row['Created Formatted'])
  rescue ArgumentError
    Date.today
  end

  def stripe_charge_id
    csv_row['Transaction ID']
  end

  # Result methods
  def success_result
    {
      success: true,
      donations: imported_donations,
      skipped: false
    }
  end

  def skip_result(reason)
    {
      success: true,
      donations: [],
      skipped: true,
      reason: reason
    }
  end

  def error_result(error)
    {
      success: false,
      donations: [],
      skipped: false,
      errors: [error.message],
      error: error
    }
  end
end
```

### CSV Column Mapping

| CSV Column | Database Field | Notes |
|------------|---------------|-------|
| Amount | amount (cents) | Multiply by 100 |
| Billing Details Name | donor.name | Via DonorService |
| Cust Email | donor.email | Via DonorService |
| Created Formatted | donation.date | Parse datetime |
| Description | donation.description + project extraction | Pattern matching |
| Transaction ID | stripe_charge_id | Unique index |
| Cust ID | stripe_customer_id | For future webhook matching |
| Cust Subscription Data ID | stripe_subscription_id | For recurring detection |
| Status | Filter only 'succeeded' | Skip others |

### Pattern Matching Examples

**Sponsorships:**

```text
"Monthly Sponsorship Donation for Sangwan" → Child: Sangwan, Project: "Sponsor Sangwan"
"Monthly Sponsorship Donation for Wan,Monthly Sponsorship Donation for Orawan" → 2 donations
```

**General Donations:**

```text
"$100 - General Monthly Donation" → Project: "General Donation" (system)
"$50 - General Monthly Donation" → Project: "General Donation" (system)
```

**Campaigns:**

```text
"Donation for Campaign 21460" → Project: "Campaign 21460"
```

**Email Addresses:**

```text
"dlongerich@gmail.com" → Project: "General Donation" (system)
```

**Unmapped:**

```text
"Book" → Project: "UNMAPPED: Book"
"Random description text" → Project: "UNMAPPED: Random description text"
```

### Manual Testing Instructions

**Prerequisites:**

- Docker containers running (`docker-compose up`)
- Rails console access (`docker-compose exec api rails console`)
- Clean database state (no existing donations with test Transaction IDs)

**Test 1: Single-Child Sponsorship**

```ruby
# Enter Rails console
csv_row = {
  'Amount' => '100',
  'Billing Details Name' => 'John Doe',
  'Cust Email' => 'john@example.com',
  'Created Formatted' => '2020-06-15 00:56:17 +0000',
  'Description' => 'Invoice ABC123',
  'Cust Subscription Data Plan Nickname' => 'Monthly Sponsorship Donation for Sangwan',
  'Transaction ID' => 'txn_test_001',
  'Cust ID' => 'cus_test_001',
  'Cust Subscription Data ID' => 'sub_test_001',
  'Status' => 'succeeded'
}

result = StripePaymentImportService.new(csv_row).import

# Expected results:
puts result[:success]  # => true
puts result[:donations].count  # => 1
puts result[:donations].first.child.name  # => "Sangwan"
puts result[:donations].first.amount  # => 10000 (cents)

# Verify StripeInvoice created
StripeInvoice.find_by(stripe_invoice_id: 'txn_test_001')  # Should exist
```

**Test 2: Multi-Child Sponsorship**

```ruby
csv_row = {
  'Amount' => '200',
  'Billing Details Name' => 'Jane Smith',
  'Cust Email' => 'jane@example.com',
  'Created Formatted' => '2020-06-16 00:00:00 +0000',
  'Description' => 'Invoice DEF456',
  'Cust Subscription Data Plan Nickname' => 'Monthly Sponsorship Donation for Wan,Monthly Sponsorship Donation for Orawan',
  'Transaction ID' => 'txn_test_002',
  'Cust ID' => 'cus_test_002',
  'Cust Subscription Data ID' => 'sub_test_002',
  'Status' => 'succeeded'
}

result = StripePaymentImportService.new(csv_row).import

# Expected results:
puts result[:success]  # => true
puts result[:donations].count  # => 2
puts result[:donations].map { |d| d.child.name }  # => ["Wan", "Orawan"]

# Verify single StripeInvoice for both donations
invoice = StripeInvoice.find_by(stripe_invoice_id: 'txn_test_002')
Donation.where(stripe_invoice_id: 'txn_test_002').count  # => 2
```

**Test 3: Idempotency (Re-import Same Transaction)**

```ruby
# Re-run Test 1 with same Transaction ID
result = StripePaymentImportService.new(csv_row).import

# Expected results:
puts result[:skipped]  # => true
puts result[:reason]  # => "Already imported"
puts Donation.where(stripe_charge_id: 'txn_test_001').count  # => 1 (not duplicated)
```

**Test 4: General Donation**

```ruby
csv_row = {
  'Amount' => '50',
  'Billing Details Name' => 'Bob Johnson',
  'Cust Email' => 'bob@example.com',
  'Created Formatted' => '2020-06-17 00:00:00 +0000',
  'Description' => 'Invoice GHI789',
  'Cust Subscription Data Plan Nickname' => '$50 - General Monthly Donation',
  'Transaction ID' => 'txn_test_003',
  'Cust ID' => 'cus_test_003',
  'Cust Subscription Data ID' => 'sub_test_003',
  'Status' => 'succeeded'
}

result = StripePaymentImportService.new(csv_row).import

# Expected results:
puts result[:success]  # => true
puts result[:donations].first.project.title  # => "General Donation"
puts result[:donations].first.project.system  # => true
puts result[:donations].first.child_id  # => nil
```

**Test 5: Campaign Donation**

```ruby
csv_row = {
  'Amount' => '75',
  'Billing Details Name' => 'Alice Brown',
  'Cust Email' => 'alice@example.com',
  'Created Formatted' => '2020-06-18 00:00:00 +0000',
  'Description' => 'Donation for Campaign 21460',
  'Cust Subscription Data Plan Nickname' => '',
  'Transaction ID' => 'txn_test_004',
  'Cust ID' => 'cus_test_004',
  'Cust Subscription Data ID' => '',
  'Status' => 'succeeded'
}

result = StripePaymentImportService.new(csv_row).import

# Expected results:
puts result[:success]  # => true
puts result[:donations].first.project.title  # => "Campaign 21460"
puts result[:donations].first.project.project_type  # => "campaign"
```

**Test 6: Email Address Detection**

```ruby
csv_row = {
  'Amount' => '25',
  'Billing Details Name' => 'Chris Wilson',
  'Cust Email' => 'chris@example.com',
  'Created Formatted' => '2020-06-19 00:00:00 +0000',
  'Description' => 'dlongerich@gmail.com',
  'Cust Subscription Data Plan Nickname' => '',
  'Transaction ID' => 'txn_test_005',
  'Cust ID' => 'cus_test_005',
  'Cust Subscription Data ID' => '',
  'Status' => 'succeeded'
}

result = StripePaymentImportService.new(csv_row).import

# Expected results:
puts result[:success]  # => true
puts result[:donations].first.project.title  # => "General Donation"
puts result[:donations].first.project.system  # => true
```

**Test 7: Unmapped Donation**

```ruby
csv_row = {
  'Amount' => '15',
  'Billing Details Name' => 'Dana Taylor',
  'Cust Email' => 'dana@example.com',
  'Created Formatted' => '2020-06-20 00:00:00 +0000',
  'Description' => 'Random description',
  'Cust Subscription Data Plan Nickname' => 'Book',
  'Transaction ID' => 'txn_test_006',
  'Cust ID' => 'cus_test_006',
  'Cust Subscription Data ID' => '',
  'Status' => 'succeeded'
}

result = StripePaymentImportService.new(csv_row).import

# Expected results:
puts result[:success]  # => true
puts result[:donations].first.project.title  # => "UNMAPPED: Book"
puts result[:donations].first.project.system  # => false
puts result[:donations].first.project.description  # Contains "Auto-created from Stripe import"
```

**Test 8: Failed Transaction (Skip)**

```ruby
csv_row = {
  'Amount' => '100',
  'Billing Details Name' => 'Eve Miller',
  'Cust Email' => 'eve@example.com',
  'Created Formatted' => '2020-06-21 00:00:00 +0000',
  'Description' => 'Invoice JKL012',
  'Cust Subscription Data Plan Nickname' => 'Monthly Sponsorship Donation for Test',
  'Transaction ID' => 'txn_test_007',
  'Cust ID' => 'cus_test_007',
  'Cust Subscription Data ID' => 'sub_test_007',
  'Status' => 'failed'
}

result = StripePaymentImportService.new(csv_row).import

# Expected results:
puts result[:skipped]  # => true
puts result[:reason]  # => "Status not succeeded"
puts Donation.where(stripe_charge_id: 'txn_test_007').count  # => 0
```

**Cleanup After Testing:**

```ruby
# Remove test data
Donation.where('stripe_charge_id LIKE ?', 'txn_test_%').destroy_all
StripeInvoice.where('stripe_invoice_id LIKE ?', 'txn_test_%').destroy_all
Child.where(name: ['Sangwan', 'Wan', 'Orawan', 'Test']).destroy_all
Project.where('title LIKE ?', 'UNMAPPED:%').destroy_all
Project.where('title LIKE ?', 'Campaign%').destroy_all
Donor.where(email: ['john@example.com', 'jane@example.com', 'bob@example.com',
                     'alice@example.com', 'chris@example.com', 'dana@example.com',
                     'eve@example.com']).destroy_all
```

### Testing Strategy

```ruby
# spec/services/stripe_payment_import_service_spec.rb
RSpec.describe StripePaymentImportService do
  describe '#import' do
    context 'with sponsorship donation' do
      it 'creates donor, child, project, sponsorship, and donation'
      it 'extracts child name from description'
      it 'reuses existing child if found'
      it 'reuses existing sponsorship project for child'
    end

    context 'with multi-child sponsorship' do
      it 'creates separate donations for each child'
      it 'creates separate sponsorships for each child'
    end

    context 'with general donation' do
      it 'creates general project'
      it 'marks project as system'
      it 'reuses existing general project'
    end

    context 'with campaign donation' do
      it 'extracts campaign ID from description'
      it 'creates campaign project'
    end

    context 'with unmapped donation' do
      it 'creates UNMAPPED project with description'
      it 'truncates long descriptions to 100 chars'
    end

    context 'with duplicate import' do
      it 'skips already imported stripe_charge_id'
      it 'returns skipped: true result'
    end

    context 'with failed transaction' do
      it 'skips non-succeeded status'
    end

    context 'with missing data' do
      it 'handles missing email gracefully'
      it 'handles missing name gracefully'
      it 'handles invalid date formats'
    end

    context 'amount conversion' do
      it 'converts dollars to cents correctly'
      it 'handles decimal amounts'
    end
  end
end
```

### Files to Create
- `db/migrate/YYYYMMDD_add_stripe_fields_to_donations.rb`
- `app/services/stripe_payment_import_service.rb`
- `spec/services/stripe_payment_import_service_spec.rb`

### Files to Modify
- `CLAUDE.md` - Add Stripe import service pattern

### Related Tickets

**Depends On This Ticket:**
- **TICKET-026: Stripe Webhook Integration** (⭐ PERMANENT - Reuses StripePaymentImportService)
- TICKET-071: Stripe CSV Batch Import Task (🗑️ TEMPORARY - Uses this service once)
- TICKET-072: Import Error Recovery UI (🗑️ OPTIONAL - Displays failures from CSV import)

### Code Lifecycle & Reusability

**PERMANENT CODE (Keep Forever):**
- `StripePaymentImportService` - Core import logic
- Migration (Stripe fields on donations table)
- All tests for the service
- Pattern matching logic
- Amount conversion logic

**HOW WEBHOOKS REUSE THIS CODE:**
```ruby
# TICKET-026 webhook controller will do:
def handle_charge_succeeded(charge)
  # Transform Stripe webhook payload → CSV hash format
  csv_hash = {
    'Amount' => (charge.amount / 100.0).to_s,
    'Billing Details Name' => charge.billing_details&.name,
    'Cust Email' => charge.billing_details&.email,
    'Transaction ID' => charge.id,
    # ... exact same format this service expects
  }

  # Reuse the same service!
  StripePaymentImportService.new(csv_hash).import
end
```

**Why CSV columns = Webhook fields:**
The CSV export is a flattened Stripe API dump (348 columns). Webhooks return the same Stripe objects (charge, customer, subscription) but as JSON. The service accepts a Hash, so it works for both!

### Notes
- This ticket focuses on importing SINGLE payment records (reusable unit)
- Batch processing handled in TICKET-071 (throwaway batch wrapper)
- CSV file: `donation_tracker_api/PFAOnlinePayments-Stripe.csv` (1,303 succeeded transactions)
- Amount conversion critical: CSV shows dollars, DB stores cents
- Multi-child sponsorships create multiple donations
- **After CSV import completes, TICKET-071 batch code can be removed**
- **This service remains in production for webhook processing**
