require 'rails_helper'

RSpec.describe "/api/children", type: :request do
  describe "GET /api/children" do
    it "returns a successful response" do
      get "/api/children"
      expect(response).to have_http_status(:success)
    end

    it "returns children with pagination metadata" do
      create_list(:child, 3)

      get "/api/children"

      json = JSON.parse(response.body)
      expect(json["children"]).to be_an(Array)
      expect(json["children"].length).to eq(3)
      expect(json["meta"]).to include("total_count", "total_pages", "current_page", "per_page")
    end

    it "paginates results with default page size of 25" do
      create_list(:child, 30)

      get "/api/children", params: { page: 1 }

      json = JSON.parse(response.body)
      expect(json["children"].length).to eq(25)
      expect(json["meta"]["current_page"]).to eq(1)
      expect(json["meta"]["total_count"]).to eq(30)
      expect(json["meta"]["total_pages"]).to eq(2)
      expect(json["meta"]["per_page"]).to eq(25)
    end

    it "filters children by name using Ransack" do
      create(:child, name: "Maria")
      create(:child, name: "Carlos")
      create(:child, name: "Mariana")

      get "/api/children", params: { q: { name_cont: "Mari" } }

      expect(response).to have_http_status(:success)
      json = JSON.parse(response.body)
      expect(json["children"].length).to eq(2)
      expect(json["children"].map { |c| c["name"] }).to contain_exactly("Maria", "Mariana")
    end
  end

  describe "POST /api/children" do
    it "creates a new child with valid attributes" do
      child_params = { child: { name: "Maria" } }

      post "/api/children", params: child_params

      expect(response).to have_http_status(:created)
      json = JSON.parse(response.body)
      expect(json["child"]["name"]).to eq("Maria")
    end

    it "returns errors for invalid attributes" do
      child_params = { child: { name: "" } }

      post "/api/children", params: child_params

      expect(response).to have_http_status(:unprocessable_entity)
      json = JSON.parse(response.body)
      expect(json["errors"]).to be_present
    end
  end

  describe "GET /api/children/:id" do
    it "returns a specific child" do
      child = create(:child, name: "Maria")

      get "/api/children/#{child.id}"

      expect(response).to have_http_status(:success)
      json = JSON.parse(response.body)
      expect(json["name"]).to eq("Maria")
    end
  end

  describe "PUT /api/children/:id" do
    it "updates a child with valid attributes" do
      child = create(:child, name: "Maria")
      update_params = { child: { name: "Maria Updated" } }

      put "/api/children/#{child.id}", params: update_params

      expect(response).to have_http_status(:success)
      json = JSON.parse(response.body)
      expect(json["child"]["name"]).to eq("Maria Updated")
    end
  end

  describe "DELETE /api/children/:id" do
    it "deletes a child" do
      child = create(:child)

      delete "/api/children/#{child.id}"

      expect(response).to have_http_status(:no_content)
      expect(Child.exists?(child.id)).to be false
    end
  end
end
