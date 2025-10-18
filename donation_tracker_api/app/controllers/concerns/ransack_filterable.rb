module RansackFilterable
  extend ActiveSupport::Concern

  def apply_ransack_filters(scope)
    return scope unless params[:q].present?

    @q = scope.ransack(params[:q])
    @q.result
  end
end
