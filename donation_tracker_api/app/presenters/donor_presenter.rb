class DonorPresenter < BasePresenter
  PLACEHOLDER_DOMAINS = [ "@mailinator.com" ].freeze

  def as_json(options = {})
    {
      id: object.id,
      name: object.name,
      email: object.email,
      displayable_email: displayable_email,
      discarded_at: object.discarded_at,
      can_be_deleted: object.can_be_deleted?,
      created_at: object.created_at,
      updated_at: object.updated_at
    }
  end

  private

  def displayable_email
    placeholder_email? ? nil : object.email
  end

  def placeholder_email?
    PLACEHOLDER_DOMAINS.any? { |domain| object.email.downcase.end_with?(domain) }
  end
end
