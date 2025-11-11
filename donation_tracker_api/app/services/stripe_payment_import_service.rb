# frozen_string_literal: true

# Imports individual Stripe payment rows with smart project and child detection.
#
# This service handles:
# - Donor lookup via Stripe customer ID or email
# - Multi-child sponsorship detection via regex parsing
# - Project mapping via 10-step pattern matching (TICKET-071)
# - Idempotent imports (skips if transaction_id already exists)
# - Transaction safety for multi-donation sponsorships
#
# Pattern matching priority (highest to lowest):
# 1. Sponsorship (child names in description)
# 2. General Monthly Donation
# 3. Campaign by ID
# 4. Named items (Water Filter, Bibles, Food)
# 5. Generic phone numbers → General Donation
#
# Uses instance method pattern for complex multi-step operations.
#
# 🗑️ CODE LIFECYCLE: TEMPORARY - One-Time Use Only
# Will be replaced by TICKET-026 (Stripe Webhook Integration) for real-time sync.
#
# @example Import a Stripe payment row
#   service = StripePaymentImportService.new(csv_row_hash)
#   result = service.import
#   # => { success: true, donations: [<Donation>, ...], skipped: false }
#
# @see DonorService for donor lookup logic
# @see StripeCsvBatchImporter for batch processing
# @see TICKET-070 for multi-child sponsorship implementation
# @see TICKET-071 for project pattern matching
class StripePaymentImportService
  SPONSORSHIP_PATTERN = /Monthly Sponsorship Donation for (.+)/i
  GENERAL_PATTERN = /\$\d+ - General Monthly Donation/i
  CAMPAIGN_PATTERN = /Donation for Campaign (\d+)/i
  EMAIL_PATTERN = /\A[\w+\-.]+@[a-z\d\-]+(\.[a-z\d\-]+)*\.[a-z]+\z/i

  def initialize(csv_row)
    @csv_row = csv_row
    @imported_donations = []
  end

  def import
    return skip_result("Status not succeeded") unless succeeded?

    ActiveRecord::Base.transaction do
      create_stripe_invoice
      donor = find_or_create_donor
      child_names = extract_child_names

      if child_names.any?
        create_sponsorship_donations(donor, child_names)
      else
        create_project_donation(donor)
      end
    end

    return skip_result("Already imported") if @imported_donations.empty?

    { success: true, donations: @imported_donations, skipped: false }
  rescue StandardError => e
    { success: false, donations: [], skipped: false, error: e.message }
  end

  private

  def create_stripe_invoice
    StripeInvoice.find_or_create_by!(stripe_invoice_id: @csv_row["Transaction ID"]) do |invoice|
      invoice.stripe_charge_id = @csv_row["Transaction ID"]
      invoice.stripe_customer_id = @csv_row["Cust ID"]
      invoice.stripe_subscription_id = @csv_row["Cust Subscription Data ID"]
      invoice.total_amount_cents = amount_in_cents
      invoice.invoice_date = Date.parse(@csv_row["Created Formatted"])
    end
  end

  def find_or_create_donor
    donor_result = DonorService.find_or_update_by_email_or_stripe_customer(
      {
        name: @csv_row["Billing Details Name"],
        email: @csv_row["Cust Email"]
      },
      @csv_row["Cust ID"],
      DateTime.parse(@csv_row["Created Formatted"])
    )
    donor_result[:donor]
  end

  def create_sponsorship_donations(donor, child_names)
    child_names.each do |child_name|
      child = Child.find_or_create_by!(name: child_name)

      next if sponsorship_donation_exists?(child.id)

      donation = Donation.create!(
        donor: donor,
        amount: amount_in_cents,
        date: Date.parse(@csv_row["Created Formatted"]),
        child_id: child.id,
        payment_method: :stripe,
        stripe_charge_id: @csv_row["Transaction ID"],
        stripe_customer_id: @csv_row["Cust ID"],
        stripe_subscription_id: @csv_row["Cust Subscription Data ID"],
        stripe_invoice_id: @csv_row["Transaction ID"]
      )

      @imported_donations << donation
    end
  end

  def create_project_donation(donor)
    project = find_or_create_project

    return if project_donation_exists?(project.id)

    donation = Donation.create!(
      donor: donor,
      project: project,
      amount: amount_in_cents,
      date: Date.parse(@csv_row["Created Formatted"]),
      child_id: nil,
      payment_method: :stripe,
      stripe_charge_id: @csv_row["Transaction ID"],
      stripe_customer_id: @csv_row["Cust ID"],
      stripe_subscription_id: @csv_row["Cust Subscription Data ID"],
      stripe_invoice_id: @csv_row["Transaction ID"]
    )

    @imported_donations << donation
  end

  def sponsorship_donation_exists?(child_id)
    Donation
      .joins(:sponsorship)
      .where(stripe_invoice_id: @csv_row["Transaction ID"])
      .where(sponsorships: { child_id: child_id })
      .exists?
  end

  def project_donation_exists?(project_id)
    Donation.where(
      stripe_invoice_id: @csv_row["Transaction ID"],
      project_id: project_id,
      sponsorship_id: nil
    ).exists?
  end

  def succeeded?
    @csv_row["Status"]&.downcase == "succeeded"
  end

  def extract_child_names
    description_text = get_description_text
    return [] if description_text.blank?

    match = description_text.match(SPONSORSHIP_PATTERN)
    return [] unless match

    # Handle comma-separated children (e.g., "Wan,Monthly Sponsorship Donation for Orawan")
    child_text = match[1]
    child_text.split(",").map(&:strip).reject(&:blank?)
  end

  def get_description_text
    # Try Nickname first (column 16), fallback to Description (column 7)
    nickname = @csv_row["Cust Subscription Data Plan Nickname"]
    return nickname if nickname.present?

    @csv_row["Description"]
  end

  def amount_in_cents
    amount_dollars = @csv_row["Amount"].to_f
    (amount_dollars * 100).to_i
  end

  def already_imported?
    stripe_invoice_id = @csv_row["Transaction ID"]
    return false if stripe_invoice_id.blank?
    StripeInvoice.exists?(stripe_invoice_id: stripe_invoice_id)
  end

  def skip_result(reason)
    { success: true, donations: [], skipped: true, reason: reason }
  end

  def find_or_create_project
    description_text = get_description_text

    return general_donation_project if general_donation?(description_text)
    return campaign_project(description_text) if campaign_donation?(description_text)

    # Named projects - create for admin review via TICKET-027
    create_named_project(description_text)
  end

  def general_donation?(description_text)
    description_text.blank? ||
      description_text.match(GENERAL_PATTERN) ||
      description_text.match(/Invoice [A-Z0-9-]+/i) ||
      description_text.match(EMAIL_PATTERN) ||
      description_text.match(/\A\d+\z/) ||
      description_text.match(/Subscription creation/i) ||
      description_text.match(/Captured via Payment app/i) ||
      description_text.match(/Payment for Stripe App/i)
  end

  def campaign_donation?(description_text)
    description_text&.match(CAMPAIGN_PATTERN)
  end

  def general_donation_project
    Project.find_or_create_by!(title: "General Donation") do |project|
      project.project_type = :general
      project.system = true
    end
  end

  def campaign_project(description_text)
    match = description_text.match(CAMPAIGN_PATTERN)
    campaign_id = match[1]

    Project.find_or_create_by!(title: "Campaign #{campaign_id}") do |project|
      project.project_type = :campaign
      project.system = false
    end
  end

  def create_named_project(description_text)
    truncated_desc = description_text.to_s[0, 100]

    Project.find_or_create_by!(title: truncated_desc) do |project|
      project.project_type = :general
      project.system = false
      project.description = "Auto-created from Stripe import. Original description: #{description_text}"
    end
  end
end
