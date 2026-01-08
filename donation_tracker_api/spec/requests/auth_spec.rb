# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Authentication", type: :request do
  describe "GET /auth/google_oauth2/callback" do
    it "creates user and returns JWT when email is @projectsforasia.com" do
      # Mock OmniAuth response
      OmniAuth.config.test_mode = true
      OmniAuth.config.mock_auth[:google_oauth2] = OmniAuth::AuthHash.new({
        provider: "google_oauth2",
        uid: "123456789",
        info: {
          email: "admin@projectsforasia.com",
          name: "Test Admin",
          image: "https://example.com/avatar.jpg"
        }
      })

      expect {
        get "/auth/google_oauth2/callback"
      }.to change(User, :count).by(1)

      expect(response).to have_http_status(:ok)

      json = JSON.parse(response.body)
      expect(json["token"]).to be_present
      expect(json["user"]["email"]).to eq("admin@projectsforasia.com")

      # Verify JWT contains user_id
      decoded = JsonWebToken.decode(json["token"])
      expect(decoded[:user_id]).to eq(User.last.id)
    end

    it "returns 403 Forbidden when email is not @projectsforasia.com" do
      OmniAuth.config.test_mode = true
      OmniAuth.config.mock_auth[:google_oauth2] = OmniAuth::AuthHash.new({
        provider: "google_oauth2",
        uid: "987654321",
        info: {
          email: "unauthorized@gmail.com",
          name: "Unauthorized User",
          image: "https://example.com/avatar2.jpg"
        }
      })

      expect {
        get "/auth/google_oauth2/callback"
      }.not_to change(User, :count)

      expect(response).to have_http_status(:forbidden)
      json = JSON.parse(response.body)
      expect(json["error"]).to include("@projectsforasia.com")
    end
  end

  describe "GET /auth/me" do
    it "returns current user when valid JWT token provided" do
      user = create(:user, email: "test@projectsforasia.com")
      token = JsonWebToken.encode({ user_id: user.id })

      get "/auth/me", headers: { "Authorization" => "Bearer #{token}" }

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json["user"]["email"]).to eq("test@projectsforasia.com")
      expect(json["user"]["id"]).to eq(user.id)
    end

    it "returns 401 Unauthorized when token is missing" do
      get "/auth/me"

      expect(response).to have_http_status(:unauthorized)
      json = JSON.parse(response.body)
      expect(json["error"]).to be_present
    end

    it "returns 401 Unauthorized when token is invalid" do
      get "/auth/me", headers: { "Authorization" => "Bearer invalid_token" }

      expect(response).to have_http_status(:unauthorized)
      json = JSON.parse(response.body)
      expect(json["error"]).to be_present
    end
  end
end
