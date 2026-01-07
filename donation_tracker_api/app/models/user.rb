# frozen_string_literal: true

# Represents a user account authenticated via Google OAuth.
#
# A user must have:
# - Email (required, must be @projectsforasia.com domain)
# - Provider (google_oauth2)
# - UID (unique identifier from OAuth provider)
#
# OAuth fields:
# - provider: OAuth provider name (e.g., 'google_oauth2')
# - uid: Unique identifier from the provider
# - email: User's email address
# - name: User's display name
# - avatar_url: URL to user's profile picture
#
# Note: OAuth is handled manually in AuthController (not via Devise)
# for API-only JWT authentication without sessions.
#
# @example Create user from Google OAuth callback
#   user = User.from_google_oauth(auth_hash)
#
# @see AuthController for OAuth callback handling
# @see TICKET-008 for Google OAuth implementation
class User < ApplicationRecord
  validates :email, presence: true,
                    format: {
                      with: /\A.+@projectsforasia\.com\z/,
                      message: "must be a @projectsforasia.com email address"
                    }
  validates :provider, presence: true
  validates :uid, presence: true
end
