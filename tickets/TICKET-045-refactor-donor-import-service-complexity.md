## [TICKET-045] Refactor DonorImportService to Reduce Complexity

**Status:** 📋 Planned
**Priority:** 🟢 Low
**Effort:** M (Medium)
**Created:** 2025-10-19
**Dependencies:** TICKET-037 (Service Object Standardization)

### User Story
As a developer, I want the DonorImportService to be easier to understand and maintain so that I can confidently modify CSV import logic without introducing bugs.

### Problem Statement
Reek identified **13 code smell warnings** in DonorImportService, the highest count of any service:

**Complexity Issues:**
- `TooManyStatements`: `import` method has 20 statements
- `TooManyStatements`: `detect_headers` method has 9 statements
- `NestedIterators`: Complex iteration logic
- `FeatureEnvy`: `detect_headers` operates more on `first_row` than self

**Duplication Issues:**
- `DuplicateMethodCall`: Multiple repeated calls (e.g., `first_row.any?`, `row["Billing Details Name"]`)

**Naming Issues:**
- `UncommunicativeVariableName`: Exception variable `e` appears 2 times
- `ControlParameter`: `has_headers` boolean controls method behavior

**Code Smell:** Multiple Reek warnings indicating high complexity
**Issue:** DonorImportService:8-78 (70 lines, complex logic)

### Current Implementation Issues

```ruby
# app/services/donor_import_service.rb
class DonorImportService
  def initialize(csv_content)
    @csv_content = csv_content
  end

  def import
    # 20 statements - too complex
    # Mixes concerns: parsing, validation, error handling, reporting
    # Hard to test individual steps
  end

  private

  def detect_headers
    # 9 statements - too complex
    # FeatureEnvy: operates on first_row more than self
    # Could be extracted to separate class
  end

  def extract_donor_attributes(row, has_headers)
    # ControlParameter: behavior changes based on has_headers flag
    # DuplicateMethodCall: repeated row["..."] accesses
  end
end
```

### Acceptance Criteria
- [ ] Extract header detection to separate `CsvHeaderDetector` class
- [ ] Reduce `import` method to <10 statements using extracted private methods
- [ ] Eliminate `ControlParameter` smell in `extract_donor_attributes`
- [ ] Remove `DuplicateMethodCall` smells with memoization
- [ ] Rename exception variable from `e` to `error`
- [ ] Add comprehensive documentation comments
- [ ] All existing tests pass
- [ ] Reek warnings reduced from 13 to 0
- [ ] Update CLAUDE.md with CSV import pattern

### Technical Approach

#### 1. Extract CsvHeaderDetector

```ruby
# app/services/csv_header_detector.rb
# Detects whether a CSV file has headers by analyzing the first row.
#
# Supports auto-detection of:
# - Stripe CSV format ("Billing Details Name", "Cust Email")
# - Standard format (simple name/email headers)
#
# @example Detect headers
#   csv_content = File.read('donors.csv')
#   csv = CSV.parse(csv_content)
#   detector = CsvHeaderDetector.new(csv.first)
#   detector.has_headers? # => true/false
#   detector.format       # => :stripe, :standard, or :headerless
class CsvHeaderDetector
  STRIPE_HEADERS = ["Billing Details Name", "Cust Email"].freeze
  STANDARD_HEADERS = ["name", "email"].freeze

  def initialize(first_row)
    @first_row = first_row
  end

  # Returns true if the first row appears to be headers
  def has_headers?
    stripe_format? || standard_format?
  end

  # Returns the detected format type
  def format
    return :stripe if stripe_format?
    return :standard if standard_format?
    :headerless
  end

  private

  attr_reader :first_row

  def stripe_format?
    return false if first_row.nil?

    STRIPE_HEADERS.all? { |header| first_row.any? { |cell| cell&.include?(header) } }
  end

  def standard_format?
    return false if first_row.nil?

    STANDARD_HEADERS.all? { |header| first_row.any? { |cell| cell&.downcase&.include?(header) } }
  end
end
```

#### 2. Refactor DonorImportService

