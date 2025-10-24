class Child < ApplicationRecord
  has_many :sponsorships, dependent: :restrict_with_exception
  has_many :donors, through: :sponsorships

  validates :name, presence: true

  def self.ransackable_attributes(auth_object = nil)
    [ "name" ]
  end

  def can_be_deleted?
    sponsorships.empty?
  end
end
