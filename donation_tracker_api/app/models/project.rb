class Project < ApplicationRecord
  has_many :donations

  enum :project_type, { general: 0, campaign: 1, sponsorship: 2 }, prefix: true

  validates :title, presence: true

  before_destroy :prevent_system_project_deletion

  private

  def prevent_system_project_deletion
    if system?
      errors.add(:base, "Cannot delete system projects")
      throw :abort
    end
  end
end
