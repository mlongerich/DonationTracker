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
