module Api
  class DonationsController < ApplicationController
    include PaginationConcern
    include RansackFilterable

    def index
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

      if donation.save
        donation.reload
        render json: DonationPresenter.new(donation).as_json, status: :created
      else
        render json: { errors: donation.errors.full_messages }, status: :unprocessable_entity
      end
    end

    def show
      donation = Donation.includes(:donor).find(params[:id])
      render json: DonationPresenter.new(donation).as_json, status: :ok
    end

    private

    def donation_params
      params.require(:donation).permit(:amount, :date, :donor_id, :project_id, :sponsorship_id, :child_id, :status, :description)
    end
  end
end
