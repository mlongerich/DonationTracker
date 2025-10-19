require 'rails_helper'

RSpec.describe "Api::Projects", type: :request do
  describe "GET /api/projects" do
    it "returns all projects" do
      create(:project, title: "Project 1")
      create(:project, title: "Project 2")

      get "/api/projects"

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["projects"].length).to eq(2)
      expect(response.parsed_body["projects"].first).to have_key("title")
    end
  end

  describe "GET /api/projects/:id" do
    it "returns a single project" do
      project = create(:project, title: "Test Project")

      get "/api/projects/#{project.id}"

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["project"]["title"]).to eq("Test Project")
    end
  end

  describe "POST /api/projects" do
    it "creates a new project" do
      expect {
        post "/api/projects", params: { project: { title: "New Project", project_type: "campaign" } }
      }.to change(Project, :count).by(1)

      expect(response).to have_http_status(:created)
    end
  end

  describe "PUT /api/projects/:id" do
    it "updates a non-system project" do
      project = create(:project, title: "Old Title")

      put "/api/projects/#{project.id}", params: { project: { title: "New Title" } }

      expect(response).to have_http_status(:ok)
      expect(project.reload.title).to eq("New Title")
    end

    it "prevents updating system projects" do
      system_project = create(:project, title: "General Donation", system: true)

      put "/api/projects/#{system_project.id}", params: { project: { title: "Hacked" } }

      expect(response).to have_http_status(:forbidden)
      expect(system_project.reload.title).to eq("General Donation")
    end
  end

  describe "DELETE /api/projects/:id" do
    it "deletes a non-system project" do
      project = create(:project)

      expect {
        delete "/api/projects/#{project.id}"
      }.to change(Project, :count).by(-1)

      expect(response).to have_http_status(:no_content)
    end

    it "prevents deleting system projects" do
      system_project = create(:project, system: true)

      expect {
        delete "/api/projects/#{system_project.id}"
      }.not_to change(Project, :count)

      expect(response).to have_http_status(:forbidden)
    end
  end
end
