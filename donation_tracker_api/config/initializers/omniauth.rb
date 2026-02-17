# frozen_string_literal: true

# OmniAuth configuration for Google OAuth2 authentication
Rails.application.config.middleware.use OmniAuth::Builder do
  provider :google_oauth2,
           ENV["GOOGLE_CLIENT_ID"],
           ENV["GOOGLE_CLIENT_SECRET"],
           {
             scope: "email,profile",
             prompt: "select_account",
             image_aspect_ratio: "square",
             image_size: 50,
             access_type: "online",
             name: "google_oauth2"
           }
end

# Silence OmniAuth logger in production to reduce noise
OmniAuth.config.logger = Rails.logger
OmniAuth.config.silence_get_warning = true if Rails.env.production?
