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
      create(:donor, name: "Old Name", email: "existing@test.com", last_updated_at: 1.day.ago)

      donor_params = { name: "Updated Name", email: "existing@test.com" }
      post "/api/donors", params: { donor: donor_params }, headers: { "Host" => "api" }

      expect(response).to have_http_status(:ok)
      json_response = JSON.parse(response.body)
      expect(json_response["name"]).to eq("Updated Name")
    end
  end

  describe "GET /api/donors/:id" do
    it "returns donor by id" do
      donor = create(:donor, name: "Alice Brown")

      get "/api/donors/#{donor.id}", headers: { "Host" => "api" }

      expect(response).to have_http_status(:ok)
      json_response = JSON.parse(response.body)
      expect(json_response["name"]).to eq("Alice Brown")
    end
  end

  describe "GET /api/donors" do
    it "returns all donors ordered alphabetically by name" do
      _donor1 = create(:donor, name: "Charlie Brown")
      _donor2 = create(:donor, name: "Alice Smith")
      _donor3 = create(:donor, name: "Bob Jones")

      get "/api/donors", headers: { "Host" => "api" }

      expect(response).to have_http_status(:ok)
      json_response = JSON.parse(response.body)
      expect(json_response["donors"].length).to eq(3)
      expect(json_response["donors"][0]["name"]).to eq("Alice Smith")
      expect(json_response["donors"][1]["name"]).to eq("Bob Jones")
      expect(json_response["donors"][2]["name"]).to eq("Charlie Brown")
    end

    it "excludes discarded donors by default" do
      active_donor = create(:donor)
      archived_donor = create(:donor)
      archived_donor.discard

      get "/api/donors", headers: { "Host" => "api" }

      expect(response).to have_http_status(:ok)
      json_response = JSON.parse(response.body)
      expect(json_response["donors"].length).to eq(1)
      expect(json_response["donors"][0]["id"]).to eq(active_donor.id)
    end

    it "includes discarded donors when include_discarded param is true" do
      _active_donor = create(:donor)
      archived_donor = create(:donor)
      archived_donor.discard

      get "/api/donors", params: { include_discarded: "true" }, headers: { "Host" => "api" }

      expect(response).to have_http_status(:ok)
      json_response = JSON.parse(response.body)
      expect(json_response["donors"].length).to eq(2)
    end

    it "excludes merged donors from archived list" do
      donor1 = create(:donor, name: 'Alice Smith', email: 'alice@example.com')
      donor2 = create(:donor, name: 'Alice S.', email: 'alice.smith@example.com')

      DonorMergeService.new(
        donor_ids: [ donor1.id, donor2.id ],
        field_selections: { name: donor1.id, email: donor2.id }
      ).merge

      get "/api/donors", params: { include_discarded: "true" }, headers: { "Host" => "api" }

      expect(response).to have_http_status(:ok)
      donor_ids = JSON.parse(response.body)['donors'].map { |d| d['id'] }

      expect(donor_ids).not_to include(donor1.id)
      expect(donor_ids).not_to include(donor2.id)
    end

    it "filters donors by name using Ransack" do
      _donor1 = create(:donor, name: "Alice Smith")
      _donor2 = create(:donor, name: "Bob Jones")
      _donor3 = create(:donor, name: "Alice Brown")

      get "/api/donors", params: { q: { name_cont: "Alice" } }, headers: { "Host" => "api" }

      expect(response).to have_http_status(:ok)
      json_response = JSON.parse(response.body)
      expect(json_response["donors"].length).to eq(2)
      expect(json_response["donors"].map { |d| d["name"] }).to contain_exactly("Alice Smith", "Alice Brown")
    end

    it "filters donors by email using Ransack" do
      _donor1 = create(:donor, email: "test1@example.com")
      _donor2 = create(:donor, email: "test2@different.com")

      get "/api/donors", params: { q: { email_cont: "example.com" } }, headers: { "Host" => "api" }

      expect(response).to have_http_status(:ok)
      json_response = JSON.parse(response.body)
      expect(json_response["donors"].length).to eq(1)
      expect(json_response["donors"][0]["email"]).to eq("test1@example.com")
    end

    it "filters donors by name OR email using Ransack" do
      _donor1 = create(:donor, name: "Michael Longerich", email: "mlongerich@gmail.com")
      _donor2 = create(:donor, name: "John Smith", email: "michael@mailinator.com")
      _donor3 = create(:donor, name: "Bob Example", email: "example@yahoo.com")

      get "/api/donors", params: { q: { name_or_email_cont: "n" } }, headers: { "Host" => "api" }

      expect(response).to have_http_status(:ok)
      json_response = JSON.parse(response.body)
      expect(json_response["donors"].length).to eq(2)
      names_and_emails = json_response["donors"].map { |d| [ d["name"], d["email"] ] }
      expect(names_and_emails).to contain_exactly(
        [ "Michael Longerich", "mlongerich@gmail.com" ],
        [ "John Smith", "michael@mailinator.com" ]
      )
    end

    it "paginates donors using Kaminari" do
      create_list(:donor, 15)

      get "/api/donors", params: { page: 1, per_page: 10 }, headers: { "Host" => "api" }

      expect(response).to have_http_status(:ok)
      json_response = JSON.parse(response.body)
      expect(json_response["donors"].length).to eq(10)
    end

    it "returns pagination metadata with donors" do
      create_list(:donor, 15)

      get "/api/donors", params: { page: 2, per_page: 10 }, headers: { "Host" => "api" }

      expect(response).to have_http_status(:ok)
      json_response = JSON.parse(response.body)
      expect(json_response["donors"]).to be_an(Array)
      expect(json_response["donors"].length).to eq(5)
      expect(json_response["meta"]["total_count"]).to eq(15)
      expect(json_response["meta"]["total_pages"]).to eq(2)
      expect(json_response["meta"]["current_page"]).to eq(2)
      expect(json_response["meta"]["per_page"]).to eq(10)
    end

    it "includes displayable_email from DonorPresenter" do
      donor = create(:donor, email: "test@mailinator.com")

      get "/api/donors", headers: { "Host" => "api" }

      expect(response).to have_http_status(:ok)
      json_response = JSON.parse(response.body)
      donor_json = json_response["donors"].find { |d| d["id"] == donor.id }
      expect(donor_json["displayable_email"]).to be_nil
    end
  end

  describe "PATCH /api/donors/:id" do
    it "updates donor with valid attributes" do
      donor = create(:donor, name: "Original Name", email: "original@example.com", last_updated_at: 1.day.ago)

      patch "/api/donors/#{donor.id}", params: { donor: { name: "Updated Name" } }, headers: { "Host" => "api" }

      expect(response).to have_http_status(:ok)
      json_response = JSON.parse(response.body)
      expect(json_response["name"]).to eq("Updated Name")
      expect(json_response["email"]).to eq("original@example.com")
    end

    it "updates last_updated_at timestamp" do
      donor = create(:donor, last_updated_at: 2.days.ago)
      old_timestamp = donor.last_updated_at

      patch "/api/donors/#{donor.id}", params: { donor: { name: "New Name" } }, headers: { "Host" => "api" }

      expect(response).to have_http_status(:ok)
      donor.reload
      expect(donor.last_updated_at).to be > old_timestamp
    end
  end

  describe "DELETE /api/donors/:id" do
    it "soft deletes donor (archives)" do
      donor = create(:donor)

      expect {
        delete "/api/donors/#{donor.id}", headers: { "Host" => "api" }
      }.not_to change(Donor, :count)

      expect(response).to have_http_status(:no_content)
      donor.reload
      expect(donor.discarded?).to be true
      expect(donor.discarded_at).to be_present
    end
  end

  describe "POST /api/donors/:id/restore" do
    it "restores discarded donor" do
      donor = create(:donor)
      donor.discard

      post "/api/donors/#{donor.id}/restore", headers: { "Host" => "api" }

      expect(response).to have_http_status(:ok)
      donor.reload
      expect(donor.discarded?).to be false
      expect(donor.discarded_at).to be_nil
    end
  end

  describe "DELETE /api/donors/all" do
    it "deletes all donors (test cleanup)" do
      create_list(:donor, 3)

      expect {
        delete "/api/donors/all", headers: { "Host" => "api" }
      }.to change(Donor, :count).by(-3)

      expect(response).to have_http_status(:ok)
      json_response = JSON.parse(response.body)
      expect(json_response["deleted_count"]).to eq(3)
    end
  end

  describe "POST /api/donors/merge" do
    it "merges donors with selected fields" do
      donor1 = create(:donor, name: 'Alice Smith', email: 'alice@example.com')
      donor2 = create(:donor, name: 'Alice S.', email: 'alice.smith@example.com')

      post "/api/donors/merge", params: {
        donor_ids: [ donor1.id, donor2.id ],
        field_selections: { name: donor1.id, email: donor2.id }
      }, headers: { "Host" => "api" }

      expect(response).to have_http_status(:ok)
      json_response = JSON.parse(response.body)
      expect(json_response["name"]).to eq("Alice Smith")
      expect(json_response["email"]).to eq("alice.smith@example.com")
    end
  end
end
