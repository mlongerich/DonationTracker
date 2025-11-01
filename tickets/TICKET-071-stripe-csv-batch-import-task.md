## [TICKET-071] Stripe CSV Batch Import Task

**Status:** 📋 Planned
**Priority:** 🔴 High
**Dependencies:** TICKET-070 (Stripe CSV Import Foundation)
**Created:** 2025-11-01

**🗑️ CODE LIFECYCLE: TEMPORARY - One-Time Use Only**

**This code can be DELETED after CSV import completes.**
- Rake task: One-time batch wrapper (throwaway)
- `StripeCsvBatchImporter`: Temporary orchestration (throwaway)
- Only needed to process 1,303 historical records once

**PERMANENT code is in TICKET-070 (StripePaymentImportService).**
After import, archive or remove this ticket's code. It has no long-term value.

### User Story
As an admin, I want to run a rake task to import the entire Stripe CSV file so that I can bulk-load all historical transactions with progress tracking and error reporting.

### Problem Statement
TICKET-070 provides `StripePaymentImportService` for importing single payment records, but we need a batch processing mechanism to:
- Process all 1,303 succeeded transactions from CSV
- Track progress (imported, skipped, failed counts)
- Handle errors gracefully without stopping entire import
- Provide detailed error reporting with row numbers
- Support resume capability (idempotent re-runs)
- Generate import summary report

