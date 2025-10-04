class Api::DonorsController < ApplicationController
  def index
    @q = Donor.ransack(params[:q])
    donors = @q.result.order(created_at: :desc).page(params[:page]).per(params[:per_page] || 25)
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

  def update
    donor = Donor.find(params[:id])
    donor_params = params.require(:donor).permit(:name, :email)

    # Update with current timestamp for date-based conflict resolution
    donor.update!(donor_params.merge(last_updated_at: Time.current))

    render json: donor, status: :ok
  end

  def destroy
    donor = Donor.find(params[:id])
    donor.destroy!

    head :no_content
  end
end
