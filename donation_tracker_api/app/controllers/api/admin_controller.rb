# frozen_string_literal: true

# Handles Stripe CSV imports via web interface.
#
# This controller provides:
# - Stripe CSV import (reuses StripeCsvBatchImporter from rake task)
# - Creates both donors and donations (via DonorService internally)
#
# No business logic here - service handles all import logic.
#
# @see StripeCsvBatchImporter for Stripe import logic
# @see lib/tasks/stripe_import.rake for CLI equivalent
module Api
  class AdminController < ApplicationController
    def import_stripe_payments
      # Save uploaded file temporarily (StripeCsvBatchImporter needs file path)
      # Use binary mode to preserve original encoding (handles non-UTF-8 CSV files)
      temp_file = Tempfile.new([ "stripe_import", ".csv" ])
      temp_file.binmode
      temp_file.write(params[:file].read)
      temp_file.rewind

      # Reuse existing service (same as rake task!)
      importer = StripeCsvBatchImporter.new(temp_file.path)
      result = importer.import

      render json: {
        success_count: result[:succeeded_count],
        skipped_count: result[:skipped_count],
        failed_count: result[:failed_count],
        needs_attention_count: result[:needs_attention_count],
        errors: result[:errors].map { |e| { row: e[:row], error: e[:message] } }
      }
    rescue StandardError => e
      render json: { error: "Import failed: #{e.message}" }, status: :internal_server_error
    ensure
      temp_file&.close
      temp_file&.unlink
    end
  end
end
