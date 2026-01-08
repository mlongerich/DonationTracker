# frozen_string_literal: true

module AuthHelpers
  def auth_headers
    user = create(:user, email: "test@projectsforasia.com")
    token = JsonWebToken.encode({ user_id: user.id })
    { "Authorization" => "Bearer #{token}" }
  end
end

RSpec.configure do |config|
  config.include AuthHelpers, type: :request
end
