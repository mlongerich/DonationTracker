# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Authentication", type: :request do
  describe "GET /auth/google_oauth2/callback" do
    it "creates user and redirects to frontend callback with JWT when email is @projectsforasia.com" do
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

      expect(response).to have_http_status(:found) # 302 redirect

      # Extract token and user from redirect URL
      redirect_url = URI.parse(response.headers["Location"])
      params = CGI.parse(redirect_url.query)

      expect(redirect_url.path).to eq("/auth/callback")
      expect(params["token"].first).to be_present
      expect(params["user"].first).to be_present

      # Verify JWT contains user_id
      decoded = JsonWebToken.decode(params["token"].first)
      expect(decoded[:user_id]).to eq(User.last.id)

      # Verify user data
      user_data = JSON.parse(params["user"].first)
      expect(user_data["email"]).to eq("admin@projectsforasia.com")
      expect(user_data["name"]).to eq("Test Admin")
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

  describe "GET /auth/dev_login" do
    it "redirects to frontend callback with JWT for seeded admin user in development" do
      # Ensure seeded user exists
      user = User.find_or_create_by!(
        provider: "google_oauth2",
        uid: "admin_test_uid"
      ) do |u|
        u.email = "admin@projectsforasia.com"
        u.name = "Admin User"
        u.avatar_url = "https://via.placeholder.com/150"
      end

      get "/auth/dev_login"

      expect(response).to have_http_status(:found) # 302 redirect

      # Extract token and user from redirect URL
      redirect_url = URI.parse(response.headers["Location"])
      params = CGI.parse(redirect_url.query)

      expect(redirect_url.path).to eq("/auth/callback")
      expect(params["token"].first).to be_present
      expect(params["user"].first).to be_present

      # Verify JWT contains user_id
      decoded = JsonWebToken.decode(params["token"].first)
      expect(decoded[:user_id]).to eq(user.id)

      # Verify user data
      user_data = JSON.parse(params["user"].first)
      expect(user_data["email"]).to eq("admin@projectsforasia.com")
      expect(user_data["name"]).to eq("Admin User")
    end
  end
end
