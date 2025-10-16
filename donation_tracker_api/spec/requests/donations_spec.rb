require 'rails_helper'

RSpec.describe "/api/donations", type: :request do
  describe "POST /api/donations" do
    it "creates a donation with valid attributes" do
      donor = create(:donor)

      post "/api/donations", params: {
        donation: {
          amount: 100.50,
          date: Date.today,
          donor_id: donor.id
        }
      }

      expect(response).to have_http_status(:created)
    end
  end

  describe "GET /api/donations" do
    it "returns all donations with donor names" do
      donor = create(:donor, name: "Test Donor")
      create(:donation, donor: donor)

      get "/api/donations"

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json["donations"]).to be_an(Array)
      expect(json["donations"].first["donor_name"]).to eq("Test Donor")
    end

    it "returns donations sorted by date descending" do
      donor = create(:donor)
      # Create newer donation FIRST (earlier created_at), older date SECOND (later created_at)
      # This ensures test fails if sorted by created_at instead of date
      new_donation = create(:donation, amount: 100, date: Date.today, donor: donor)
      sleep 0.1 # Ensure different created_at timestamps
      create(:donation, amount: 50, date: 10.days.ago, donor: donor)

      get "/api/donations"

      json = JSON.parse(response.body)
      # Should return new_donation first (sorted by date, not created_at)
      expect(json["donations"].first["id"]).to eq(new_donation.id)
    end

    it "paginates results with default 25 per page" do
      donor = create(:donor)
      30.times { |i| create(:donation, date: Date.today - i.days, donor: donor) }

      get "/api/donations"

      json = JSON.parse(response.body)
      expect(json["donations"].count).to eq(25)
      expect(json["meta"]["total_count"]).to eq(30)
      expect(json["meta"]["total_pages"]).to eq(2)
      expect(json["meta"]["current_page"]).to eq(1)
    end

    it "filters by donor_id using Ransack" do
      donor1 = create(:donor)
      donor2 = create(:donor)
      donation1 = create(:donation, donor: donor1)
      create(:donation, donor: donor2)

      get "/api/donations", params: { q: { donor_id_eq: donor1.id } }

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json["donations"].count).to eq(1)
      expect(json["donations"].first["id"]).to eq(donation1.id)
    end

    it "filters by date range using Ransack" do
      donor = create(:donor)
      old_donation = create(:donation, date: 10.days.ago, donor: donor)
      recent_donation = create(:donation, date: 2.days.ago, donor: donor)

      get "/api/donations", params: { q: { date_gteq: 5.days.ago.to_date, date_lteq: Date.today } }

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json["donations"].count).to eq(1)
      expect(json["donations"].first["id"]).to eq(recent_donation.id)
    end
  end

  describe "GET /api/donations/:id" do
    it "returns the donation" do
      donation = create(:donation)

      get "/api/donations/#{donation.id}"

      expect(response).to have_http_status(:ok)
    end
  end
end
