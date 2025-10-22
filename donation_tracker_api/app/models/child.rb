class Child < ApplicationRecord
  has_many :sponsorships
  has_many :donors, through: :sponsorships

  validates :name, presence: true

  def self.ransackable_attributes(auth_object = nil)
    [ "name" ]
  end
end
