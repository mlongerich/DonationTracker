# frozen_string_literal: true

# Provides stateless donor lookup and matching logic.
#
# This service provides class methods for:
# - Finding or creating donors by email with smart matching
# - Finding donors by Stripe customer ID with merge chain following
# - Email normalization for Anonymous donors
# - Date-based conflict resolution (most recent update wins)
#
# Uses class method pattern for stateless operations.
#
# @example Find or create donor by email
#   result = DonorService.find_or_update_by_email(
#     { name: "John Doe", email: "john@example.com" },
#     Time.current
#   )
#   # => { donor: <Donor>, created: true }
#
# @example Find donor by Stripe customer ID
#   result = DonorService.find_or_update_by_email_or_stripe_customer(
#     { name: "Jane Doe", email: "jane@example.com" },
#     "cus_123456",
#     Date.today
#   )
#   # => { donor: <Donor>, created: false, redirected: false }
#
# @see Donor model for donor attributes
# @see DonorMergeService for merging duplicate donors
# @see TICKET-075 for Stripe customer ID tracking
class DonorService
  def self.find_or_update_by_email_or_stripe_customer(donor_attributes, stripe_customer_id, transaction_date)
    # Priority 1: Check for existing donor by stripe_customer_id
    if stripe_customer_id.present?
      existing_donation = Donation.where(stripe_customer_id: stripe_customer_id).first

      if existing_donation
        donor = existing_donation.donor
        original_donor_id = donor.id

        # Follow merge chain if donor was merged
        while donor.merged_into_id.present?
          donor = Donor.find(donor.merged_into_id)
        end

        return {
          donor: donor,
          created: false,
          redirected: (donor.id != original_donor_id)
        }
      end
    end

    # Priority 2: Fallback to email lookup (existing logic)
    find_or_update_by_email(donor_attributes, transaction_date)
  end

  def self.find_or_update_by_email(donor_attributes, transaction_date)
    lookup_email = normalize_email(donor_attributes)
    existing_donor = find_existing_donor(lookup_email)

    if existing_donor
      update_existing_donor(existing_donor, donor_attributes, transaction_date)
    else
      create_new_donor(donor_attributes, transaction_date)
    end
  end

  private

  def self.normalize_email(donor_attributes)
    email = donor_attributes[:email]
    return email unless email.blank?

    # If email is blank, generate from phone/address/name (matching Donor model logic)
    # Priority: phone > address > name
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

  def self.find_existing_donor(lookup_email)
    Donor.where("LOWER(email) = ?", lookup_email.downcase).first
  end

  def self.update_existing_donor(existing_donor, donor_attributes, transaction_date)
    last_updated = existing_donor.last_updated_at || Time.zone.at(0)
    if transaction_date > last_updated
      update_attrs = build_update_attributes(donor_attributes, transaction_date)
      existing_donor.update!(update_attrs)
    end
    { donor: existing_donor, created: false }
  end

  def self.build_update_attributes(donor_attributes, transaction_date)
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

  def self.create_new_donor(donor_attributes, transaction_date)
    donor = Donor.new(donor_attributes)
    donor.last_updated_at = transaction_date
    donor.save!
    { donor: donor, created: true }
  end
end
