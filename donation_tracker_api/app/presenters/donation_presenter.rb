# frozen_string_literal: true

# Formats Donation objects for JSON API responses.
#
# Adds computed fields:
# - donor_name: Associated donor's name
# - project_title: Associated project's title or "General Donation" if no project
#
# @example Format a donation
#   presenter = DonationPresenter.new(donation)
#   presenter.as_json
#   # => { id: 1, amount: 10000, donor_name: "John Doe", project_title: "Summer Campaign", ... }
#
# @see BasePresenter for inheritance pattern
# @see Donation model
class DonationPresenter < BasePresenter
  def as_json(options = {})
    {
      id: object.id,
      amount: object.amount,
      date: object.date,
      donor_id: object.donor_id,
      donor_name: object.donor.name,
      project_id: object.project_id,
      project_title: object.project&.title || "General Donation",
      payment_method: object.payment_method,
      status: object.status,
      description: object.description,
      created_at: object.created_at,
      updated_at: object.updated_at
    }
  end
end
