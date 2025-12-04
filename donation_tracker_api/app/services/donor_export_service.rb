# frozen_string_literal: true

require "csv"

# Generates CSV export of donor list with contact info and donation aggregates.
#
# This service provides:
# - CSV export with phone, address, and donation statistics
# - Efficient SQL aggregates (avoids N+1 queries)
# - Currency formatting (cents → dollars)
# - Status column (Active/Archived)
#
# Uses class method pattern for stateless CSV generation.
#
# @example Generate CSV for filtered donors
#   donors = Donor.kept.where("name LIKE ?", "%John%")
#   csv_data = DonorExportService.generate_csv(donors)
#   send_data csv_data, filename: "donors_export_#{Date.today.strftime('%Y%m%d')}.csv"
#
# @see DonorsController#export for controller usage
# @see TICKET-088 for implementation details
class DonorExportService
  HEADERS = [
    "Name",
    "Email",
    "Phone",
    "Address Line 1",
    "Address Line 2",
    "City",
    "State",
    "Zip",
    "Country",
    "Total Donated",
    "Donation Count",
    "Last Donation Date",
    "Status"
  ].freeze

  def self.generate_csv(donors_scope)
    # Preload aggregates to avoid N+1 queries
    donors_with_stats = donors_scope
      .left_joins(:donations)
      .group("donors.id")
      .select(
        "donors.*",
        "COALESCE(SUM(donations.amount), 0) as total_donated_cents",
        "COUNT(donations.id) as donation_count",
        "MAX(donations.date) as last_donation_date"
      )

    CSV.generate(headers: true) do |csv|
      csv << HEADERS
      donors_with_stats.each do |donor|
        csv << [
          donor.name,
          donor.email.include?("@mailinator.com") ? "" : donor.email,
          donor.phone || "",
          donor.address_line1 || "",
          donor.address_line2 || "",
          donor.city || "",
          donor.state || "",
          donor.zip_code || "",
          donor.country || "",
          format_currency(donor.total_donated_cents.to_i),
          donor.donation_count.to_i,
          donor.last_donation_date&.strftime("%Y-%m-%d") || "",
          donor.discarded? ? "Archived" : "Active"
        ]
      end
    end
  end

  def self.format_currency(cents)
    "$#{'%.2f' % (cents / 100.0)}"
  end
  private_class_method :format_currency
end