```ruby
# app/services/donor_import_service.rb
# Imports donor records from CSV files with automatic format detection.
#
# Supports multiple CSV formats:
# - Stripe export format ("Billing Details Name", "Cust Email")
# - Standard CSV format (name, email columns)
# - Headerless CSV (name, email as first two columns)
#
# Features:
# - Automatic duplicate detection via DonorService
# - Smart data merging based on transaction timestamp
# - Comprehensive error reporting with row numbers
#
# @example Import from file
#   csv_content = File.read('stripe_export.csv')
#   service = DonorImportService.new(csv_content)
#   result = service.import
#   # => {
#   #   created_count: 15,
#   #   updated_count: 3,
#   #   failed_count: 2,
#   #   errors: [...]
#   # }
#
# @see DonorService for duplicate detection logic
# @see CsvHeaderDetector for format detection
class DonorImportService
  def initialize(csv_content)
    @csv_content = csv_content
    @import_time = Time.current
    @stats = { created: 0, updated: 0, failed: 0 }
    @errors = []
  end

  def import
    detect_csv_format
    process_csv_rows
    build_import_summary
  end

  private

  attr_reader :csv_content, :import_time, :stats, :errors

  def detect_csv_format
    csv_preview = CSV.parse(csv_content)
    detector = CsvHeaderDetector.new(csv_preview.first)
    @has_headers = detector.has_headers?
  end

  def process_csv_rows
    CSV.parse(csv_content, headers: @has_headers).each_with_index do |row, index|
      process_single_row(row, row_number(index))
    end
  end

  def process_single_row(row, row_number)
    donor_attributes = extract_donor_attributes(row)
    import_donor(donor_attributes)
  rescue ActiveRecord::RecordInvalid => error
    handle_validation_error(row_number, error)
  rescue StandardError => error
    handle_general_error(row_number, error)
  end

  def import_donor(donor_attributes)
    result = DonorService.new(
      donor_attributes: donor_attributes,
      transaction_date: import_time
    ).find_or_update

    result[:created] ? stats[:created] += 1 : stats[:updated] += 1
  end

  def extract_donor_attributes(row)
    if @has_headers
      extract_from_headers(row)
    else
      extract_from_positions(row)
    end
  end

  def extract_from_headers(row)
    # Stripe format: "Billing Details Name", "Cust Email"
    name = row["Billing Details Name"]
    email = row["Cust Email"]

    # Fallback to standard headers if Stripe headers not found
    name ||= row["name"]
    email ||= row["email"]

    { name: name&.strip, email: email&.strip }
  end

  def extract_from_positions(row)
    # Headerless: assume first column = name, second = email
    { name: row[0]&.strip, email: row[1]&.strip }
  end

  def row_number(index)
    @has_headers ? index + 2 : index + 1
  end

  def handle_validation_error(row_number, error)
    stats[:failed] += 1
    errors << { row: row_number, message: error.message }
  end

  def handle_general_error(row_number, error)
    stats[:failed] += 1
    errors << { row: row_number, message: error.message }
  end

  def build_import_summary
    {
      created_count: stats[:created],
      updated_count: stats[:updated],
      failed_count: stats[:failed],
      errors: errors
    }
  end
end
```

### Complexity Improvements

**Before:**
```ruby
def import
  created_count = 0
  updated_count = 0
  failed_count = 0
  errors = []
  import_time = Time.current
  has_headers = detect_headers

  CSV.parse(@csv_content, headers: has_headers).each_with_index do |row, index|
    row_number = has_headers ? index + 2 : index + 1
    begin
      donor_attributes = extract_donor_attributes(row, has_headers)
      result = DonorService.find_or_update_by_email(donor_attributes, import_time)
      if result[:created]
        created_count += 1
      else
        updated_count += 1
      end
    rescue ActiveRecord::RecordInvalid => e
      failed_count += 1
      errors << { row: row_number, message: e.message }
    rescue StandardError => e
      failed_count += 1
      errors << { row: row_number, message: e.message }
    end
  end

  { created_count: created_count, updated_count: updated_count, failed_count: failed_count, errors: errors }
end
# 20 statements, Flog score ~25
```

