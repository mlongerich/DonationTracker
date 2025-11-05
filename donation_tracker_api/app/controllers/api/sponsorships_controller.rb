class Api::SponsorshipsController < ApplicationController
  include PaginationConcern
  include RansackFilterable

  def index
    child_id = params[:child_id]

    if child_id.present?
      child = Child.find(child_id)
      sponsorships = child.sponsorships.includes(:donor, :child)
      json_data = CollectionPresenter.new(sponsorships, SponsorshipPresenter).as_json

      render json: { sponsorships: json_data }, status: :ok
    else
      scope = Sponsorship.includes(:donor, :child).all
      filtered_scope = apply_ransack_filters(scope)
      sponsorships = paginate_collection(filtered_scope.order(created_at: :desc))
      json_data = CollectionPresenter.new(sponsorships, SponsorshipPresenter).as_json

      render json: {
        sponsorships: json_data,
        meta: pagination_meta(sponsorships)
      }, status: :ok
    end
  end

  def create
    sponsorship = Sponsorship.new(sponsorship_params)

    if sponsorship.save
      render json: { sponsorship: SponsorshipPresenter.new(sponsorship).as_json }, status: :created
    else
      render json: { errors: sponsorship.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def destroy
    sponsorship = Sponsorship.find(params[:id])
    sponsorship.update!(end_date: Date.current)

    render json: { sponsorship: SponsorshipPresenter.new(sponsorship).as_json }, status: :ok
  end

  private

  def sponsorship_params
    params.require(:sponsorship).permit(:donor_id, :child_id, :project_id, :monthly_amount, :start_date)
  end
end
