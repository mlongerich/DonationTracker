class Donor < ApplicationRecord
  has_paper_trail

  before_validation :set_defaults

  validates :name, presence: true
  validates :email, presence: true, format: { with: URI::MailTo::EMAIL_REGEXP }, uniqueness: { case_sensitive: false }

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
