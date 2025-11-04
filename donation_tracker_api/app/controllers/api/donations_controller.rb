module Api
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
      params.require(:donation).permit(:amount, :date, :donor_id, :project_id, :sponsorship_id, :child_id, :status, :description)
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
