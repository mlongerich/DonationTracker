# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Api::Health", type: :request do
  describe "GET /api/health" do
    it "returns 200 OK with status and timestamp" do
      get "/api/health"

      expect(response).to have_http_status(:ok)
      expect(response.content_type).to match(a_string_including("application/json"))

      json = JSON.parse(response.body)
      expect(json["status"]).to eq("ok")
      expect(json["timestamp"]).to be_present
    end
  end
end
