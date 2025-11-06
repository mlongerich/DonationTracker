# frozen_string_literal: true

# Formats Child objects for JSON API responses.
#
# Adds computed fields:
# - can_be_deleted: Boolean indicating if child has no sponsorships
# - sponsorships: Optional array of sponsorship details (when include_sponsorships: true)
#
# Includes discarded_at for soft-delete state tracking.
#
# @example Format a child
#   presenter = ChildPresenter.new(child)
#   presenter.as_json
#   # => { id: 1, name: "Maria Rodriguez", can_be_deleted: true, discarded_at: nil, ... }
#
# @example Format a child with sponsorships
#   presenter = ChildPresenter.new(child)
#   presenter.as_json(include_sponsorships: true)
#   # => { id: 1, name: "Maria", sponsorships: [{ donor_name: "John", ... }], ... }
#
# @see BasePresenter for inheritance pattern
# @see Child model
class ChildPresenter < BasePresenter
  def as_json(options = {})
    result = {
      id: object.id,
      name: object.name,
      created_at: object.created_at,
      updated_at: object.updated_at,
      can_be_deleted: object.can_be_deleted?,
      discarded_at: object.discarded_at
    }

    # Add sponsorships if requested and association is loaded
    if options[:include_sponsorships] && object.association(:sponsorships).loaded?
      result[:sponsorships] = object.sponsorships.map do |sponsorship|
        {
          id: sponsorship.id,
          donor_id: sponsorship.donor_id,
          donor_name: sponsorship.donor&.name,
          child_id: sponsorship.child_id,
          monthly_amount: sponsorship.monthly_amount.to_s,
          active: sponsorship.active?,
          end_date: sponsorship.end_date
        }
      end
    end

    result
  end
end
