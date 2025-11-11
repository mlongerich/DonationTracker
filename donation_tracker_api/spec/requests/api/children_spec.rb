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

    it "includes can_be_deleted field in response" do
      child_with_sponsorship = create(:child)
      child_without_sponsorship = create(:child)
      donor = create(:donor)
      create(:sponsorship, child: child_with_sponsorship, donor: donor)

      get "/api/children"

      json = JSON.parse(response.body)
      child1 = json["children"].find { |c| c["id"] == child_with_sponsorship.id }
      child2 = json["children"].find { |c| c["id"] == child_without_sponsorship.id }

      expect(child1["can_be_deleted"]).to be false
      expect(child2["can_be_deleted"]).to be true
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

    it "excludes archived children by default" do
      create(:child, name: "Active")
      archived_child = create(:child, name: "Archived")
      archived_child.discard

      get "/api/children"

      json = JSON.parse(response.body)
      names = json["children"].map { |c| c["name"] }
      expect(names).to include("Active")
      expect(names).not_to include("Archived")
    end

    context "with include_sponsorships param" do
      it "returns children without sponsorships by default" do
        child = create(:child, name: "Maria")
        donor = create(:donor)
        create(:sponsorship, child: child, donor: donor, monthly_amount: 50)

        get "/api/children"

        json = JSON.parse(response.body)
        expect(json["children"].first.keys).not_to include("sponsorships")
      end

      it "returns children with sponsorships when param is true" do
        child = create(:child, name: "Maria")
        donor = create(:donor, name: "John Doe")
        sponsorship = create(:sponsorship, child: child, donor: donor, monthly_amount: 50)

        get "/api/children", params: { include_sponsorships: "true" }

        expect(response).to have_http_status(:success)
        json = JSON.parse(response.body)
        expect(json["children"].first["sponsorships"]).to be_an(Array)
        expect(json["children"].first["sponsorships"].length).to eq(1)

        sponsorship_data = json["children"].first["sponsorships"].first
        expect(sponsorship_data["id"]).to eq(sponsorship.id)
        expect(sponsorship_data["donor_name"]).to eq("John Doe")
        expect(sponsorship_data["monthly_amount"]).to eq("50.0")
        expect(sponsorship_data["active"]).to be true
      end

      it "does not perform N+1 queries when including sponsorships" do
        child1 = create(:child, name: "Maria")
        child2 = create(:child, name: "Juan")
        donor1 = create(:donor, name: "John Doe")
        donor2 = create(:donor, name: "Jane Smith")
        create(:sponsorship, child: child1, donor: donor1, monthly_amount: 50)
        create(:sponsorship, child: child2, donor: donor2, monthly_amount: 75)

        # Count queries during request
        query_count = 0
        query_counter = ->(name, started, finished, unique_id, payload) {
          query_count += 1 unless payload[:name] == "SCHEMA" || payload[:sql].include?("SAVEPOINT")
        }

        ActiveSupport::Notifications.subscribed(query_counter, "sql.active_record") do
          get "/api/children", params: { include_sponsorships: "true" }
        end

        # Expect: 1 query for children + 1 for sponsorships + 1 for donors (eager loaded)
        # Allow some flexibility for transaction/count queries
        expect(query_count).to be <= 5
      end
    end
  end

  describe "POST /api/children" do
    it "creates a new child with valid attributes and returns wrapped presenter" do
      child_params = { child: { name: "Maria" } }

      post "/api/children", params: child_params

      expect(response).to have_http_status(:created)
      json = JSON.parse(response.body)
      expect(json).to have_key("child")
      expect(json["child"]["name"]).to eq("Maria")
      expect(json["child"]).to have_key("can_be_deleted")
    end

    it "creates a child with gender attribute" do
      child_params = { child: { name: "Maria", gender: "girl" } }

      post "/api/children", params: child_params

      expect(response).to have_http_status(:created)
      json = JSON.parse(response.body)
      expect(json["child"]["name"]).to eq("Maria")
      expect(json["child"]["gender"]).to eq("girl")
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
    it "returns a specific child wrapped with presenter" do
      child = create(:child, name: "Maria")

      get "/api/children/#{child.id}"

      expect(response).to have_http_status(:success)
      json = JSON.parse(response.body)
      expect(json).to have_key("child")
      expect(json["child"]["name"]).to eq("Maria")
      expect(json["child"]).to have_key("can_be_deleted")
    end
  end

  describe "PUT /api/children/:id" do
    it "updates a child with valid attributes and returns wrapped presenter" do
      child = create(:child, name: "Maria")
      update_params = { child: { name: "Maria Updated" } }

      put "/api/children/#{child.id}", params: update_params

      expect(response).to have_http_status(:success)
      json = JSON.parse(response.body)
      expect(json).to have_key("child")
      expect(json["child"]["name"]).to eq("Maria Updated")
      expect(json["child"]).to have_key("can_be_deleted")
    end

    it "updates a child's gender attribute" do
      child = create(:child, name: "Maria", gender: "boy")
      update_params = { child: { gender: "girl" } }

      put "/api/children/#{child.id}", params: update_params

      expect(response).to have_http_status(:success)
      json = JSON.parse(response.body)
      expect(json["child"]["gender"]).to eq("girl")
    end
  end

  describe "DELETE /api/children/:id" do
    it "hard deletes a child when can_be_deleted is true" do
      child = create(:child)

      delete "/api/children/#{child.id}"

      expect(response).to have_http_status(:no_content)
      expect(Child.exists?(child.id)).to be false
    end
  end

  describe "POST /api/children/:id/archive" do
    it "soft deletes a child (sets discarded_at)" do
      child = create(:child)

      post "/api/children/#{child.id}/archive"

      expect(response).to have_http_status(:no_content)
      child.reload
      expect(child.discarded_at).not_to be_nil
    end
  end

  describe "POST /api/children/:id/restore" do
    it "restores a discarded child" do
      child = create(:child)
      child.discard

      post "/api/children/#{child.id}/restore"

      expect(response).to have_http_status(:success)
      child.reload
      expect(child.discarded_at).to be_nil
    end
  end
end
