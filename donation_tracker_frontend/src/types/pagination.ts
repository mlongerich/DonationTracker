/**
 * Pagination metadata returned by Kaminari-paginated API endpoints.
 */
export interface PaginationMeta {
  total_count: number;
  total_pages: number;
  current_page: number;
  per_page: number;
}

/**
 * Generic paginated API response structure.
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}
