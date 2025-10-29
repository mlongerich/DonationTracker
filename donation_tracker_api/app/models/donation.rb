class Donation < ApplicationRecord
  belongs_to :donor
  belongs_to :project, optional: true

  before_create :restore_archived_associations

  validates :amount, presence: true, numericality: { greater_than: 0 }
  validates :date, presence: true
  validate :date_not_in_future

  def self.ransackable_attributes(auth_object = nil)
    [ "amount", "date", "donor_id", "project_id", "created_at", "updated_at" ]
  end

  private

  def restore_archived_associations
    donor.undiscard if donor&.discarded?
    project.undiscard if project&.discarded?
  end

  def date_not_in_future
    return if date.blank?

    if date > Date.today
      errors.add(:date, "cannot be in the future")
    end
  end
end
