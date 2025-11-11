# frozen_string_literal: true

require "csv"

# Batch imports Stripe payment CSV file using StripePaymentImportService.
#
# This service handles:
# - Row-by-row processing of Stripe CSV exports
# - Delegation to StripePaymentImportService for individual row imports
# - Import statistics (imported, skipped, failed counts)
# - Error tracking with row numbers for debugging
#
# Uses instance method pattern for complex multi-step operations.
#
# 🗑️ CODE LIFECYCLE: TEMPORARY - One-Time Use Only
# Will be replaced by TICKET-026 (Stripe Webhook Integration) for real-time sync.
#
# @example Batch import Stripe CSV
#   service = StripeCsvBatchImporter.new("path/to/stripe_export.csv")
#   result = service.import
#   # => {
#   #   imported_count: 150,
#   #   skipped_count: 10,
#   #   failed_count: 2,
#   #   errors: ["Row 42: Invalid email format"]
#   # }
#
# @see StripePaymentImportService for individual row import logic
# @see TICKET-071 for batch import implementation
# @see TICKET-026 for future webhook replacement
class StripeCsvBatchImporter
  def initialize(file_path)
    @file_path = file_path
    @imported_count = 0
    @skipped_count = 0
    @failed_count = 0
    @errors = []
  end

  def import
    process_csv_rows
    build_success_result
  rescue CSV::MalformedCSVError => error
    build_csv_error_result(error)
  end

  private

  def sanitize_row_data(row_hash)
    {
      amount: row_hash["Amount"],
      name: row_hash["Billing Details Name"],
      email: row_hash["Cust Email"],
      description: row_hash["Description"],
      nickname: row_hash["Cust Subscription Data Plan Nickname"],
      date: row_hash["Created Formatted"],
      status: row_hash["Status"]
    }
  end

  def process_csv_rows
    CSV.foreach(@file_path, headers: true).with_index(2) do |row, row_number|
      row_hash = row.to_h
      result = StripePaymentImportService.new(row_hash).import
      handle_import_result(result, row_number, row_hash)
    end
  end

  def handle_import_result(result, row_number, row_hash)
    if result[:success]
      handle_success_result(result)
    else
      handle_failed_result(result, row_number, row_hash)
    end
  end

  def handle_success_result(result)
    if result[:skipped]
      @skipped_count += 1
    else
      @imported_count += result[:donations].size
    end
  end

  def handle_failed_result(result, row_number, row_hash)
    @failed_count += 1
    @errors << {
      row: row_number,
      message: result[:error],
      data: sanitize_row_data(row_hash)
    }
  end

  def build_success_result
    {
      imported_count: @imported_count,
      skipped_count: @skipped_count,
      failed_count: @failed_count,
      errors: @errors
    }
  end

  def build_csv_error_result(error)
    {
      imported_count: 0,
      skipped_count: 0,
      failed_count: 1,
      errors: [ {
        row: "N/A",
        message: "CSV parsing error: #{error.message}",
        data: nil
      } ]
    }
  end
end
