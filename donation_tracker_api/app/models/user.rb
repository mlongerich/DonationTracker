# frozen_string_literal: true

# Represents a user account for authentication (future implementation).
#
# A user must have:
# - Username (required)
#
# Note: This model is a placeholder for future authentication implementation.
# Currently not actively used in the application.
#
# @see TICKET-008 for future Google OAuth implementation
class User < ApplicationRecord
  validates :username, presence: true
end
