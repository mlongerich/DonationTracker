class Sponsorship < ApplicationRecord
  belongs_to :donor
  belongs_to :child
  belongs_to :project, optional: true

  validates :monthly_amount, presence: true, numericality: { greater_than: 0 }

  scope :active, -> { where(end_date: nil) }

  before_validation :create_sponsorship_project, on: :create

  def active?
    end_date.nil?
  end

  private

  def create_sponsorship_project
    return if project.present?
    return unless child.present?

    self.project = Project.create!(
      project_type: :sponsorship,
      title: "Sponsor #{child.name}",
      system: false
    )
  end
end
