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

    it "filters donors by name using Ransack" do
      _donor1 = Donor.create!(name: "Alice Smith", email: "alice@example.com", last_updated_at: Time.current)
      _donor2 = Donor.create!(name: "Bob Jones", email: "bob@example.com", last_updated_at: Time.current)
      _donor3 = Donor.create!(name: "Alice Brown", email: "alice.brown@example.com", last_updated_at: Time.current)

      get "/api/donors", params: { q: { name_cont: "Alice" } }, headers: { "Host" => "api" }

      expect(response).to have_http_status(:ok)
      json_response = JSON.parse(response.body)
      expect(json_response.length).to eq(2)
      expect(json_response.map { |d| d["name"] }).to contain_exactly("Alice Smith", "Alice Brown")
    end

    it "filters donors by email using Ransack" do
      _donor1 = Donor.create!(name: "Test One", email: "test1@example.com", last_updated_at: Time.current)
      _donor2 = Donor.create!(name: "Test Two", email: "test2@different.com", last_updated_at: Time.current)

      get "/api/donors", params: { q: { email_cont: "example.com" } }, headers: { "Host" => "api" }

      expect(response).to have_http_status(:ok)
      json_response = JSON.parse(response.body)
      expect(json_response.length).to eq(1)
      expect(json_response[0]["email"]).to eq("test1@example.com")
    end

    it "paginates donors using Kaminari" do
      15.times do |i|
        Donor.create!(name: "Donor #{i}", email: "donor#{i}@example.com", last_updated_at: Time.current)
      end

      get "/api/donors", params: { page: 1, per_page: 10 }, headers: { "Host" => "api" }

      expect(response).to have_http_status(:ok)
      json_response = JSON.parse(response.body)
      expect(json_response.length).to eq(10)
    end
  end

  describe "PATCH /api/donors/:id" do
    it "updates donor with valid attributes" do
      donor = Donor.create!(name: "Original Name", email: "original@example.com", last_updated_at: 1.day.ago)

      patch "/api/donors/#{donor.id}", params: { donor: { name: "Updated Name" } }, headers: { "Host" => "api" }

      expect(response).to have_http_status(:ok)
      json_response = JSON.parse(response.body)
      expect(json_response["name"]).to eq("Updated Name")
      expect(json_response["email"]).to eq("original@example.com")
    end

    it "updates last_updated_at timestamp" do
      donor = Donor.create!(name: "Test", email: "test@example.com", last_updated_at: 2.days.ago)
      old_timestamp = donor.last_updated_at

      patch "/api/donors/#{donor.id}", params: { donor: { name: "New Name" } }, headers: { "Host" => "api" }

      expect(response).to have_http_status(:ok)
      donor.reload
      expect(donor.last_updated_at).to be > old_timestamp
    end
  end

  describe "DELETE /api/donors/:id" do
    it "deletes donor" do
      donor = Donor.create!(name: "To Delete", email: "delete@example.com", last_updated_at: Time.current)

      expect {
        delete "/api/donors/#{donor.id}", headers: { "Host" => "api" }
      }.to change(Donor, :count).by(-1)

      expect(response).to have_http_status(:no_content)
    end
  end

  describe "DELETE /api/donors/all" do
    it "deletes all donors (test cleanup)" do
      Donor.create!(name: "Donor 1", email: "donor1@example.com", last_updated_at: Time.current)
      Donor.create!(name: "Donor 2", email: "donor2@example.com", last_updated_at: Time.current)
      Donor.create!(name: "Donor 3", email: "donor3@example.com", last_updated_at: Time.current)

      expect {
        delete "/api/donors/all", headers: { "Host" => "api" }
      }.to change(Donor, :count).by(-3)

      expect(response).to have_http_status(:ok)
      json_response = JSON.parse(response.body)
      expect(json_response["deleted_count"]).to eq(3)
    end
  end
end
