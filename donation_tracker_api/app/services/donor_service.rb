# frozen_string_literal: true

# Provides donor lookup and matching logic with instance-based pattern.
#
# This service provides:
# - Finding or creating donors by email with smart matching
# - Finding donors by Stripe customer ID with merge chain following
# - Email normalization for Anonymous donors
# - Date-based conflict resolution (most recent update wins)
# - Phone and address field preservation (blank updates don't overwrite existing data)
#
# Uses instance method pattern for stateful, multi-step operations.
#
# @example Find or create donor by email
#   service = DonorService.new(
#     donor_attributes: { name: "John Doe", email: "john@example.com" },
#     transaction_date: Time.current
#   )
#   result = service.find_or_update
#   # => { donor: <Donor>, created: true }
#
# @example Find donor by Stripe customer ID
#   service = DonorService.new(
#     donor_attributes: { name: "Jane Doe", email: "jane@example.com" },
#     transaction_date: Date.today,
#     stripe_customer_id: "cus_123456"
#   )
#   result = service.find_or_update
#   # => { donor: <Donor>, created: false, redirected: false }
#
# @see Donor model for donor attributes
# @see DonorMergeService for merging duplicate donors
# @see TICKET-037 for instance pattern refactoring
# @see TICKET-075 for Stripe customer ID tracking
# @see TICKET-100 for phone/address field preservation
class DonorService
  def initialize(donor_attributes:, transaction_date:, stripe_customer_id: nil)
    @donor_attributes = donor_attributes
    @transaction_date = transaction_date
    @stripe_customer_id = stripe_customer_id
    @lookup_email = nil
    @existing_donor = nil
  end

  # Main public method - handles both Stripe customer ID and email lookup
  def find_or_update
    if stripe_customer_id_lookup_possible?
      find_by_stripe_customer_id_or_email
    else
      find_by_email
    end
  end

  private

  attr_reader :donor_attributes, :transaction_date, :stripe_customer_id
  attr_accessor :lookup_email, :existing_donor

  def stripe_customer_id_lookup_possible?
    stripe_customer_id.present?
  end

  def find_by_stripe_customer_id_or_email
    # Priority 1: Check for existing donation with stripe_customer_id
    existing_donation = Donation.where(stripe_customer_id: stripe_customer_id).first

    if existing_donation
      donor = existing_donation.donor
      original_donor_id = donor.id

      # Follow merge chain if donor was merged
      donor = follow_merge_chain(donor)

      return {
        donor: donor,
        created: false,
        redirected: (donor.id != original_donor_id)
      }
    end

    # Priority 2: Fallback to email lookup (existing logic)
    find_by_email
  end

  def follow_merge_chain(donor)
    while donor.merged_into_id.present?
      donor = Donor.find(donor.merged_into_id)
    end
    donor
  end

  def find_by_email
    normalize_email
    find_existing_donor
    create_or_update_donor
  end

  def normalize_email
    @lookup_email = if donor_attributes[:email].blank?
      generate_anonymous_email
    else
      donor_attributes[:email]
    end
  end

  def generate_anonymous_email
    # Priority: phone > address > name
    # Must match Donor model set_defaults callback logic (TICKET-100)
    phone = donor_attributes[:phone]
    address_line1 = donor_attributes[:address_line1]
    city = donor_attributes[:city]
    name = donor_attributes[:name]

    if phone.present?
      sanitized_phone = phone.gsub(/\D/, "")
      "anonymous-#{sanitized_phone}@mailinator.com"
    elsif address_line1.present? || city.present?
      address_parts = [ address_line1, city ].compact.reject(&:blank?)
      sanitized_address = address_parts.join("-").gsub(/\s+/, "").downcase
      "anonymous-#{sanitized_address}@mailinator.com"
    else
      # Pure anonymous - use name
      normalized_name = name.blank? ? "Anonymous" : name
      clean_name = normalized_name.gsub(/\s+/, "")
      "#{clean_name}@mailinator.com"
    end
  end

  def find_existing_donor
    @existing_donor = Donor.where("LOWER(email) = ?", lookup_email.downcase).first
  end

  def create_or_update_donor
    if existing_donor
      update_existing_donor
    else
      create_new_donor
    end
  end

  def update_existing_donor
    last_updated = existing_donor.last_updated_at || Time.zone.at(0)
    if transaction_date >= last_updated
      update_attrs = build_update_attributes
      existing_donor.update!(update_attrs)
    end
    { donor: existing_donor, created: false }
  end

  def build_update_attributes
    # Field preservation logic - blank fields don't overwrite existing data (TICKET-100)
    update_attrs = donor_attributes.merge(last_updated_at: transaction_date)
    update_attrs.delete(:name) if donor_attributes[:name].blank?
    update_attrs.delete(:phone) if donor_attributes[:phone].blank?
    update_attrs.delete(:address_line1) if donor_attributes[:address_line1].blank?
    update_attrs.delete(:address_line2) if donor_attributes[:address_line2].blank?
    update_attrs.delete(:city) if donor_attributes[:city].blank?
    update_attrs.delete(:state) if donor_attributes[:state].blank?
    update_attrs.delete(:zip_code) if donor_attributes[:zip_code].blank?
    update_attrs.delete(:country) if donor_attributes[:country].blank?
    update_attrs
  end

  def create_new_donor
    donor = Donor.new(donor_attributes)
    donor.last_updated_at = transaction_date
    donor.save!
    { donor: donor, created: true }
  end
end
