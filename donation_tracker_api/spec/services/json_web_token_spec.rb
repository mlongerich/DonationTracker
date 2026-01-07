# frozen_string_literal: true

require "rails_helper"

RSpec.describe JsonWebToken do
  describe ".encode" do
    it "returns a token string when given a valid payload" do
      payload = { user_id: 1 }

      token = JsonWebToken.encode(payload)

      expect(token).to be_a(String)
      expect(token).not_to be_empty
    end
  end

  describe ".decode" do
    it "returns the original payload when given a valid token" do
      original_payload = { user_id: 123 }
      token = JsonWebToken.encode(original_payload)

      decoded_payload = JsonWebToken.decode(token)

      expect(decoded_payload[:user_id]).to eq(123)
    end

    it "raises an error when token is expired" do
      payload = { user_id: 456 }
      expired_time = 1.hour.ago
      token = JsonWebToken.encode(payload, expired_time)

      expect { JsonWebToken.decode(token) }.to raise_error(JWT::ExpiredSignature)
    end

    it "raises an error when token is invalid" do
      invalid_token = "invalid.token.here"

      expect { JsonWebToken.decode(invalid_token) }.to raise_error(JWT::DecodeError)
    end
  end
end
