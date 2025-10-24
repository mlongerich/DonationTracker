class Api::ChildrenController < ApplicationController
  include PaginationConcern
  include RansackFilterable

  def index
    scope = Child.all

    # Conditionally eager load sponsorships to avoid N+1 queries
    if params[:include_sponsorships] == "true"
      scope = scope.includes(sponsorships: :donor)
    end

    filtered_scope = apply_ransack_filters(scope)
    children = paginate_collection(filtered_scope.order(name: :asc))

    # Build children data with optional sponsorships using presenter
    children_data = children.map do |child|
      child_json = ChildPresenter.new(child).as_json

      if params[:include_sponsorships] == "true"
        child_json[:sponsorships] = child.sponsorships.map do |s|
          {
            id: s.id,
            donor_id: s.donor_id,
            donor_name: s.donor&.name,
            child_id: s.child_id,
            monthly_amount: s.monthly_amount.to_s,
            active: s.active?,
            end_date: s.end_date
          }
        end
      end

      child_json
    end

    render json: {
      children: children_data,
      meta: pagination_meta(children)
    }
  end

  def show
    child = Child.find(params[:id])
    render json: child
  end

  def create
    child = Child.new(child_params)

    if child.save
      render json: { child: child }, status: :created
    else
      render json: { errors: child.errors }, status: :unprocessable_entity
    end
  end

  def update
    child = Child.find(params[:id])

    if child.update(child_params)
      render json: { child: child }
    else
      render json: { errors: child.errors }, status: :unprocessable_entity
    end
  end

  def destroy
    child = Child.find(params[:id])
    child.destroy

    head :no_content
  end

  private

  def child_params
    params.require(:child).permit(:name)
  end
end
