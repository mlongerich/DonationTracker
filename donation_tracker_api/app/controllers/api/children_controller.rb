class Api::ChildrenController < ApplicationController
  include PaginationConcern
  include RansackFilterable

  def index
    scope = params[:include_discarded] == "true" ? Child.with_discarded : Child.kept

    # Conditionally eager load sponsorships to avoid N+1 queries
    if params[:include_sponsorships] == "true"
      scope = scope.includes(sponsorships: :donor)
    end

    filtered_scope = apply_ransack_filters(scope)
    children = paginate_collection(filtered_scope.order(name: :asc))

    # Use CollectionPresenter with options
    presenter_options = { include_sponsorships: params[:include_sponsorships] == "true" }

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
