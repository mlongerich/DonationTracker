import { useState, useCallback } from 'react';

export interface PaginationMeta {
  total_count: number;
  total_pages: number;
  current_page: number;
  per_page: number;
}

export interface UsePaginationReturn {
  currentPage: number;
  setCurrentPage: (page: number) => void;
  paginationMeta: PaginationMeta | null;
  setPaginationMeta: (meta: PaginationMeta) => void;
  handlePageChange: (_event: React.ChangeEvent<unknown>, page: number) => void;
  resetToFirstPage: () => void;
}

/**
 * Manages pagination state and provides helper functions.
 *
 * @param initialPage - Initial page number (default: 1)
 * @returns Pagination state and handlers
 */
export function usePagination(initialPage: number = 1): UsePaginationReturn {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(
    null
  );

  const handlePageChange = useCallback(
    (_event: React.ChangeEvent<unknown>, page: number) => {
      setCurrentPage(page);
    },
    []
  );

  const resetToFirstPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  return {
    currentPage,
    setCurrentPage,
    paginationMeta,
    setPaginationMeta,
    handlePageChange,
    resetToFirstPage,
  };
}
