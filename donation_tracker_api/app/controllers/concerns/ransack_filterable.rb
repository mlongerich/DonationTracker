module RansackFilterable
  extend ActiveSupport::Concern

  def apply_ransack_filters(scope)
    ransack_params = params[:q]
    return scope unless ransack_params.present?

    @ransack_query = scope.ransack(ransack_params)
    @ransack_query.result
  end
end
