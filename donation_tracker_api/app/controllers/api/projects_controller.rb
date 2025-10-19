class Api::ProjectsController < ApplicationController
  include PaginationConcern
  include RansackFilterable

  def index
    scope = Project.all
    filtered_scope = apply_ransack_filters(scope)
    projects = paginate_collection(filtered_scope.order(title: :asc))

    render json: {
      projects: projects,
      meta: pagination_meta(projects)
    }
  end

  def show
    project = Project.find(params[:id])
    render json: { project: project }
  end

  def create
    project = Project.new(project_params)

    if project.save
      render json: { project: project }, status: :created
    else
      render json: { errors: project.errors }, status: :unprocessable_entity
    end
  end

  def update
    project = Project.find(params[:id])

    if project.system?
      render json: { error: "Cannot update system projects" }, status: :forbidden
      return
    end

    if project.update(project_params)
      render json: { project: project }
    else
      render json: { errors: project.errors }, status: :unprocessable_entity
    end
  end

  def destroy
    project = Project.find(params[:id])

    if project.system?
      render json: { error: "Cannot delete system projects" }, status: :forbidden
      return
    end

    project.destroy
    head :no_content
  end

  private

  def project_params
    params.require(:project).permit(:title, :description, :project_type)
  end
end
