# frozen_string_literal: true

module Api
  class SearchController < ApplicationController
    def project_or_child
      query = params[:q].to_s.strip

      if query.blank?
        render json: { projects: [], children: [] }
        return
      end

      # Search projects by title
      projects = Project.kept.where("title ILIKE ?", "%#{query}%").order(:title).limit(5)

      # Search children by name
      children = Child.kept.where("name ILIKE ?", "%#{query}%").order(:name).limit(5)

      render json: {
        projects: CollectionPresenter.new(projects, ProjectPresenter).as_json,
        children: CollectionPresenter.new(children, ChildPresenter).as_json
      }
    end
  end
end
