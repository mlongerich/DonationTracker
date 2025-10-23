class Project < ApplicationRecord
  has_many :donations, dependent: :restrict_with_exception
  has_many :sponsorships, dependent: :restrict_with_exception

  enum :project_type, { general: 0, campaign: 1, sponsorship: 2 }, prefix: true

  validates :title, presence: true

  before_destroy :prevent_system_project_deletion

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
end
