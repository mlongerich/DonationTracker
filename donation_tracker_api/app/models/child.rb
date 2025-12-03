# frozen_string_literal: true

# Represents a child sponsored by donors.
#
# A child must have:
# - Name (required)
#
# Features:
# - Soft-delete support via Discard gem (archive/restore)
# - Cascade delete prevention (restrict if sponsorships exist)
# - Ransack filtering on name and discarded_at
# - Prevents archiving if active sponsorships exist
#
# @example Create a child
#   Child.create!(name: "Maria Rodriguez")
#
# @see Sponsorship for sponsorship relationship
# @see Donor for donor relationship (through sponsorships)
# @see TICKET-049 for soft-delete implementation
class Child < ApplicationRecord
  include Discard::Model

  has_many :sponsorships, dependent: :restrict_with_exception
  has_many :donors, through: :sponsorships
  has_many :donations, through: :sponsorships

  before_discard :check_active_sponsorships

  validates :name, presence: true

  # Whitelist searchable attributes for Ransack (security: prevent SQL injection)
  def self.ransackable_attributes(_auth_object = nil)
    %w[name discarded_at]
  end

  # Whitelist searchable associations for Ransack (security: prevent unauthorized joins)
  def self.ransackable_associations(_auth_object = nil)
    %w[sponsorships donors]
  end

  def can_be_deleted?
    sponsorships.empty?
  end

  def last_donation_date
    donations.maximum(:date)
  end

  private

  def check_active_sponsorships
    if sponsorships.active.exists?
      errors.add(:base, "Cannot archive child with active sponsorships")
      throw :abort
    end
  end
end
