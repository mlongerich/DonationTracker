# frozen_string_literal: true

# Provides Ransack filtering helpers for controller actions.
#
# Included in controllers that need search and filter functionality
# via query parameters (e.g., ?q[name_cont]=john).
#
# Methods provided:
# - apply_ransack_filters(scope): Apply Ransack filters from params[:q]
#
# @example Usage in controller
#   class Api::DonorsController < ApplicationController
#     include RansackFilterable
#
#     def index
#       filtered_scope = apply_ransack_filters(Donor.all)
#       render json: { donors: filtered_scope }
#     end
#   end
#
# @see Ransack gem for query syntax
# @see Model.ransackable_attributes for allowed search fields
module RansackFilterable
  extend ActiveSupport::Concern

  def apply_ransack_filters(scope)
    ransack_params = params[:q]
    return scope unless ransack_params.present?

    @ransack_query = scope.ransack(ransack_params)
    @ransack_query.result
  end
end
