class StripePaymentImportService
  SPONSORSHIP_PATTERN = /Monthly Sponsorship Donation for (.+)/i
  GENERAL_PATTERN = /\$\d+ - General Monthly Donation/i

  def initialize(csv_row)
    @csv_row = csv_row
    @imported_donations = []
  end

  def import
    return skip_result("Status not succeeded") unless succeeded?
    return skip_result("Already imported") if already_imported?

    StripeInvoice.create!(
      stripe_invoice_id: @csv_row["Transaction ID"],
      stripe_charge_id: @csv_row["Transaction ID"],
      stripe_customer_id: @csv_row["Cust ID"],
      stripe_subscription_id: @csv_row["Cust Subscription Data ID"],
      total_amount_cents: amount_in_cents,
      invoice_date: Date.parse(@csv_row["Created Formatted"])
    )

    donor_result = DonorService.find_or_update_by_email(
      {
        name: @csv_row["Billing Details Name"],
        email: @csv_row["Cust Email"]
      },
      DateTime.parse(@csv_row["Created Formatted"])
    )
    donor = donor_result[:donor]

    child_names = extract_child_names

    if child_names.any?
      # Sponsorship donation
      child_names.each do |child_name|
        child = Child.find_or_create_by!(name: child_name)

        donation = Donation.create!(
          donor: donor,
          amount: amount_in_cents,
          date: Date.parse(@csv_row["Created Formatted"]),
          child_id: child.id,
          stripe_charge_id: @csv_row["Transaction ID"],
          stripe_customer_id: @csv_row["Cust ID"],
          stripe_subscription_id: @csv_row["Cust Subscription Data ID"],
          stripe_invoice_id: @csv_row["Transaction ID"]
        )

        @imported_donations << donation
      end
    else
      # Non-sponsorship donation (general, campaign, etc.)
      project = find_or_create_project

      donation = Donation.create!(
        donor: donor,
        project: project,
        amount: amount_in_cents,
        date: Date.parse(@csv_row["Created Formatted"]),
        child_id: nil,
        stripe_charge_id: @csv_row["Transaction ID"],
        stripe_customer_id: @csv_row["Cust ID"],
        stripe_subscription_id: @csv_row["Cust Subscription Data ID"],
        stripe_invoice_id: @csv_row["Transaction ID"]
      )

      @imported_donations << donation
    end

    { success: true, donations: @imported_donations, skipped: false }
  end

  private

  def succeeded?
    @csv_row["Status"]&.downcase == "succeeded"
  end

  def extract_child_names
    description = @csv_row["Description"]
    return [] if description.blank?

    match = description.match(SPONSORSHIP_PATTERN)
    return [] unless match

    # Handle comma-separated children (e.g., "Wan,Monthly Sponsorship Donation for Orawan")
    child_text = match[1]
    child_text.split(",").map(&:strip).reject(&:blank?)
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
    description = @csv_row["Description"]

    # General donation pattern
    if description&.match(GENERAL_PATTERN)
      return Project.find_or_create_by!(title: "General Donation") do |project|
        project.project_type = :general
        project.system = true
      end
    end

    # If no pattern matches, return nil for now (will handle unmapped later)
    nil
  end
end
