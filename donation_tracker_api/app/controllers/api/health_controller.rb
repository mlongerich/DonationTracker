# frozen_string_literal: true

# Health check controller for infrastructure monitoring.
#
# This controller provides:
# - Health endpoint for E2E test infrastructure readiness checks
# - Returns JSON with status and timestamp
# - Available in all environments (development, test, production)
#
# @example Check API health
#   GET /api/health
#   # Returns: { "status": "ok", "timestamp": "2025-11-12T15:30:00.000Z" }
#
# @see scripts/wait-for-api.sh for usage in E2E test startup
module Api
  # Health check endpoint for infrastructure monitoring
  class HealthController < ApplicationController
    # GET /api/health
    # Returns health status and timestamp
    def index
      render json: { status: "ok", timestamp: Time.current }, status: :ok
    end
  end
end
