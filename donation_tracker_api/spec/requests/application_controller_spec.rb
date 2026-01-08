require 'rails_helper'

RSpec.describe ApplicationController, type: :request do
  # Test global error handling via a real controller endpoint

  describe "Global error handlers" do
    describe "ActiveRecord::RecordNotFound" do
      it "returns 404 with error message when record not found" do
        get "/api/donors/99999", headers: { "Host" => "api" }

        expect(response).to have_http_status(:not_found)
        json = JSON.parse(response.body)
        expect(json["error"]).to include("Couldn't find Donor")
      end
    end

    describe "ActiveRecord::RecordInvalid" do
      it "returns 422 with validation errors when model invalid" do
        # Trigger validation error by sending blank required fields to children endpoint
        post "/api/children", params: { child: { name: "" } }, headers: { "Host" => "api" }

        expect(response).to have_http_status(:unprocessable_entity)
        json = JSON.parse(response.body)
        expect(json["errors"]).to be_present
      end
    end

    describe "ActionController::ParameterMissing" do
      it "returns 400 with error message when required param missing" do
        post "/api/donors", params: { invalid: {} }, headers: { "Host" => "api" }

        expect(response).to have_http_status(:bad_request)
        json = JSON.parse(response.body)
        expect(json["error"]).to include("param is missing")
      end
    end
  end

  describe "Authentication" do
    # Enable authentication for these specific tests
    before do
      allow(Rails).to receive(:env).and_return(ActiveSupport::StringInquirer.new('production'))
    end

    it "returns 401 Unauthorized when accessing protected endpoint without token" do
      get "/api/children", headers: { "Host" => "api" }

      expect(response).to have_http_status(:unauthorized)
      json = JSON.parse(response.body)
      expect(json["error"]).to include("token")
    end

    it "allows access to protected endpoint with valid token" do
      user = create(:user, email: "test@projectsforasia.com")
      token = JsonWebToken.encode({ user_id: user.id })

      get "/api/children", headers: {
        "Host" => "api",
        "Authorization" => "Bearer #{token}"
      }

      expect(response).to have_http_status(:ok)
    end
  end
end
