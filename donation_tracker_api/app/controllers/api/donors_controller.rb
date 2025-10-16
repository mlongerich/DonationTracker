class Api::DonorsController < ApplicationController
  def index
    scope = params[:include_discarded] == "true" ? Donor.with_discarded : Donor.kept
    # Exclude merged donors (they have merged_into_id set)
    scope = scope.where(merged_into_id: nil)
    @q = scope.ransack(params[:q])
    donors = @q.result.order(name: :asc).page(params[:page]).per(params[:per_page] || 25)

    render json: {
      donors: donors,
      meta: {
        total_count: donors.total_count,
        total_pages: donors.total_pages,
        current_page: donors.current_page,
        per_page: donors.limit_value
      }
    }
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
    donor.discard

    head :no_content
  end

  def restore
    donor = Donor.with_discarded.find(params[:id])
    donor.undiscard

    render json: donor, status: :ok
  end

  def merge
    donor_ids = params[:donor_ids].map(&:to_i)
    field_selections = params[:field_selections].to_unsafe_h.symbolize_keys.transform_values(&:to_i)

    result = DonorMergeService.merge(
      donor_ids: donor_ids,
      field_selections: field_selections
    )

    render json: result[:merged_donor], status: :ok
  end

  def destroy_all
    # Only allow in development and test environments
    if Rails.env.production?
      render json: { error: "Not allowed in production" }, status: :forbidden
      return
    end

    count = Donor.count
    Donor.destroy_all

    render json: { deleted_count: count }, status: :ok
  end
end
