# frozen_string_literal: true

# API namespace for all REST API controllers.
module Api
  # Provides unified search across projects and children.
  #
  # This controller provides:
  # - project_or_child endpoint for combined project and child search
  # - Case-insensitive partial matching (ILIKE)
  # - Excludes sponsorship-type projects from results
  # - Limits results to 5 per entity type for performance
  #
  # Used primarily for autocomplete/typeahead functionality in the frontend.
  # All responses use ProjectPresenter and ChildPresenter for formatting.
  #
  # @example Search for projects and children
  #   GET /api/search/project_or_child?q=maria
  #   # Returns: { projects: [...], children: [...] }
  #
  # @see ProjectPresenter for project format
  # @see ChildPresenter for child format
  class SearchController < ApplicationController
    def project_or_child
      query = params[:q].to_s.strip

      if query.blank?
        render json: { projects: [], children: [] }
        return
      end

      # Search projects by title (exclude sponsorship projects)
      projects = Project.kept
                        .where("title ILIKE ?", "%#{query}%")
                        .where.not(project_type: :sponsorship)
                        .order(:title)
                        .limit(5)

      # Search children by name
      children = Child.kept.where("name ILIKE ?", "%#{query}%").order(:name).limit(5)

      render json: {
        projects: CollectionPresenter.new(projects, ProjectPresenter).as_json,
        children: CollectionPresenter.new(children, ChildPresenter).as_json
      }
    end
  end
end
