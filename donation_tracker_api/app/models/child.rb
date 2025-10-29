class Child < ApplicationRecord
  include Discard::Model

  has_many :sponsorships, dependent: :restrict_with_exception
  has_many :donors, through: :sponsorships

  before_discard :check_active_sponsorships

  validates :name, presence: true

  def self.ransackable_attributes(auth_object = nil)
    [ "name", "discarded_at" ]
  end

  def can_be_deleted?
    sponsorships.empty?
  end

  private

  def check_active_sponsorships
    if sponsorships.active.exists?
      errors.add(:base, "Cannot archive child with active sponsorships")
      throw :abort
    end
  end
end
