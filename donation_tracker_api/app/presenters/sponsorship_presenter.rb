# frozen_string_literal: true

# Formats Sponsorship objects for JSON API responses.
#
# Adds computed fields:
# - donor_name: Associated donor's name
# - child_name: Associated child's name
# - project_title: Associated project's title
# - active: Boolean indicating if sponsorship has no end_date
# - start_date: Calculated start date from first donation or explicit start_date
#
# Converts monthly_amount to string for precision.
#
# @example Format a sponsorship
#   presenter = SponsorshipPresenter.new(sponsorship)
#   presenter.as_json
#   # => { id: 1, donor_name: "John Doe", child_name: "Maria", monthly_amount: "5000", active: true, ... }
#
# @see BasePresenter for inheritance pattern
# @see Sponsorship model
class SponsorshipPresenter < BasePresenter
  def as_json(options = {})
    {
      id: object.id,
      donor_id: object.donor_id,
      donor_name: object.donor&.name,
      child_id: object.child_id,
      child_name: object.child&.name,
      monthly_amount: object.monthly_amount.to_s,
      active: object.active?,
      end_date: object.end_date,
      created_at: object.created_at,
      project_id: object.project_id,
      start_date: object.calculated_start_date,
      last_donation_date: object.last_donation_date,
      project_title: object.project&.title
    }
  end
end