### Acceptance Criteria
- [ ] Backend: Rake task `rails stripe:import_csv[file_path]`
- [ ] Backend: Read CSV with headers correctly
- [ ] Backend: Filter for 'succeeded' status only
- [ ] Backend: Process each row using `StripePaymentImportService`
- [ ] Backend: Track counts (imported, skipped, failed)
- [ ] Backend: Continue processing on row failures (don't abort)
- [ ] Backend: Capture error details (row number, error message, row data)
- [ ] Backend: Display progress (print dot per 10 rows)
- [ ] Backend: Print summary report at end
- [ ] Backend: Default file path to `Rails.root.join('PFAOnlinePayments-Stripe.csv')`
- [ ] Backend: Validate file exists before processing
- [ ] Backend: RSpec tests for rake task (using test CSV fixtures)
- [ ] All tests pass (90% coverage)
- [ ] Update CLAUDE.md with batch import task pattern

### Technical Approach

#### Rake Task Implementation

```ruby
# lib/tasks/stripe_import.rake
namespace :stripe do
  desc "Import Stripe donations from CSV file"
  task :import_csv, [:file_path] => :environment do |_task, args|
    file_path = args[:file_path] || Rails.root.join('PFAOnlinePayments-Stripe.csv')

    unless File.exist?(file_path)
      puts "❌ File not found: #{file_path}"
      exit 1
    end

    puts "🚀 Starting Stripe CSV import from: #{file_path}"
    puts "=" * 80

    importer = StripeCsvBatchImporter.new(file_path)
    result = importer.import

    puts "\n"
    puts "=" * 80
    puts "✅ Import complete!"
    puts "\nSummary:"
    puts "  Imported: #{result[:imported_count]} donations"
    puts "  Skipped:  #{result[:skipped_count]} (already imported or non-succeeded)"
    puts "  Failed:   #{result[:failed_count]}"

    if result[:failed_count] > 0
      puts "\n❌ Failed Rows:"
      result[:errors].each do |error|
        puts "  Row #{error[:row]}: #{error[:message]}"
        puts "    Data: #{error[:data].inspect}" if error[:data]
      end
    end

    puts "\nDonations created: #{result[:imported_count]}"
    puts "=" * 80
  end
end
```

#### Batch Importer Service

```ruby
# app/services/stripe_csv_batch_importer.rb
#
# Batch imports Stripe payment CSV file using StripePaymentImportService.
#
# Features:
# - Progress tracking with visual feedback
# - Error collection without aborting entire import
# - Idempotent processing (safe to re-run)
# - Detailed error reporting
# - Import summary statistics
#
# @example Import from file
#   importer = StripeCsvBatchImporter.new('PFAOnlinePayments-Stripe.csv')
#   result = importer.import
#   # => {
#   #   imported_count: 1200,
#   #   skipped_count: 100,
#   #   failed_count: 3,
#   #   errors: [...]
#   # }
#
class StripeCsvBatchImporter
  require 'csv'

  PROGRESS_INTERVAL = 10 # Print dot every N rows

  def initialize(file_path)
    @file_path = file_path
    @stats = {
      imported_count: 0,
      skipped_count: 0,
      failed_count: 0
    }
    @errors = []
  end

  # Import all rows from CSV
  # @return [Hash] Import statistics and errors
  def import
    CSV.foreach(@file_path, headers: true).with_index(2) do |row, row_number|
      process_row(row, row_number)
      print_progress(row_number) if row_number % PROGRESS_INTERVAL == 0
    end

    build_result
  rescue CSV::MalformedCSVError => error
    handle_csv_error(error)
  end

  private

  attr_reader :file_path, :stats, :errors

  def process_row(csv_row, row_number)
    # Convert CSV::Row to Hash for StripePaymentImportService
    row_hash = csv_row.to_h

    service = StripePaymentImportService.new(row_hash)
    result = service.import

    if result[:success]
      if result[:skipped]
        stats[:skipped_count] += 1
      else
        # Track number of donations created (multi-child creates multiple)
        donation_count = result[:donations].size
        stats[:imported_count] += donation_count
      end
    else
      stats[:failed_count] += 1
      record_error(row_number, result[:errors].first, row_hash)
    end
  rescue StandardError => error
    stats[:failed_count] += 1
    record_error(row_number, error.message, csv_row.to_h)
  end

  def record_error(row_number, message, row_data)
    errors << {
      row: row_number,
      message: message,
      data: sanitize_row_data(row_data)
    }
  end

  # Extract key fields for error reporting (not entire 200+ column row)
  def sanitize_row_data(row_hash)
    {
      amount: row_hash['Amount'],
      name: row_hash['Billing Details Name'],
      email: row_hash['Cust Email'],
      description: row_hash['Description'],
      date: row_hash['Created Formatted'],
      status: row_hash['Status']
    }
  end

  def print_progress(row_number)
    print "."
    print " (#{row_number})" if row_number % (PROGRESS_INTERVAL * 10) == 0
  end

  def build_result
    {
      imported_count: stats[:imported_count],
      skipped_count: stats[:skipped_count],
      failed_count: stats[:failed_count],
      errors: errors
    }
  end

  def handle_csv_error(error)
    {
      imported_count: 0,
      skipped_count: 0,
      failed_count: 1,
      errors: [{
        row: 'N/A',
        message: "CSV parsing error: #{error.message}",
        data: nil
      }]
    }
  end
end
```

### Usage Examples

**Basic usage (default file path):**
```bash
rails stripe:import_csv
```

**Custom file path:**
```bash
rails stripe:import_csv["/path/to/custom-export.csv"]
```

**With Docker Compose:**
```bash
docker-compose exec api rails stripe:import_csv
```

### Expected Output

```
🚀 Starting Stripe CSV import from: /app/PFAOnlinePayments-Stripe.csv
================================================================================
.......... (10).......... (20).......... (30)
... [continuing] ...
.......... (1300).......... (1310).......... (1320).......... (1330).......... (1340)....

================================================================================
✅ Import complete!

Summary:
  Imported: 1285 donations
  Skipped:  115 (already imported or non-succeeded)
  Failed:   3

❌ Failed Rows:
  Row 145: Validation failed: Name can't be blank
    Data: {:amount=>"100", :name=>"", :email=>"missing@example.com", ...}
  Row 678: Validation failed: Date cannot be in the future
    Data: {:amount=>"50", :name=>"John Doe", :email=>"john@example.com", ...}
  Row 1002: Child name extraction failed
    Data: {:amount=>"100", :name=>"Jane Smith", :description=>"Invalid format", ...}

Donations created: 1285
================================================================================
```

### Error Handling Strategy

**Continue on Failure:**
- Individual row failures do NOT abort entire import
- Errors captured with row number and context
- Admin can review failed rows and manually retry

**Idempotent Re-runs:**
- Safe to run multiple times (unique index on stripe_charge_id)
- Skipped donations don't count as failures
- Can re-run after fixing data issues

**Validation Errors:**
- Donor missing name/email → Skip row, record error
- Invalid date format → Use fallback date (today)
- Amount parsing error → Skip row, record error
- Child extraction failure → Skip row, record error

### Testing Strategy

```ruby
# spec/services/stripe_csv_batch_importer_spec.rb
RSpec.describe StripeCsvBatchImporter do
  describe '#import' do
    context 'with valid CSV' do
      let(:csv_content) do
        <<~CSV
          Amount,Billing Details Name,Cust Email,Created Formatted,Description,Transaction ID,Cust ID,Status
          100,John Doe,john@example.com,2020-06-15 00:56:17 +0000,Monthly Sponsorship Donation for Sangwan,txn_123,cus_abc,succeeded
          50,Jane Smith,jane@example.com,2020-07-01 10:00:00 +0000,$50 - General Monthly Donation,txn_456,cus_def,succeeded
        CSV
      end

      it 'imports all successful transactions'
      it 'tracks imported count correctly'
      it 'returns success result'
    end

    context 'with duplicate transactions' do
      it 'skips already imported stripe_charge_id'
      it 'tracks skipped count correctly'
    end

    context 'with failed transactions' do
      it 'skips non-succeeded status'
      it 'tracks skipped count for failed status'
    end

    context 'with validation errors' do
      it 'continues processing after row failure'
      it 'captures error details with row number'
      it 'includes sanitized row data in errors'
      it 'tracks failed count correctly'
    end

    context 'with multi-child sponsorships' do
      it 'counts multiple donations from single row correctly'
    end

    context 'with malformed CSV' do
      it 'handles CSV parsing errors gracefully'
      it 'returns error result'
    end
  end
end

# spec/tasks/stripe_import_spec.rb
require 'rails_helper'
require 'rake'

RSpec.describe 'stripe:import_csv' do
  before(:all) do
    Rails.application.load_tasks
  end

  it 'runs without errors with valid file' do
    # Create test CSV file
    expect { Rake::Task['stripe:import_csv'].invoke }.not_to raise_error
  end

  it 'exits with error if file not found' do
    expect { Rake::Task['stripe:import_csv'].invoke('nonexistent.csv') }.to raise_error(SystemExit)
  end
end
```

### Files to Create
- `lib/tasks/stripe_import.rake`
- `app/services/stripe_csv_batch_importer.rb`
- `spec/services/stripe_csv_batch_importer_spec.rb`
- `spec/tasks/stripe_import_spec.rb`

### Files to Modify
- `CLAUDE.md` - Add batch import task pattern

### Related Tickets
- TICKET-070: Stripe CSV Import Foundation (⭐ PERMANENT - provides StripePaymentImportService)
- TICKET-072: Import Error Recovery UI (🗑️ OPTIONAL - admin interface for failed rows)

### Code Lifecycle & Cleanup

**THROWAWAY CODE (Delete After Import):**
- `lib/tasks/stripe_import.rake` - One-time batch wrapper
- `app/services/stripe_csv_batch_importer.rb` - Temporary orchestration
- `spec/services/stripe_csv_batch_importer_spec.rb` - Tests for throwaway code
- `spec/tasks/stripe_import_spec.rb` - Tests for throwaway task

**POST-IMPORT CLEANUP:**
1. Run import successfully
2. Verify all 1,303 records processed
3. **Delete or archive:**
   - `lib/tasks/stripe_import.rake`
   - `app/services/stripe_csv_batch_importer.rb`
   - Related spec files
4. **Keep:**
   - TICKET-070's `StripePaymentImportService` (used by webhooks)
   - Migration (Stripe fields on donations table)

**Why throwaway?**
- CSV import is a one-time migration
- Future donations come via webhooks (TICKET-026)
- No need to maintain batch processing code
- Reduces maintenance burden

### Notes
- CSV file: `PFAOnlinePayments-Stripe.csv` (1,445 rows, 1,303 succeeded)
- Expected ~1,285 donations created (some multi-child split into 2+ donations)
- Estimated runtime: 2-3 minutes for full import
- Safe to re-run (idempotent via stripe_charge_id unique index)
- Failed rows can be manually reviewed and retried via TICKET-072 UI
- **After successful import, this code has no future use**
- **Webhooks (TICKET-026) use StripePaymentImportService directly**
