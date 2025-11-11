# frozen_string_literal: true

# API namespace for all REST API controllers.
module Api
  # Handles CRUD operations for donations via REST API endpoints.
  #
  # This controller provides:
  # - Index endpoint with pagination, filtering (Ransack), and date range validation
  # - Create endpoint with donor, project, child, and sponsorship associations
  # - Show endpoint for individual donation details
  #
  # All responses use DonationPresenter for consistent JSON formatting
  # including computed fields like donor_name and project_title.
  #
  # @example Create a donation
  #   POST /api/donations
  #   { "donation": { "amount": 10000, "date": "2025-01-15", "donor_id": 1, "project_id": 2 } }
  #
  # @see DonationPresenter for response format
  # @see PaginationConcern for pagination (25 per page default)
  # @see RansackFilterable for filter syntax
  class DonationsController < ApplicationController
    include PaginationConcern
    include RansackFilterable

    def index
      return if validate_date_range! == false

      scope = Donation.includes(:donor).all
      filtered_scope = apply_ransack_filters(scope)
      donations = paginate_collection(filtered_scope.order(date: :desc))

      render json: {
        donations: CollectionPresenter.new(donations, DonationPresenter).as_json,
        meta: pagination_meta(donations)
      }, status: :ok
    end

    def create
      donation = Donation.new(donation_params)
      donation.save!  # Raises RecordInvalid if validation fails
      donation.reload
      render json: { donation: DonationPresenter.new(donation).as_json }, status: :created
    end

    def show
      donation = Donation.includes(:donor).find(params[:id])
      render json: { donation: DonationPresenter.new(donation).as_json }, status: :ok
    end

    private

    def donation_params
      params.require(:donation).permit(:amount, :date, :donor_id, :project_id, :sponsorship_id, :child_id, :payment_method, :status, :description)
    end

    def validate_date_range!
      ransack_params = params[:q]
      return true unless ransack_params&.key?(:date_gteq) && ransack_params&.key?(:date_lteq)

      start_date = Date.parse(ransack_params[:date_gteq].to_s)
      end_date = Date.parse(ransack_params[:date_lteq].to_s)

      if start_date > end_date
        render json: {
          error: "End date must be after or equal to start date"
        }, status: :unprocessable_entity
        return false
      end

      true
    rescue ArgumentError
      # Invalid date format - let Ransack handle it
      true
    end
  end
end
