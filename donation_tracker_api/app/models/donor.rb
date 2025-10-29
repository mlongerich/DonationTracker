class Donor < ApplicationRecord
  include Discard::Model

  has_paper_trail
  has_many :donations, dependent: :restrict_with_exception
  has_many :sponsorships, dependent: :restrict_with_exception
  has_many :children, through: :sponsorships

  before_validation :set_defaults
  before_discard :check_active_sponsorships

  validates :name, presence: true
  validates :email, presence: true, format: { with: URI::MailTo::EMAIL_REGEXP }, uniqueness: { case_sensitive: false, conditions: -> { kept } }

  # Ransack: Explicitly whitelist searchable attributes
  def self.ransackable_attributes(auth_object = nil)
    [ "name", "email", "created_at", "updated_at", "last_updated_at", "name_or_email", "discarded_at" ]
  end

  # Custom Ransack searcher for name OR email
  ransacker :name_or_email do
    Arel.sql("CONCAT(name, ' ', email)")
  end

  def can_be_deleted?
    donations.empty? && sponsorships.empty?
  end

  private

  def check_active_sponsorships
    if sponsorships.active.exists?
      errors.add(:base, "Cannot archive donor with active sponsorships")
      throw :abort
    end
  end

  def set_defaults
    self.name = "Anonymous" if name.blank?

    if email.blank?
      # Generate email from name (after name has been set)
      clean_name = name.gsub(/\s+/, "")
      self.email = "#{clean_name}@mailinator.com"
    end
  end
end
