# frozen_string_literal: true

require "csv"

# Imports donors from CSV files with flexible format detection.
#
# This service handles:
# - Automatic header detection (with or without headers)
# - Smart email matching via DonorService
# - Validation error handling with detailed error reporting
# - Import statistics (created, updated, failed counts)
#
# Uses instance method pattern for complex multi-step operations.
#
# @example Import donors from CSV
#   service = DonorImportService.new(csv_content)
#   result = service.import
#   # => {
#   #   created_count: 10,
#   #   updated_count: 5,
#   #   failed_count: 2,
#   #   errors: ["Row 3: Email is invalid"]
#   # }
#
# @see DonorService for email matching logic
class DonorImportService
  def initialize(csv_content)
    @csv_content = csv_content
  end

  def import
    stats = initialize_import_stats
    has_headers = detect_headers

    process_csv_rows(has_headers, stats)

    build_result(stats)
  end

  private

  def detect_headers
    first_row = CSV.parse_line(@csv_content)
    return false if first_row.nil? || first_row.empty?

    # Check for Stripe format headers
    has_stripe_headers = first_row.any? { |cell| cell&.strip == "Billing Details Name" } &&
                        first_row.any? { |cell| cell&.strip == "Cust Email" }

    # Check for legacy format headers
    has_legacy_headers = first_row.any? { |cell| cell&.downcase&.strip == "name" } &&
                        first_row.any? { |cell| cell&.downcase&.strip == "email" }

    has_stripe_headers || has_legacy_headers
  end

  def extract_donor_attributes(row, has_headers)
    if has_headers
      # Try Stripe format first
      if row["Billing Details Name"] || row["Cust Email"]
        { name: row["Billing Details Name"], email: row["Cust Email"] }
      else
        # Legacy format
        { name: row["name"], email: row["email"] }
      end
    else
      # No headers: column 0=name, column 1=email
      { name: row[0], email: row[1] }
    end
  end

  def initialize_import_stats
    {
      created_count: 0,
      updated_count: 0,
      failed_count: 0,
      errors: [],
      import_time: Time.current
    }
  end

  def process_csv_rows(has_headers, stats)
    CSV.parse(@csv_content, headers: has_headers).each_with_index do |row, index|
      row_number = has_headers ? index + 2 : index + 1
      process_single_row(row, row_number, has_headers, stats)
    end
  end

  def process_single_row(row, row_number, has_headers, stats)
    donor_attributes = extract_donor_attributes(row, has_headers)
    result = DonorService.find_or_update_by_email(donor_attributes, stats[:import_time])

    if result[:created]
      stats[:created_count] += 1
    else
      stats[:updated_count] += 1
    end
  rescue ActiveRecord::RecordInvalid, StandardError => error
    stats[:failed_count] += 1
    stats[:errors] << { row: row_number, message: error.message }
  end

  def build_result(stats)
    {
      created: stats[:created_count],
      updated: stats[:updated_count],
      failed: stats[:failed_count],
      errors: stats[:errors]
    }
  end
end
