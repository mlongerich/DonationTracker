# frozen_string_literal: true

# Imports individual Stripe payment rows with status tracking and metadata support.
#
# This service handles:
# - Donor lookup via Stripe customer ID or email
# - Payment status determination (succeeded, failed, refunded, canceled, needs_attention)
# - Metadata-first child/project mapping (webhooks) with parsing fallback (CSV)
# - Multi-child sponsorship detection via regex parsing
# - Duplicate subscription detection (same child, different subscription_id)
# - Idempotent imports via subscription_id + child_id or charge_id + project_id
# - Transaction safety for multi-donation sponsorships
#
# Metadata extraction priority:
# 1. metadata.child_id / metadata.project_id (webhooks, future Stripe UI)
# 2. Fallback to nickname/description parsing (current CSV exports)
#
# Idempotency strategy:
# 1. Sponsorships: subscription_id + child_id (allows multi-child subscriptions)
# 2. Projects: charge_id + project_id (one-time donations)
#
# Status determination:
# - Maps Stripe payment status → donation status enum
# - Flags duplicate subscriptions as needs_attention
# - Validates data and sets needs_attention for issues
#
# Uses instance method pattern for complex multi-step operations.
#
# ⭐ CODE LIFECYCLE: PERMANENT - Production Import Logic
# Designed for CSV imports AND future Stripe webhook integration (TICKET-026).
#
# @example Import a Stripe CSV row
#   service = StripePaymentImportService.new(csv_row_hash)
#   result = service.import
#   # => { success: true, donations: [<Donation>, ...], skipped: false }
#
# @example Import with metadata (webhook format)
#   csv_row = {
#     'metadata' => { 'child_id' => '42', 'project_id' => '7' },
#     'Status' => 'succeeded',
#     ...
#   }
#   result = StripePaymentImportService.new(csv_row).import
#
# @see DonorService for donor lookup logic
# @see StripeCsvBatchImporter for batch processing
# @see TICKET-110 for status & metadata support
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
    @payment_status = nil
  end

  def import
    @payment_status = determine_payment_status

    # Check idempotency before importing
    existing = find_existing_donation
    return skip_result("Already imported (ID: #{existing.id})") if existing

    perform_import_transaction
    return skip_result("Already imported") if @imported_donations.empty?

    success_result
  rescue StandardError => error
    error_result(error)
  end

  private

  def determine_payment_status
    stripe_status = @csv_row["Status"]&.downcase

    case stripe_status
    when "succeeded"
      "succeeded"
    when "failed"
      "failed"
    when "refunded"
      "refunded"
    when "canceled"
      "canceled"
    else
      "needs_attention"
    end
  end

  def find_existing_donation
    subscription_id = @csv_row["Cust Subscription Data ID"]

    # Strategy 1: Check by subscription_id + child_id (sponsorships)
    if subscription_id.present?
      child_or_children = get_child

      if child_or_children.is_a?(Child)
        existing = Donation.find_by(
          stripe_subscription_id: subscription_id,
          child_id: child_or_children.id
        )
        return existing if existing
      elsif child_or_children.is_a?(Array)
        # Multi-child: Check if ANY child already has this subscription
        child_or_children.each do |child_name|
          child = Child.find_by(name: child_name)
          next unless child

          existing = Donation.find_by(
            stripe_subscription_id: subscription_id,
            child_id: child.id
          )
          return existing if existing
        end
      end
    end

    # Strategy 2: Fall back to charge_id + project_id (project donations, one-time payments)
    charge_id = @csv_row["Transaction ID"]
    if charge_id.present?
      project = get_project
      existing = Donation.find_by(
        stripe_charge_id: charge_id,
        project_id: project&.id,
        sponsorship_id: nil # Ensure we're looking at project donations only
      )
      return existing if existing
    end

    nil
  end

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

  def get_child
    # Priority 1: Metadata (webhooks, future Stripe UI)
    child_id = @csv_row.dig("metadata", "child_id")
    if child_id.present?
      child = Child.find_by(id: child_id)
      return child if child
    end

    # Priority 2: Parse nickname (current CSV exports, backwards compatibility)
    child_names = extract_child_names
    return nil if child_names.empty?

    # Multiple children - return array for multi-child sponsorships
    return child_names if child_names.size > 1

    # Single child - find or create
    Child.find_or_create_by!(name: child_names.first)
  end

  def create_single_child_donation(donor, child)
    return if sponsorship_donation_exists?(child.id)

    subscription_id = @csv_row["Cust Subscription Data ID"]

    # Check for duplicate subscription (same child, different subscription ID)
    duplicate_detected = false
    needs_attention_reason = nil

    if subscription_id.present?
      existing_subscriptions = Donation.where(child_id: child.id)
                                       .where.not(stripe_subscription_id: nil)
                                       .where.not(stripe_subscription_id: subscription_id)
                                       .pluck(:stripe_subscription_id)

      if existing_subscriptions.any?
        duplicate_detected = true
        needs_attention_reason = "Duplicate subscription detected. Child #{child.name} already has subscription(s): #{existing_subscriptions.join(', ')}"
      end
    end

    # Determine final status
    final_status = duplicate_detected ? "needs_attention" : @payment_status

    donation = Donation.create!(
      donor: donor,
      amount: amount_in_cents,
      date: Date.parse(@csv_row["Created Formatted"]),
      child_id: child.id,
      payment_method: :stripe,
      status: final_status,
      stripe_charge_id: @csv_row["Transaction ID"],
      stripe_customer_id: @csv_row["Cust ID"],
      stripe_subscription_id: subscription_id,
      stripe_invoice_id: @csv_row["Transaction ID"],
      duplicate_subscription_detected: duplicate_detected,
      needs_attention_reason: needs_attention_reason
    )

    @imported_donations << donation
  end

  def create_sponsorship_donations(donor, child_names)
    subscription_id = @csv_row["Cust Subscription Data ID"]

    child_names.each do |child_name|
      child = Child.find_or_create_by!(name: child_name)

      next if sponsorship_donation_exists?(child.id)

      # Check for duplicate subscription (same child, different subscription ID)
      duplicate_detected = false
      needs_attention_reason = nil

      if subscription_id.present?
        existing_subscriptions = Donation.where(child_id: child.id)
                                         .where.not(stripe_subscription_id: nil)
                                         .where.not(stripe_subscription_id: subscription_id)
                                         .pluck(:stripe_subscription_id)

        if existing_subscriptions.any?
          duplicate_detected = true
          needs_attention_reason = "Duplicate subscription detected. Child #{child.name} already has subscription(s): #{existing_subscriptions.join(', ')}"
        end
      end

      # Determine final status
      final_status = duplicate_detected ? "needs_attention" : @payment_status

      donation = Donation.create!(
        donor: donor,
        amount: amount_in_cents,
        date: Date.parse(@csv_row["Created Formatted"]),
        child_id: child.id,
        payment_method: :stripe,
        status: final_status,
        stripe_charge_id: @csv_row["Transaction ID"],
        stripe_customer_id: @csv_row["Cust ID"],
        stripe_subscription_id: subscription_id,
        stripe_invoice_id: @csv_row["Transaction ID"],
        duplicate_subscription_detected: duplicate_detected,
        needs_attention_reason: needs_attention_reason
      )

      @imported_donations << donation
    end
  end

  def get_project
    # Priority 1: Metadata (webhooks, future Stripe UI)
    project_id = @csv_row.dig("metadata", "project_id")
    if project_id.present?
      project = Project.find_by(id: project_id)
      return project if project
    end

    # Priority 2: Description mapping (current CSV)
    find_or_create_project
  end

  def create_project_donation(donor)
    project = get_project

    return if project_donation_exists?(project.id)

    donation = Donation.create!(
      donor: donor,
      project: project,
      amount: amount_in_cents,
      date: Date.parse(@csv_row["Created Formatted"]),
      child_id: nil,
      payment_method: :stripe,
      status: @payment_status,
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

  def perform_import_transaction
    ActiveRecord::Base.transaction do
      create_stripe_invoice
      donor = find_or_create_donor
      child_or_children = get_child

      if child_or_children.is_a?(Array)
        # Multi-child sponsorship
        create_sponsorship_donations(donor, child_or_children)
      elsif child_or_children.is_a?(Child)
        # Single child sponsorship from metadata
        create_single_child_donation(donor, child_or_children)
      else
        # Project donation
        create_project_donation(donor)
      end
    end
  end

  def success_result
    { success: true, donations: @imported_donations, skipped: false }
  end

  def error_result(error)
    { success: false, donations: [], skipped: false, error: error.message }
  end
end
