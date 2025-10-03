class Api::DonorsController < ApplicationController
  def index
    donors = Donor.order(created_at: :desc)
    render json: donors
  end

  def create
    donor_params = params.require(:donor).permit(:name, :email)
    result = DonorService.find_or_update_by_email(donor_params, Time.current)

    status = result[:created] ? :created : :ok
    render json: result[:donor], status: status
  end

  def show
    donor = Donor.find(params[:id])
    render json: donor
  end
end
