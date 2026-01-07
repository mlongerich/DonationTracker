# frozen_string_literal: true

# Service for encoding and decoding JWT tokens for authentication.
#
# Provides methods to:
# - Encode user data into a JWT token with expiration
# - Decode and verify JWT tokens
#
# @example Encode a user ID into a token
#   token = JsonWebToken.encode({ user_id: 1 })
#
# @example Decode a token to get the payload
#   payload = JsonWebToken.decode(token)
#   user_id = payload[:user_id]
#
# @see AuthController for usage in OAuth callback
class JsonWebToken
  SECRET_KEY = Rails.application.secret_key_base || "development_secret"

  def self.encode(payload, exp = 30.days.from_now)
    payload[:exp] = exp.to_i
    JWT.encode(payload, SECRET_KEY)
  end

  def self.decode(token)
    decoded = JWT.decode(token, SECRET_KEY)[0]
    HashWithIndifferentAccess.new(decoded)
  end
end
