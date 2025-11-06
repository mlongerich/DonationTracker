# frozen_string_literal: true

# Represents an ongoing sponsorship relationship between a donor and a child.
#
# A sponsorship must have:
# - Donor (required)
# - Child (required)
# - Monthly amount in cents (>= 0, allows 0 for system auto-created sponsorships)
# - Project (auto-created if not provided, must be sponsorship type)
# - Optional start_date and end_date
#
# Features:
# - Auto-creates sponsorship project if not provided
# - Auto-restores archived donors/children/projects when creating
# - Prevents duplicate active sponsorships (same donor, child, amount)
# - Active scope for sponsorships without end_date
# - Cascade delete prevention (restrict if donations exist)
# - Ransack filtering on donor_id, child_id, monthly_amount, dates
#
# @example Create a sponsorship
#   Sponsorship.create!(donor: donor, child: child, monthly_amount: 5000, start_date: Date.today)
#
# @see Donor for donor relationship
# @see Child for child relationship
# @see Project for project relationship
# @see Donation for donation relationship
# @see TICKET-064 for smart sponsorship detection
class Sponsorship < ApplicationRecord
  belongs_to :donor
  belongs_to :child
  belongs_to :project, optional: true
  has_many :donations, dependent: :restrict_with_exception

  # Note: Allow monthly_amount of 0 for system auto-created sponsorships (TICKET-064)
  # Frontend forms should still validate > 0 for manual user entry (UX requirement)
  validates :monthly_amount, presence: true, numericality: { greater_than_or_equal_to: 0 }
  validate :no_duplicate_active_sponsorships
  validate :project_must_be_sponsorship_type

  scope :active, -> { where(end_date: nil) }

  before_validation :create_sponsorship_project, on: :create
  before_create :restore_archived_associations

  def self.ransackable_attributes(_auth_object = nil)
    %w[donor_id child_id monthly_amount end_date start_date created_at]
  end

  def self.ransackable_associations(_auth_object = nil)
    %w[donor child project]
  end

  def active?
    end_date.nil?
  end

  def calculated_start_date
    donations.minimum(:date) || start_date || created_at&.to_date
  end

  private

  def restore_archived_associations
    donor.undiscard if donor&.discarded?
    child.undiscard if child&.discarded?
    project.undiscard if project&.discarded?
  end

  def no_duplicate_active_sponsorships
    return unless donor && child && monthly_amount

    existing = Sponsorship.where(
      donor_id: donor_id,
      child_id: child_id,
      monthly_amount: monthly_amount,
      end_date: nil
    ).where.not(id: id).exists?

    if existing
      errors.add(:base, "#{child.name} is already actively sponsored by #{donor.name}")
    end
  end

  def project_must_be_sponsorship_type
    return unless project_id.present? && project

    unless project.project_type_sponsorship?
      errors.add(:project, "must be a sponsorship project")
    end
  end

  def create_sponsorship_project
    return if project_id.present?
    return unless child

    # Find existing project for this child or create new one
    existing_project = child.sponsorships
                            .where.not(project_id: nil)
                            .first&.project

    if existing_project
      self.project_id = existing_project.id
    else
      self.project = Project.create!(
        project_type: :sponsorship,
        title: "Sponsor #{child.name}",
        system: false
      )
    end
  end
end
