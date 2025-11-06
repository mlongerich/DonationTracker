# frozen_string_literal: true

# Handles CRUD operations for children via REST API endpoints.
#
# This controller provides:
# - Index endpoint with pagination, filtering (Ransack), and archived child support
# - Optional sponsorship data inclusion with eager loading to avoid N+1 queries
# - Create endpoint with validation
# - Show, Update, Delete endpoints with soft-delete support
# - Archive and restore endpoints for child lifecycle management
#
# All responses use ChildPresenter for consistent JSON formatting.
#
# @example Create a new child
#   POST /api/children
#   { "child": { "name": "Maria Rodriguez" } }
#
# @see ChildPresenter for response format
# @see PaginationConcern for pagination helpers
# @see RansackFilterable for filtering logic
# @see TICKET-049 for soft-delete implementation
class Api::ChildrenController < ApplicationController
  include PaginationConcern
  include RansackFilterable

  def index
    include_discarded = params[:include_discarded] == "true"
    include_sponsorships = params[:include_sponsorships] == "true"

    scope = include_discarded ? Child.with_discarded : Child.kept

    # Conditionally eager load sponsorships to avoid N+1 queries
    scope = scope.includes(sponsorships: :donor) if include_sponsorships

    filtered_scope = apply_ransack_filters(scope)
    children = paginate_collection(filtered_scope.order(name: :asc))

    # Use CollectionPresenter with options
    presenter_options = { include_sponsorships: include_sponsorships }

    render json: {
      children: CollectionPresenter.new(children, ChildPresenter, presenter_options).as_json,
      meta: pagination_meta(children)
    }
  end

  def show
    child = Child.find(params[:id])
    render json: { child: ChildPresenter.new(child).as_json }
  end

  def create
    child = Child.new(child_params)
    child.save!  # Raises RecordInvalid if validation fails
    render json: { child: ChildPresenter.new(child).as_json }, status: :created
  end

  def update
    child = Child.find(params[:id])
    child.update!(child_params)  # Raises RecordInvalid if validation fails
    render json: { child: ChildPresenter.new(child).as_json }
  end

  def destroy
    child = Child.find(params[:id])
    child.destroy

    head :no_content
  end

  def archive
    child = Child.find(params[:id])
    child.discard!  # Raises if fails
    head :no_content
  end

  def restore
    child = Child.with_discarded.find(params[:id])
    child.undiscard

    render json: { child: ChildPresenter.new(child).as_json }
  end

  private

  def child_params
    params.require(:child).permit(:name)
  end
end
