# frozen_string_literal: true

# Represents a financial donation to the organization.
#
# A donation must have:
# - Positive amount in cents (validates numericality > 0)
# - Date (not in future)
# - Associated donor (required)
# - Optional project association
# - Optional sponsorship association (required if project is sponsorship type)
#
# Features:
# - Auto-restores archived donors/projects when creating donations
# - Smart sponsorship creation via child_id virtual attribute
# - Ransack filtering on amount, date, donor_id, project_id
# - Validates sponsorship projects must have sponsorship_id
#
# @example Create a donation
#   Donation.create!(amount: 10000, date: Date.today, donor: donor, project: project)
#
# @example Create donation with child_id (auto-creates sponsorship)
#   Donation.create!(amount: 5000, date: Date.today, donor: donor, child_id: 1)
#
# @see Donor for donor relationship
# @see Project for project relationship
# @see Sponsorship for sponsorship relationship
# @see TICKET-061 for auto-sponsorship creation
class Donation < ApplicationRecord
  belongs_to :donor
  belongs_to :project, optional: true
  belongs_to :sponsorship, optional: true
  belongs_to :stripe_invoice, optional: true, foreign_key: :stripe_invoice_id, primary_key: :stripe_invoice_id

  attr_accessor :child_id

  before_create :restore_archived_associations
  before_create :auto_create_sponsorship_from_child_id

  validates :amount, presence: true, numericality: { greater_than: 0 }
  validates :date, presence: true
  validate :date_not_in_future
  validate :sponsorship_project_must_have_sponsorship_id

  def self.ransackable_attributes(_auth_object = nil)
    [ "amount", "date", "donor_id", "project_id", "created_at", "updated_at" ]
  end

  private

  def restore_archived_associations
    donor.undiscard if donor&.discarded?
    project.undiscard if project&.discarded?
  end

  def auto_create_sponsorship_from_child_id
    return unless child_id.present?

    sponsorship = Sponsorship.active.find_or_create_by!(
      donor_id: donor_id,
      child_id: child_id,
      monthly_amount: amount
    )

    self.sponsorship_id = sponsorship.id
    self.project_id = sponsorship.project_id
  end

  def date_not_in_future
    return if date.blank?

    if date > Date.today
      errors.add(:date, "cannot be in the future")
    end
  end

  def sponsorship_project_must_have_sponsorship_id
    return unless project_id.present?
    return unless project&.project_type_sponsorship?

    if sponsorship_id.blank?
      errors.add(:sponsorship_id, "must be present for sponsorship projects")
    end
  end
end
