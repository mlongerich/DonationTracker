require 'rails_helper'

RSpec.describe "Api::Search", type: :request do
  describe "GET /api/search/project_or_child" do
    it "excludes sponsorship projects from results" do
      general_project = create(:project, title: "Building Fund", project_type: :general)
      sponsorship_project = create(:project, title: "Sponsor Jane", project_type: :sponsorship)

      get "/api/search/project_or_child", params: { q: "Sponsor" }

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      project_ids = json["projects"].map { |p| p["id"] }

      expect(project_ids).not_to include(sponsorship_project.id)
    end

    it "includes general projects in results" do
      general_project = create(:project, title: "Building Fund", project_type: :general)

      get "/api/search/project_or_child", params: { q: "Building" }

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      project_ids = json["projects"].map { |p| p["id"] }

      expect(project_ids).to include(general_project.id)
    end
  end
end
