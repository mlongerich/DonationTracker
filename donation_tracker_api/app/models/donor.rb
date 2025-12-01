# frozen_string_literal: true

# Represents a donor who contributes to the organization.
#
# A donor must have:
# - Name (defaults to "Anonymous" if blank)
# - Email (validated with URI format, unique among non-archived donors)
# - Defaults: Anonymous donors get auto-generated email (name@mailinator.com)
#
# Features:
# - Soft-delete support via Discard gem (archive/restore)
# - Version tracking via PaperTrail
# - Cascade delete prevention (restrict if donations or sponsorships exist)
# - Ransack filtering on name, email, and custom name_or_email searcher
# - Prevents archiving if active sponsorships exist
#
# @example Create a donor
#   Donor.create!(name: "John Doe", email: "john@example.com")
#
# @see Donation for donation relationship
# @see Sponsorship for sponsorship relationship
# @see DonorService for smart email matching logic
# @see TICKET-062 for soft-delete implementation
class Donor < ApplicationRecord
  include Discard::Model

  has_paper_trail
  has_many :donations, dependent: :restrict_with_exception
  has_many :sponsorships, dependent: :restrict_with_exception
  has_many :children, through: :sponsorships

  before_validation :set_defaults
  before_validation :normalize_zip_code
  before_discard :check_active_sponsorships

  validates :name, presence: true
  validates :email, presence: true, format: { with: URI::MailTo::EMAIL_REGEXP }, uniqueness: { case_sensitive: false, conditions: -> { kept } }
  validates :phone, phone: { possible: true, allow_blank: true }
  validates :zip_code, zipcode: { country_code_attribute: :country, allow_blank: true }

  # Ransack: Explicitly whitelist searchable attributes
  def self.ransackable_attributes(_auth_object = nil)
    [
      "name", "email", "phone",
      "address_line1", "city", "state", "zip_code", "country",
      "created_at", "updated_at", "last_updated_at", "discarded_at"
    ]
  end

  def self.ransackable_associations(_auth_object = nil)
    %w[donations sponsorships children]
  end

  def can_be_deleted?
    donations.empty? && sponsorships.empty?
  end

  def last_donation_date
    donations.maximum(:date)
  end

  def full_address
    parts = [
      address_line1,
      address_line2,
      city_state_zip,
      country_display
    ].compact.reject(&:blank?)

    parts.any? ? parts.join("\n") : nil
  end

  private

  def city_state_zip
    [ city, state, zip_code ].compact.reject(&:blank?).join(" ")
  end

  def country_display
    country if country.present? && country != "USA"
  end

  def check_active_sponsorships
    if sponsorships.active.exists?
      errors.add(:base, "Cannot archive donor with active sponsorships")
      throw :abort
    end
  end

  def set_defaults
    self.name = "Anonymous" if name.blank?

    if email.blank?
      # Priority: phone > address > name
      if phone.present?
        sanitized_phone = phone.gsub(/\D/, "")
        self.email = "anonymous-#{sanitized_phone}@mailinator.com"
      elsif address_line1.present? || city.present?
        # Generate from address components
        address_parts = [ address_line1, city ].compact.reject(&:blank?)
        sanitized_address = address_parts.join("-").gsub(/\s+/, "").downcase
        self.email = "anonymous-#{sanitized_address}@mailinator.com"
      else
        # Pure anonymous - use name
        clean_name = name.gsub(/\s+/, "")
        self.email = "#{clean_name}@mailinator.com"
      end
    end
  end

  def normalize_zip_code
    return unless zip_code.present? && (country == "US" || country == "USA")
    # Pad 4-digit US zip codes with leading zero (6419 → 06419)
    self.zip_code = zip_code.rjust(5, "0") if zip_code.length == 4 && zip_code.match?(/^\d{4}$/)
  end
end
