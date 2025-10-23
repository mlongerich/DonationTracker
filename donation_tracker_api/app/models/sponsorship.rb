class Sponsorship < ApplicationRecord
  belongs_to :donor
  belongs_to :child
  belongs_to :project, optional: true

  validates :monthly_amount, presence: true, numericality: { greater_than: 0 }
  validate :no_duplicate_active_sponsorships

  scope :active, -> { where(end_date: nil) }

  before_validation :create_sponsorship_project, on: :create

  def active?
    end_date.nil?
  end

  private

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
