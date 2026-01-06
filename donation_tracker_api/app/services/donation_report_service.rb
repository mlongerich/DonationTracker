# frozen_string_literal: true

require "csv"

# Generates CSV export of donation report with per-donor aggregates.
#
# This service provides:
# - CSV export with donation details and donor contact info
# - Per-donor totals: period, year-to-date, all-time (using SQL aggregates)
# - Currency formatting (cents → dollars)
# - Email visibility (hides @mailinator.com for anonymous donors)
#
# Uses class method pattern for stateless CSV generation.
#
# @example Generate report for Q4 2025
#   csv_data = DonationReportService.generate_report(
#     start_date: Date.new(2025, 10, 1),
#     end_date: Date.new(2025, 12, 31)
#   )
#   send_data csv_data, filename: "donations_report_20251001_20251231.csv"
#
# @see Api::ReportsController#donations for controller usage
# @see DonorExportService for similar CSV export pattern
# @see TICKET-103 for implementation details
class DonationReportService
  HEADERS = [
    "Date",
    "Donor Name",
    "Email",
    "Phone",
    "Address",
    "Amount",
    "Project/Child",
    "Payment Method",
    "Period Total",
    "Year Total",
    "All-Time Total"
  ].freeze

  def self.generate_report(start_date:, end_date:)
    # Get donations with eager loading to avoid N+1
    donations = Donation
      .includes(:donor, :project, sponsorship: :child)
      .where(date: start_date..end_date)
      .order(date: :asc)

    # Precompute donor totals using SQL aggregates
    donor_totals = compute_donor_totals(donations.pluck(:donor_id).uniq, start_date, end_date)

    CSV.generate(headers: true) do |csv|
      csv << HEADERS

      donations.each do |donation|
        donor = donation.donor
        next unless donor # Skip if donor deleted

        totals = donor_totals[donor.id] || { period: 0, year: 0, all_time: 0 }

        csv << [
          donation.date.strftime("%Y-%m-%d"),
          donor.name,
          displayable_email(donor),
          donor.phone || "",
          format_address(donor),
          format_currency(donation.amount),
          project_or_child_name(donation),
          donation.payment_method,
          format_currency(totals[:period]),
          format_currency(totals[:year]),
          format_currency(totals[:all_time])
        ]
      end
    end
  end

  def self.generate_json_report(start_date:, end_date:)
    # Get donations with eager loading to avoid N+1
    donations = Donation
      .includes(:donor, :project, sponsorship: :child)
      .where(date: start_date..end_date)
      .order(date: :asc)

    # Precompute donor totals using SQL aggregates
    donor_ids = donations.pluck(:donor_id).uniq
    donor_totals = compute_donor_totals(donor_ids, start_date, end_date)

    # Section 1: Donations with simplified fields
    donations_section = donations.map do |donation|
      donor = donation.donor
      next unless donor # Skip if donor deleted

      totals = donor_totals[donor.id] || { period: 0, year: 0, all_time: 0 }

      {
        date: donation.date.strftime("%-d %B %Y"), # "12 March 2025"
        donor_name: donor.name,
        amount: format_currency(donation.amount),
        project_or_child: project_or_child_name(donation),
        payment_method: donation.payment_method,
        all_time_total: format_currency(totals[:all_time]),
        project_id: donation.project_id # For frontend filtering
      }
    end.compact

    # Section 2: Donor summary (one line per donor)
    donor_summary = donor_totals.map do |donor_id, totals|
      donor = Donor.find_by(id: donor_id)
      next unless donor

      {
        donor_name: donor.name,
        period_total: format_currency(totals[:period]),
        all_time_total: format_currency(totals[:all_time])
      }
    end.compact

    # Section 3: Project summary (one line per project)
    project_ids = donations.pluck(:project_id).uniq.compact
    project_summary = project_ids.map do |project_id|
      project = Project.find_by(id: project_id)
      next unless project

      period_total = Donation.where(project_id: project_id, date: start_date..end_date).sum(:amount)
      all_time_total = Donation.where(project_id: project_id).sum(:amount)

      {
        project_id: project_id, # For frontend filtering
        project_name: project.title,
        period_total: format_currency(period_total),
        all_time_total: format_currency(all_time_total)
      }
    end.compact

    # Meta: Total amount for date range
    total_amount = donations.sum(:amount)

    {
      donations: donations_section,
      donor_summary: donor_summary,
      project_summary: project_summary,
      meta: {
        start_date: start_date.strftime("%Y-%m-%d"),
        end_date: end_date.strftime("%Y-%m-%d"),
        total_count: donations_section.length,
        total_amount: format_currency(total_amount)
      }
    }
  end

  # Compute totals for all donors using SQL (avoid N+1)
  def self.compute_donor_totals(donor_ids, start_date, end_date)
    totals = {}

    donor_ids.each do |donor_id|
      next unless donor_id

      period_total = Donation.where(donor_id: donor_id, date: start_date..end_date).sum(:amount)
      year_start = start_date.beginning_of_year
      year_end = start_date.end_of_year
      year_total = Donation.where(donor_id: donor_id, date: year_start..year_end).sum(:amount)
      all_time_total = Donation.where(donor_id: donor_id).sum(:amount)

      totals[donor_id] = {
        period: period_total,
        year: year_total,
        all_time: all_time_total
      }
    end

    totals
  end
  private_class_method :compute_donor_totals

  def self.format_currency(cents)
    "$#{'%.2f' % (cents / 100.0)}"
  end
  private_class_method :format_currency

  def self.format_address(donor)
    # Format multi-line address as comma-separated (Excel-compatible)
    parts = [
      donor.address_line1,
      donor.address_line2,
      donor.city,
      [ donor.state, donor.zip_code ].compact.join(" "),
      donor.country
    ].compact.reject(&:empty?)

    parts.any? ? parts.join(", ") : ""
  end
  private_class_method :format_address

  def self.project_or_child_name(donation)
    return donation.sponsorship.child.name if donation.sponsorship&.child.present?
    return donation.project.title if donation.project.present?
    ""
  end
  private_class_method :project_or_child_name

  def self.displayable_email(donor)
    # Hide @mailinator.com emails (anonymous donors) - same pattern as TICKET-088
    return "" if donor.email.to_s.include?("@mailinator.com")
    donor.email || ""
  end
  private_class_method :displayable_email
end