**After:**
```ruby
def import
  detect_csv_format
  process_csv_rows
  build_import_summary
end
# 3 statements, Flog score ~5
```

### Benefits
- **Maintainability**: Each method has a single, clear responsibility
- **Testability**: Can test header detection, row processing, error handling separately
- **Readability**: `import` method reads like documentation
- **Extensibility**: Easy to add new CSV formats (just update CsvHeaderDetector)
- **Code Quality**: Eliminates all 13 Reek warnings
- **Reusability**: CsvHeaderDetector can be used for other CSV imports

### Testing Strategy

```ruby
# spec/services/csv_header_detector_spec.rb
RSpec.describe CsvHeaderDetector do
  describe "#has_headers?" do
    it "detects Stripe CSV format" do
      first_row = ["Billing Details Name", "Cust Email", "Amount"]
      detector = CsvHeaderDetector.new(first_row)

      expect(detector.has_headers?).to be true
      expect(detector.format).to eq(:stripe)
    end

    it "detects standard CSV format" do
      first_row = ["name", "email"]
      detector = CsvHeaderDetector.new(first_row)

      expect(detector.has_headers?).to be true
      expect(detector.format).to eq(:standard)
    end

    it "detects headerless CSV" do
      first_row = ["John Doe", "john@example.com"]
      detector = CsvHeaderDetector.new(first_row)

      expect(detector.has_headers?).to be false
      expect(detector.format).to eq(:headerless)
    end
  end
end

# spec/services/donor_import_service_spec.rb (updated)
RSpec.describe DonorImportService do
  describe "#import" do
    context "with Stripe CSV format" do
      let(:csv_content) do
        <<~CSV
          Billing Details Name,Cust Email
          John Doe,john@example.com
          Jane Smith,jane@example.com
        CSV
      end

      it "imports donors using header-based extraction" do
        service = DonorImportService.new(csv_content)
        result = service.import

        expect(result[:created_count]).to eq(2)
        expect(result[:updated_count]).to eq(0)
        expect(result[:failed_count]).to eq(0)
      end
    end

    context "with headerless CSV" do
      let(:csv_content) do
        <<~CSV
          John Doe,john@example.com
          Jane Smith,jane@example.com
        CSV
      end

      it "imports donors using position-based extraction" do
        service = DonorImportService.new(csv_content)
        result = service.import

        expect(result[:created_count]).to eq(2)
      end
    end

    context "with validation errors" do
      let(:csv_content) do
        <<~CSV
          Billing Details Name,Cust Email
          ,invalid@example.com
        CSV
      end

      it "captures errors with row numbers" do
        service = DonorImportService.new(csv_content)
        result = service.import

        expect(result[:failed_count]).to eq(1)
        expect(result[:errors].first[:row]).to eq(2)
      end
    end
  end
end
```

### Files to Create
- `app/services/csv_header_detector.rb` (NEW)
- `spec/services/csv_header_detector_spec.rb` (NEW)

### Files to Modify
- `app/services/donor_import_service.rb` (REFACTOR)
- `spec/services/donor_import_service_spec.rb` (UPDATE - verify still passes)
- `CLAUDE.md` (UPDATE - add CSV import pattern)

### CLAUDE.md Updates

```markdown
### CSV Import Pattern

**CsvHeaderDetector:**
- Separate class for format detection
- Supports multiple CSV formats
- Reusable across different import services

**Import Service Structure:**
- Use instance pattern for stateful operations
- Extract private methods for each step
- Clear error handling with row numbers
- Comprehensive summary reporting

**Example:**
```ruby
service = DonorImportService.new(csv_content)
result = service.import
# => { created_count: 10, updated_count: 5, failed_count: 2, errors: [...] }
```
```

### Related Tickets
- Part of TICKET-037 (Service Object Standardization)
- Addresses Reek complexity warnings
- Part of code quality improvement initiative

### Notes
- This is a refactoring ticket (no functionality changes)
- All existing import behavior remains unchanged
- CsvHeaderDetector can be reused for future CSV imports (donations, projects, etc.)
- Consider adding support for other CSV formats in the future (Excel exports, Google Sheets)
- Flog score improvement: 25 → 5 per method
