# Pact Provider Helper for Rails API
require 'rails_helper'
require 'pact/provider/rspec'

# Configure Pact Provider
Pact.configure do |config|
  config.reports_dir = "tmp/reports/pacts"
  config.include WebMock::API
  config.include WebMock::Matchers
end

# Provider setup for contract verification
Pact.provider_states_for "Frontend Consumer" do
  # Define provider states that consumers can reference

  provider_state "user 123 exists" do
    set_up do
      # Create test data for this state
      User.create!(id: 123, username: 'testuser')
    end

    tear_down do
      # Clean up test data
      User.destroy_all
    end
  end

  provider_state "no users exist" do
    set_up do
      # Ensure clean state
      User.destroy_all
    end
  end

  # Add more provider states as needed for different API endpoints
  # provider_state "donor with donations exists" do
  #   set_up do
  #     donor = Donor.create!(name: 'Test Donor', email: 'test@example.com')
  #     Donation.create!(donor: donor, amount: 100.00)
  #   end
  #
  #   tear_down do
  #     Donation.destroy_all
  #     Donor.destroy_all
  #   end
  # end
end

# Pact verification configuration
Pact.service_provider "Rails API" do
  honours_pact_with "Frontend Consumer" do
    # Use pact files from frontend or broker
    pact_uri Rails.root.join('spec', 'pacts', 'frontend_consumer-rails_api.json')

    # Uncomment when using Pact Broker
    # pact_uri "http://pact-broker/pacts/provider/Rails%20API/consumer/Frontend%20Consumer/latest"
  end
end