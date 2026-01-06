# frozen_string_literal: true

# Handles donation report generation and downloads.
#
# This controller provides:
# - Date range donation reports (CSV download or JSON response)
# - Validation for date range parameters
# - Uses DonationReportService for report generation
#
# Supports two formats via format parameter:
# - format=csv (default): Returns CSV file download
# - format=json: Returns JSON array with metadata
#
# @see DonationReportService for report generation logic
# @see TICKET-103 for implementation details
module Api
  class ReportsController < ApplicationController
    def donations
      # Parse and validate date params (raises ParameterMissing if missing)
      start_date = Date.parse(params.require(:start_date))
      end_date = Date.parse(params.require(:end_date))

      # Validate date range
      if start_date > end_date
        render json: { error: "start_date must be before or equal to end_date" }, status: :bad_request
        return
      end

      # Determine format (default to csv)
      format = params[:format] || "csv"

      if format == "json"
        # Generate JSON report (returns hash with donations, donor_summary, project_summary, meta)
        report = DonationReportService.generate_json_report(
          start_date: start_date,
          end_date: end_date
        )

        render json: report
      else
        # Generate CSV
        csv_data = DonationReportService.generate_report(
          start_date: start_date,
          end_date: end_date
        )

        # Send CSV file
        filename = "donations_report_#{start_date.strftime('%Y%m%d')}_#{end_date.strftime('%Y%m%d')}.csv"
        send_data csv_data,
          filename: filename,
          type: "text/csv",
          disposition: "attachment"
      end
    end
  end
end
