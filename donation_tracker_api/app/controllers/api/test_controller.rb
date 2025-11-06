# frozen_string_literal: true

# Test-only controller for E2E test support.
#
# This controller provides:
# - cleanup endpoint to delete all donations, sponsorships, donors, children, and non-system projects
# - Only available in development and test environments (forbidden in production)
# - Ensures clean database state for E2E test runs
#
# Deletes in correct order to avoid foreign key constraint violations.
# System projects are preserved for application functionality.
#
# @example Clean database for E2E tests
#   DELETE /api/test/cleanup
#   # Returns: { message: "Database cleaned", donations_deleted: true, ... }
#
# @see Cypress E2E tests for usage
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
      # Delete non-system projects (keep system projects for application functionality)
      Project.where(system: false).delete_all

      render json: { message: "Database cleaned", donations_deleted: true, donors_deleted: true, projects_deleted: true }, status: :ok
    end
  end
end
