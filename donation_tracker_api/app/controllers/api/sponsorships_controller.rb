class Api::SponsorshipsController < ApplicationController
  include PaginationConcern
  include RansackFilterable

  def index
    if params[:child_id].present?
      child = Child.find(params[:child_id])
      sponsorships = child.sponsorships.includes(:donor)

      sponsorships_data = sponsorships.map do |s|
        {
          id: s.id,
          donor_id: s.donor_id,
          donor_name: s.donor.name,
          child_id: s.child_id,
          monthly_amount: s.monthly_amount.to_s,
          active: s.active?,
          end_date: s.end_date
        }
      end

      render json: { sponsorships: sponsorships_data }, status: :ok
    else
      scope = Sponsorship.includes(:donor, :child).all
      filtered_scope = apply_ransack_filters(scope)
      sponsorships = paginate_collection(filtered_scope.order(created_at: :desc))

      sponsorships_data = sponsorships.map do |s|
        {
          id: s.id,
          donor_id: s.donor_id,
          donor_name: s.donor.name,
          child_id: s.child_id,
          child_name: s.child.name,
          monthly_amount: s.monthly_amount.to_s,
          active: s.active?,
          end_date: s.end_date
        }
      end

      render json: {
        sponsorships: sponsorships_data,
        meta: pagination_meta(sponsorships)
      }, status: :ok
    end
  end

  def create
    sponsorship = Sponsorship.new(sponsorship_params)

    if sponsorship.save
      render json: { sponsorship: sponsorship }, status: :created
    else
      render json: { errors: sponsorship.errors }, status: :unprocessable_entity
    end
  end

  def destroy
    sponsorship = Sponsorship.find(params[:id])
    sponsorship.update!(end_date: Date.current)

    render json: { sponsorship: sponsorship }, status: :ok
  end

  private

  def sponsorship_params
    params.require(:sponsorship).permit(:donor_id, :child_id, :monthly_amount)
  end
end
