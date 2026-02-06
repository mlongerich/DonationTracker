# frozen_string_literal: true

# Handles Google OAuth2 authentication and JWT token generation.
#
# This controller provides:
# - OAuth callback handling (creates/updates user)
# - JWT token generation for authenticated users
# - Domain validation (@projectsforasia.com only)
#
# @example OAuth callback response
#   { "token": "jwt_string", "user": { "email": "admin@projectsforasia.com", ... } }
#
# @see JsonWebToken for JWT encoding/decoding
# @see User for domain validation
class AuthController < ApplicationController
  skip_before_action :authenticate_request, only: [ :google_oauth2, :dev_login ]

  def google_oauth2
    auth = request.env["omniauth.auth"]

    # Validate domain before creating user
    unless auth.info.email.end_with?("@projectsforasia.com")
      render json: {
        error: "Access denied. Only @projectsforasia.com email addresses are allowed."
      }, status: :forbidden
      return
    end

    user = User.find_or_initialize_by(provider: auth.provider, uid: auth.uid)
    user.email = auth.info.email
    user.name = auth.info.name
    user.avatar_url = auth.info.image
    user.save!

    token = JsonWebToken.encode({ user_id: user.id })

    user_data = {
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url
    }

    # Redirect to frontend callback with token and user data
    frontend_url = ENV.fetch("FRONTEND_URL", "http://localhost:3000")
    redirect_to "#{frontend_url}/auth/callback?token=#{token}&user=#{CGI.escape(user_data.to_json)}", allow_other_host: true
  end

  def dev_login
    # Find seeded admin user
    user = User.find_by!(provider: "google_oauth2", uid: "admin_test_uid")

    token = JsonWebToken.encode({ user_id: user.id })

    user_data = {
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url
    }

    # Redirect to frontend callback with token and user data
    frontend_url = ENV.fetch("FRONTEND_URL", "http://localhost:3000")
    redirect_to "#{frontend_url}/auth/callback?token=#{token}&user=#{CGI.escape(user_data.to_json)}", allow_other_host: true
  end

  def me
    token = extract_token_from_header
    unless token
      render json: { error: "Authorization token missing" }, status: :unauthorized
      return
    end

    decoded = JsonWebToken.decode(token)
    user = User.find(decoded[:user_id])

    render json: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url
      }
    }, status: :ok
  rescue JWT::DecodeError, JWT::ExpiredSignature
    render json: { error: "Invalid or expired token" }, status: :unauthorized
  rescue ActiveRecord::RecordNotFound
    render json: { error: "User not found" }, status: :unauthorized
  end

  private

  def extract_token_from_header
    auth_header = request.headers["Authorization"]
    return nil unless auth_header&.start_with?("Bearer ")

    auth_header.split(" ").last
  end
end
