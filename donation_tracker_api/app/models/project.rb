# frozen_string_literal: true

# Represents a fundraising project or campaign.
#
# A project must have:
# - Title (unique, required)
# - Project type (general, campaign, sponsorship)
# - Optional description
#
# Features:
# - Soft-delete support via Discard gem (archive/restore)
# - System project protection (cannot delete/archive system projects)
# - Cascade delete prevention (restrict if donations or sponsorships exist)
# - Prevents archiving if active sponsorships exist
# - Enum for project_type with prefix (project_type_general?, etc.)
#
# @example Create a project
#   Project.create!(title: "Summer Campaign", project_type: :campaign)
#
# @see Donation for donation relationship
# @see Sponsorship for sponsorship relationship
# @see TICKET-038 for cascade delete implementation
class Project < ApplicationRecord
  include Discard::Model

  has_many :donations, dependent: :restrict_with_exception
  has_many :sponsorships, dependent: :restrict_with_exception

  enum :project_type, { general: 0, campaign: 1, sponsorship: 2 }, prefix: true

  validates :title, presence: true, uniqueness: true

  before_destroy :prevent_system_project_deletion
  before_discard :check_active_sponsorships

  def can_be_deleted?
    !system? && donations.empty? && sponsorships.empty?
  end

  private

  def prevent_system_project_deletion
    if system?
      errors.add(:base, "Cannot delete system projects")
      throw :abort
    end
  end

  def check_active_sponsorships
    if sponsorships.active.exists?
      errors.add(:base, "Cannot archive project with active sponsorships")
      throw :abort
    end
  end
end
