require 'rails_helper'

RSpec.describe "/api/donors", type: :request do
  before do
    Donor.delete_all
  end

  describe "POST /api/donors" do
    it "creates donor via DonorService" do
      donor_params = { name: "John Doe", email: "john@example.com" }

      post "/api/donors", params: { donor: donor_params }, headers: { "Host" => "api" }

      expect(response).to have_http_status(:created)
      expect(Donor.last.name).to eq("John Doe")
    end

    it "returns 200 OK when updating existing donor with newer data" do
      Donor.create!(name: "Old Name", email: "existing@test.com", last_updated_at: 1.day.ago)

      donor_params = { name: "Updated Name", email: "existing@test.com" }
      post "/api/donors", params: { donor: donor_params }, headers: { "Host" => "api" }

      expect(response).to have_http_status(:ok)
      json_response = JSON.parse(response.body)
      expect(json_response["name"]).to eq("Updated Name")
    end
  end

  describe "GET /api/donors/:id" do
    it "returns donor by id" do
      donor = Donor.create!(name: "Alice Brown", email: "alice@example.com", last_updated_at: Time.current)

      get "/api/donors/#{donor.id}", headers: { "Host" => "api" }

      expect(response).to have_http_status(:ok)
      json_response = JSON.parse(response.body)
      expect(json_response["name"]).to eq("Alice Brown")
    end
  end

  describe "GET /api/donors" do
    it "returns all donors ordered by most recent first" do
      _donor1 = Donor.create!(name: "Old Donor", email: "old@example.com", last_updated_at: Time.current, created_at: 2.days.ago)
      _donor2 = Donor.create!(name: "New Donor", email: "new@example.com", last_updated_at: Time.current, created_at: 1.hour.ago)

      get "/api/donors", headers: { "Host" => "api" }

      expect(response).to have_http_status(:ok)
      json_response = JSON.parse(response.body)
      expect(json_response.length).to eq(2)
      expect(json_response[0]["email"]).to eq("new@example.com")
      expect(json_response[1]["email"]).to eq("old@example.com")
    end
  end
end
