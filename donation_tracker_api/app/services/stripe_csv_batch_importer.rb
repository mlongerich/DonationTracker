# frozen_string_literal: true

require "csv"

# Batch imports Stripe payment CSV file using StripePaymentImportService.
#
# 🗑️ CODE LIFECYCLE: TEMPORARY - One-Time Use Only
class StripeCsvBatchImporter
  def initialize(file_path)
    @file_path = file_path
    @imported_count = 0
    @skipped_count = 0
    @failed_count = 0
    @errors = []
  end

  def import
    CSV.foreach(@file_path, headers: true).with_index(2) do |row, row_number|
      row_hash = row.to_h
      service = StripePaymentImportService.new(row_hash)
      result = service.import

      if result[:success]
        if result[:skipped]
          @skipped_count += 1
        else
          @imported_count += result[:donations].size
        end
      else
        @failed_count += 1
        @errors << {
          row: row_number,
          message: result[:error],
          data: sanitize_row_data(row_hash)
        }
      end
    end

    {
      imported_count: @imported_count,
      skipped_count: @skipped_count,
      failed_count: @failed_count,
      errors: @errors
    }
  rescue CSV::MalformedCSVError => e
    {
      imported_count: 0,
      skipped_count: 0,
      failed_count: 1,
      errors: [ {
        row: "N/A",
        message: "CSV parsing error: #{e.message}",
        data: nil
      } ]
    }
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
end
