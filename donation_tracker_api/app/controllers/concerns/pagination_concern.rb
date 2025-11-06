# frozen_string_literal: true

# Provides Kaminari pagination helpers for controller actions.
#
# Included in controllers that need paginated collection responses
# with metadata (total_count, total_pages, current_page, per_page).
#
# Methods provided:
# - paginate_collection(collection): Apply Kaminari pagination (default 25/page)
# - pagination_meta(collection): Generate pagination metadata hash
#
# @example Usage in controller
#   class Api::DonorsController < ApplicationController
#     include PaginationConcern
#
#     def index
#       donors = paginate_collection(Donor.all)
#       render json: { donors: donors, meta: pagination_meta(donors) }
#     end
#   end
#
# @see Kaminari gem for pagination implementation
module PaginationConcern
  extend ActiveSupport::Concern

  def paginate_collection(collection)
    collection.page(params[:page]).per(params[:per_page] || 25)
  end

  def pagination_meta(paginated_collection)
    PaginationConcern.build_meta(paginated_collection)
  end

  def self.build_meta(paginated_collection)
    {
      total_count: paginated_collection.total_count,
      total_pages: paginated_collection.total_pages,
      current_page: paginated_collection.current_page,
      per_page: paginated_collection.limit_value
    }
  end
end
