# frozen_string_literal: true

# Configure OmniAuth directly for API-only OAuth (no Devise, no sessions)
#
# This configures OmniAuth middleware to only intercept /auth/* routes.
# All other routes bypass OmniAuth completely.
Rails.application.config.middleware.use OmniAuth::Builder do
  configure do |config|
    # Only process routes starting with /auth/
    config.path_prefix = "/auth"
    # API-only: Allow testing without sessions
    config.test_mode = Rails.env.test?
  end

  provider :google_oauth2,
           ENV.fetch("GOOGLE_CLIENT_ID", "test_client_id"),
           ENV.fetch("GOOGLE_CLIENT_SECRET", "test_client_secret"),
           {
             scope: "email,profile",
             prompt: "select_account",
             image_aspect_ratio: "square",
             image_size: 50
           }
end
