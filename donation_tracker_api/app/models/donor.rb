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
  before_discard :check_active_sponsorships

  validates :name, presence: true
  validates :email, presence: true, format: { with: URI::MailTo::EMAIL_REGEXP }, uniqueness: { case_sensitive: false, conditions: -> { kept } }

  # Ransack: Explicitly whitelist searchable attributes
  def self.ransackable_attributes(_auth_object = nil)
    [ "name", "email", "created_at", "updated_at", "last_updated_at", "name_or_email", "discarded_at" ]
  end

  def self.ransackable_associations(_auth_object = nil)
    %w[donations sponsorships children]
  end

  # Custom Ransack searcher for name OR email
  ransacker :name_or_email do
    Arel.sql("CONCAT(name, ' ', email)")
  end

  def can_be_deleted?
    donations.empty? && sponsorships.empty?
  end

  private

  def check_active_sponsorships
    if sponsorships.active.exists?
      errors.add(:base, "Cannot archive donor with active sponsorships")
      throw :abort
    end
  end

  def set_defaults
    self.name = "Anonymous" if name.blank?

    if email.blank?
      # Generate email from name (after name has been set)
      clean_name = name.gsub(/\s+/, "")
      self.email = "#{clean_name}@mailinator.com"
    end
  end
end
