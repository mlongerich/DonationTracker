# frozen_string_literal: true

# Formats Project objects for JSON API responses.
#
# Adds computed fields:
# - donations_count: Count of associated donations
# - sponsorships_count: Count of associated sponsorships
# - can_be_deleted: Boolean indicating if project is non-system and has no donations/sponsorships
#
# Includes discarded_at for soft-delete state tracking and system flag for protection.
#
# @example Format a project
#   presenter = ProjectPresenter.new(project)
#   presenter.as_json
#   # => { id: 1, title: "Summer Campaign", project_type: "campaign", donations_count: 42, ... }
#
# @see BasePresenter for inheritance pattern
# @see Project model
class ProjectPresenter < BasePresenter
  def as_json(options = {})
    {
      id: object.id,
      title: object.title,
      description: object.description,
      project_type: object.project_type,
      system: object.system,
      donations_count: object.donations.count,
      sponsorships_count: object.sponsorships.count,
      can_be_deleted: object.can_be_deleted?,
      discarded_at: object.discarded_at
    }
  end
end
