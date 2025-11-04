import { useState, useCallback } from 'react';

export type RansackFilter = Record<string, string | number>;

export interface UseRansackFiltersReturn {
  filters: RansackFilter;
  setFilter: (key: string, value: string | number | null) => void;
  clearFilters: () => void;
  buildQueryParams: () => { q: RansackFilter } | {};
}

/**
 * Manages Ransack filter state for API queries.
 *
 * @returns Filter state and manipulation functions
 */
export function useRansackFilters(): UseRansackFiltersReturn {
  const [filters, setFilters] = useState<RansackFilter>({});

  const setFilter = useCallback(
    (key: string, value: string | number | null) => {
      setFilters((prev) => {
        if (value === null || value === '') {
          const { [key]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [key]: value };
      });
    },
    []
  );

  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  const buildQueryParams = useCallback(() => {
    if (Object.keys(filters).length === 0) {
      return {};
    }
    return { q: filters };
  }, [filters]);

  return {
    filters,
    setFilter,
    clearFilters,
    buildQueryParams,
  };
}
