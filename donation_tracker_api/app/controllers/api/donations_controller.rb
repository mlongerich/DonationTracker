module Api
  class DonationsController < ApplicationController
    def index
      scope = Donation.includes(:donor).all
      @q = scope.ransack(params[:q])
      donations = @q.result.order(date: :desc).page(params[:page]).per(params[:per_page] || 25)

      render json: {
        donations: CollectionPresenter.new(donations, DonationPresenter).as_json,
        meta: {
          total_count: donations.total_count,
          total_pages: donations.total_pages,
          current_page: donations.current_page,
          per_page: donations.limit_value
        }
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
      params.require(:donation).permit(:amount, :date, :donor_id, :status, :description)
    end
  end
end
