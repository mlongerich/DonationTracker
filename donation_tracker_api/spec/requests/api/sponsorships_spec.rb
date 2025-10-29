require 'rails_helper'

RSpec.describe "/api/sponsorships", type: :request do
  describe "POST /api/sponsorships" do
    it "creates a sponsorship and auto-creates a project" do
      donor = create(:donor)
      child = create(:child, name: "Maria")
      sponsorship_params = {
        sponsorship: {
          donor_id: donor.id,
          child_id: child.id,
          monthly_amount: 50
        }
      }

      post "/api/sponsorships", params: sponsorship_params

      expect(response).to have_http_status(:created)
      json = JSON.parse(response.body)
      expect(json["sponsorship"]["monthly_amount"]).to eq("50.0")
      expect(json["sponsorship"]["project_id"]).to be_present
    end

    it "returns errors for invalid attributes" do
      sponsorship_params = {
        sponsorship: {
          donor_id: nil,
          child_id: nil,
          monthly_amount: -10
        }
      }

      post "/api/sponsorships", params: sponsorship_params

      expect(response).to have_http_status(:unprocessable_entity)
      json = JSON.parse(response.body)
      expect(json["errors"]).to be_present
    end

    it "creates sponsorship with start_date when provided" do
      donor = create(:donor)
      child = create(:child)
      start_date = Date.new(2025, 1, 15)
      sponsorship_params = {
        sponsorship: {
          donor_id: donor.id,
          child_id: child.id,
          monthly_amount: 50,
          start_date: start_date
        }
      }

      post "/api/sponsorships", params: sponsorship_params

      expect(response).to have_http_status(:created)
      json = JSON.parse(response.body)
      expect(json["sponsorship"]["start_date"]).to eq(start_date.to_s)
    end
  end

  describe "DELETE /api/sponsorships/:id" do
    it "deactivates a sponsorship by setting end_date" do
      donor = create(:donor)
      child = create(:child)
      sponsorship = create(:sponsorship, donor: donor, child: child)

      delete "/api/sponsorships/#{sponsorship.id}"

      expect(response).to have_http_status(:success)
      sponsorship.reload
      expect(sponsorship.end_date).to be_present
      expect(sponsorship.active?).to be false
    end
  end

  describe "GET /api/children/:child_id/sponsorships" do
    it "returns all sponsorships for a child with donor names" do
      child = create(:child, name: "Maria")
      donor1 = create(:donor, name: "John Doe")
      donor2 = create(:donor, name: "Jane Smith")
      active_sponsorship = create(:sponsorship, donor: donor1, child: child, monthly_amount: 50)
      inactive_sponsorship = create(:sponsorship, donor: donor2, child: child, monthly_amount: 30, end_date: Date.current)

      get "/api/children/#{child.id}/sponsorships"

      expect(response).to have_http_status(:success)
      json = JSON.parse(response.body)
      expect(json["sponsorships"].length).to eq(2)

      first = json["sponsorships"].find { |s| s["id"] == active_sponsorship.id }
      expect(first["donor_name"]).to eq("John Doe")
      expect(first["monthly_amount"]).to eq("50.0")
      expect(first["active"]).to be true

      second = json["sponsorships"].find { |s| s["id"] == inactive_sponsorship.id }
      expect(second["donor_name"]).to eq("Jane Smith")
      expect(second["active"]).to be false
    end
  end

  describe "GET /api/sponsorships" do
    it "returns all sponsorships with pagination" do
      child = create(:child, name: "Maria")
      donor = create(:donor, name: "John Doe")
      create(:sponsorship, donor: donor, child: child)

      get "/api/sponsorships"

      expect(response).to have_http_status(:success)
      json = JSON.parse(response.body)
      expect(json["sponsorships"]).to be_an(Array)
      expect(json["meta"]).to be_present
      expect(json["meta"]["current_page"]).to eq(1)
    end

    it "includes child_name in response" do
      child = create(:child, name: "Maria")
      donor = create(:donor, name: "John Doe")
      create(:sponsorship, donor: donor, child: child)

      get "/api/sponsorships"

      expect(response).to have_http_status(:success)
      json = JSON.parse(response.body)
      expect(json["sponsorships"][0]["child_name"]).to eq("Maria")
      expect(json["sponsorships"][0]["donor_name"]).to eq("John Doe")
    end

    it "filters sponsorships by donor name using OR query" do
      donor_john = create(:donor, name: "John Doe")
      donor_jane = create(:donor, name: "Jane Smith")
      child_maria = create(:child, name: "Maria")
      child_carlos = create(:child, name: "Carlos")

      sponsorship1 = create(:sponsorship, donor: donor_john, child: child_maria)
      sponsorship2 = create(:sponsorship, donor: donor_jane, child: child_carlos)

      get "/api/sponsorships", params: {
        q: { donor_name_or_child_name_cont: "John" }
      }

      expect(response).to have_http_status(:success)
      json = JSON.parse(response.body)
      ids = json["sponsorships"].map { |s| s["id"] }
      expect(ids).to include(sponsorship1.id)
      expect(ids).not_to include(sponsorship2.id)
    end

    it "filters sponsorships by child name using OR query" do
      donor_john = create(:donor, name: "John Doe")
      donor_jane = create(:donor, name: "Jane Smith")
      child_maria = create(:child, name: "Maria")
      child_carlos = create(:child, name: "Carlos")

      sponsorship1 = create(:sponsorship, donor: donor_john, child: child_maria)
      sponsorship2 = create(:sponsorship, donor: donor_jane, child: child_carlos)

      get "/api/sponsorships", params: {
        q: { donor_name_or_child_name_cont: "Maria" }
      }

      expect(response).to have_http_status(:success)
      json = JSON.parse(response.body)
      ids = json["sponsorships"].map { |s| s["id"] }
      expect(ids).to include(sponsorship1.id)
      expect(ids).not_to include(sponsorship2.id)
    end
  end

  describe "POST /api/sponsorships - duplicate validation" do
    it "returns descriptive error message for duplicate active sponsorship" do
      donor = create(:donor, name: "Michael")
      child = create(:child, name: "Maria")

      # Create first sponsorship
      create(:sponsorship, donor: donor, child: child, monthly_amount: 50, end_date: nil)

      # Attempt duplicate
      duplicate_params = {
        sponsorship: {
          donor_id: donor.id,
          child_id: child.id,
          monthly_amount: 50
        }
      }

      post "/api/sponsorships", params: duplicate_params

      expect(response).to have_http_status(:unprocessable_entity)
      json = JSON.parse(response.body)
      expect(json["errors"]).to be_an(Array)
      expect(json["errors"][0]).to eq("Maria is already actively sponsored by Michael")
    end
  end
end
