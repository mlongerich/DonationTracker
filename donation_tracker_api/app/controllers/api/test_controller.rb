# frozen_string_literal: true

module Api
  # Test-only controller for E2E test support
  # Only available in development and test environments
  class TestController < ApplicationController
    # DELETE /api/test/cleanup
    # Removes all donations and donors for clean E2E test runs
    def cleanup
      # Only allow in development and test environments
      unless Rails.env.development? || Rails.env.test?
        render json: { error: "Not available in production" }, status: :forbidden
        return
      end

      # Delete in correct order to avoid foreign key constraint violations
      Donation.delete_all
      Sponsorship.delete_all
      Donor.delete_all
      Child.delete_all
      # Don't delete projects as they may be system projects

      render json: { message: "Database cleaned", donations_deleted: true, donors_deleted: true }, status: :ok
    end
  end
end
