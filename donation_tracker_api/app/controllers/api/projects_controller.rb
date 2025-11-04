class Api::ProjectsController < ApplicationController
  include PaginationConcern
  include RansackFilterable

  def index
    scope = params[:include_discarded] == "true" ? Project.with_discarded : Project.kept
    filtered_scope = apply_ransack_filters(scope)
    projects = paginate_collection(filtered_scope.order(title: :asc))

    render json: {
      projects: CollectionPresenter.new(projects, ProjectPresenter).as_json,
      meta: pagination_meta(projects)
    }
  end

  def show
    project = Project.find(params[:id])
    render json: { project: ProjectPresenter.new(project).as_json }
  end

  def create
    project = Project.new(project_params)
    project.save!  # Raises RecordInvalid if validation fails
    render json: { project: ProjectPresenter.new(project).as_json }, status: :created
  end

  def update
    project = Project.find(params[:id])

    if project.system?
      render json: { error: "Cannot update system projects" }, status: :forbidden
      return
    end

    project.update!(project_params)  # Raises RecordInvalid if validation fails
    render json: { project: ProjectPresenter.new(project).as_json }
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

  def archive
    project = Project.find(params[:id])
    project.discard!  # Raises if fails
    head :no_content
  end

  def restore
    project = Project.with_discarded.find(params[:id])
    project.undiscard

    render json: { project: ProjectPresenter.new(project).as_json }, status: :ok
  end

  private

  def project_params
    params.require(:project).permit(:title, :description, :project_type)
  end
end
