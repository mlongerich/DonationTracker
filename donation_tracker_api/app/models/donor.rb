class Donor < ApplicationRecord
  has_paper_trail

  before_validation :set_defaults

  validates :name, presence: true
  validates :email, presence: true, format: { with: URI::MailTo::EMAIL_REGEXP }, uniqueness: { case_sensitive: false }

  # Ransack: Explicitly whitelist searchable attributes
  def self.ransackable_attributes(auth_object = nil)
    [ "name", "email", "created_at", "updated_at", "last_updated_at", "name_or_email" ]
  end

  # Custom Ransack searcher for name OR email
  ransacker :name_or_email do
    Arel.sql("CONCAT(name, ' ', email)")
  end

  private

  def set_defaults
    self.name = "Anonymous" if name.blank?

    if email.blank?
      # Generate email from name (after name has been set)
      clean_name = name.gsub(/\s+/, "")
      self.email = "#{clean_name}@mailinator.com"
    end
  end
end
