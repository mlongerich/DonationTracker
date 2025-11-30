# frozen_string_literal: true

# Formats Donor objects for JSON API responses.
#
# Adds computed fields:
# - displayable_email: Hides placeholder emails (mailinator.com), returns nil for UI display
# - can_be_deleted: Boolean indicating if donor has no donations/sponsorships
#
# Includes discarded_at for soft-delete state tracking.
#
# @example Format a donor
#   presenter = DonorPresenter.new(donor)
#   presenter.as_json
#   # => { id: 1, name: "John Doe", email: "john@example.com", displayable_email: "john@example.com", ... }
#
# @see BasePresenter for inheritance pattern
# @see Donor model
class DonorPresenter < BasePresenter
  PLACEHOLDER_DOMAINS = [ "@mailinator.com" ].freeze

  def as_json(options = {})
    {
      id: object.id,
      name: object.name,
      email: object.email,
      displayable_email: displayable_email,
      phone: object.phone,
      address_line1: object.address_line1,
      address_line2: object.address_line2,
      city: object.city,
      state: object.state,
      zip_code: object.zip_code,
      country: object.country,
      full_address: object.full_address,
      discarded_at: object.discarded_at,
      can_be_deleted: object.can_be_deleted?,
      last_donation_date: object.last_donation_date,
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
