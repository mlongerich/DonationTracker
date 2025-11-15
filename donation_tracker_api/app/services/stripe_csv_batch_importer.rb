# frozen_string_literal: true

require "csv"

# Batch imports Stripe payment CSV file with status-based counting.
#
# This service handles:
# - Row-by-row processing of Stripe CSV exports
# - Delegation to StripePaymentImportService for individual row imports
# - Status-based statistics (succeeded, failed, needs_attention counts)
# - Skipped row tracking (idempotent imports)
# - Service error tracking with row numbers for debugging
#
# Result format:
# - succeeded_count: Donations with status='succeeded'
# - failed_count: Donations with status='failed' (payment failures)
# - needs_attention_count: refunded, canceled, duplicate subscriptions, data issues
# - skipped_count: Already imported (idempotent)
# - errors: Service exceptions (not donation status failures)
#
# Uses instance method pattern for complex multi-step operations.
#
# ⭐ CODE LIFECYCLE: PERMANENT - Production Import Logic
# Designed for CSV imports AND future Stripe webhook integration (TICKET-026).
#
# @example Batch import Stripe CSV
#   service = StripeCsvBatchImporter.new("path/to/stripe_export.csv")
#   result = service.import
#   # => {
#   #   succeeded_count: 145,
#   #   failed_count: 3,
#   #   needs_attention_count: 2,
#   #   skipped_count: 10,
#   #   errors: [{row: 42, message: "...", data: {...}}]
#   # }
#
# @see StripePaymentImportService for individual row import logic
# @see TICKET-110 for status-based counting
# @see TICKET-071 for batch import implementation
# @see TICKET-026 for future webhook replacement
class StripeCsvBatchImporter
  def initialize(file_path)
    @file_path = file_path
    @succeeded_count = 0
    @failed_count = 0
    @needs_attention_count = 0
    @skipped_count = 0
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
      # Count by donation status
      result[:donations].each do |donation|
        case donation.status
        when "succeeded"
          @succeeded_count += 1
        when "failed"
          @failed_count += 1
        else
          # refunded, canceled, needs_attention
          @needs_attention_count += 1
        end
      end
    end
  end

  def handle_failed_result(result, row_number, row_hash)
    # Service errors (exceptions) go into errors array
    @errors << {
      row: row_number,
      message: result[:error],
      data: sanitize_row_data(row_hash)
    }
  end

  def build_success_result
    {
      succeeded_count: @succeeded_count,
      failed_count: @failed_count,
      needs_attention_count: @needs_attention_count,
      skipped_count: @skipped_count,
      errors: @errors
    }
  end

  def build_csv_error_result(error)
    {
      succeeded_count: 0,
      failed_count: 0,
      needs_attention_count: 0,
      skipped_count: 0,
      errors: [ {
        row: "N/A",
        message: "CSV parsing error: #{error.message}",
        data: nil
      } ]
    }
  end
end
