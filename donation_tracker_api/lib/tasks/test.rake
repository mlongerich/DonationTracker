# frozen_string_literal: true

namespace :test do
  desc 'Delete all test data in FK-safe order, preserving system projects'
  task cleanup: :environment do
    raise 'Not available in production' if Rails.env.production?

    Donation.delete_all
    Sponsorship.delete_all
    Donor.delete_all
    Child.delete_all
    Project.where(system: false).delete_all
  end
end
