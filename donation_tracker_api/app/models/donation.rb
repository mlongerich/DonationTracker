class Donation < ApplicationRecord
  belongs_to :donor
  belongs_to :project, optional: true

  validates :amount, presence: true, numericality: { greater_than: 0 }
  validates :date, presence: true
  validate :date_not_in_future

  def self.ransackable_attributes(auth_object = nil)
    [ "amount", "date", "donor_id", "project_id", "created_at", "updated_at" ]
  end

  private

  def date_not_in_future
    return if date.blank?

    if date > Date.today
      errors.add(:date, "cannot be in the future")
    end
  end
end
