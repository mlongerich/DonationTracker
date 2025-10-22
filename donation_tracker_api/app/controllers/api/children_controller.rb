class Api::ChildrenController < ApplicationController
  include PaginationConcern
  include RansackFilterable

  def index
    scope = Child.all
    filtered_scope = apply_ransack_filters(scope)
    children = paginate_collection(filtered_scope.order(name: :asc))

    render json: {
      children: children,
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
