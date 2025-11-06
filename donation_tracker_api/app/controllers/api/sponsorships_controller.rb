# frozen_string_literal: true

# Handles CRUD operations for sponsorships via REST API endpoints.
#
# This controller provides:
# - Index endpoint with pagination and filtering (Ransack)
# - Optional child_id filtering for child-specific sponsorships
# - Create endpoint with donor, child, and project associations
# - Destroy endpoint that ends sponsorships by setting end_date (soft-end)
#
# All responses use SponsorshipPresenter for consistent JSON formatting
# with computed fields like donor_name and child_name.
#
# @example Create a new sponsorship
#   POST /api/sponsorships
#   { "sponsorship": { "donor_id": 1, "child_id": 2, "monthly_amount": 5000, "start_date": "2025-01-01" } }
#
# @see SponsorshipPresenter for response format
# @see PaginationConcern for pagination helpers
# @see RansackFilterable for filtering logic
# @see TICKET-064 for smart sponsorship detection
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
