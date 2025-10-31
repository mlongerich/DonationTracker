class Api::DonorsController < ApplicationController
  include PaginationConcern
  include RansackFilterable

  def index
    scope = params[:include_discarded] == "true" ? Donor.with_discarded : Donor.kept
    # Exclude merged donors (they have merged_into_id set)
    scope = scope.where(merged_into_id: nil)

    filtered_scope = apply_ransack_filters(scope)
    donors = paginate_collection(filtered_scope.order(name: :asc))

    render json: {
      donors: CollectionPresenter.new(donors, DonorPresenter).as_json,
      meta: pagination_meta(donors)
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

    if donor.discard
      head :no_content
    else
      render json: { errors: donor.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def restore
    donor = Donor.with_discarded.find(params[:id])
    donor.undiscard

    render json: donor, status: :ok
  end

  def merge
    donor_ids = params[:donor_ids].map(&:to_i)
    field_selections = params[:field_selections].to_unsafe_h.symbolize_keys.transform_values(&:to_i)

    result = DonorMergeService.new(
      donor_ids: donor_ids,
      field_selections: field_selections
    ).merge

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
