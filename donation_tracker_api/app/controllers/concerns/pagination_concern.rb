module PaginationConcern
  extend ActiveSupport::Concern

  def paginate_collection(collection)
    collection.page(params[:page]).per(params[:per_page] || 25)
  end

  def pagination_meta(paginated_collection)
    {
      total_count: paginated_collection.total_count,
      total_pages: paginated_collection.total_pages,
      current_page: paginated_collection.current_page,
      per_page: paginated_collection.limit_value
    }
  end
end
