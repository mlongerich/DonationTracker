## [TICKET-032] Create Custom Hooks Library

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Effort:** M (Medium)
**Created:** 2025-10-18
**Dependencies:** None

### User Story
As a developer, I want to extract repeated React patterns into custom hooks so that I can reduce code duplication, improve testability, and follow React best practices.

### Problem Statement
Several common patterns are duplicated across components:
1. **Debounce logic** - Duplicated in `App.tsx:70-78`, `DonationList.tsx:63-87`, `DonationForm.tsx:30-54`
2. **Pagination state** - Repeated in multiple components managing pagination
3. **Ransack filters** - Query building logic scattered across components

**Code Smell:** Logic duplication, missed abstraction opportunities
**Issue:** Changes to common patterns require updates in multiple files

### Acceptance Criteria
- [ ] Create `src/hooks/` directory for custom hooks
- [ ] Implement `useDebouncedValue` hook with configurable delay
- [ ] Implement `usePagination` hook for pagination state management
- [ ] Implement `useRansackFilters` hook for query building
- [ ] Refactor `App.tsx` to use new hooks
- [ ] Refactor `DonationList.tsx` to use new hooks
- [ ] Refactor `DonationForm.tsx` to use new hooks (if applicable)
- [ ] Add comprehensive hook tests
- [ ] All existing tests pass
- [ ] Update CLAUDE.md with custom hooks pattern

### Technical Approach

#### 1. Create useDebouncedValue Hook

```typescript
// src/hooks/useDebouncedValue.ts
import { useState, useEffect } from 'react';

/**
 * Debounces a value by delaying updates until after a specified delay.
 *
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 300ms)
 * @returns The debounced value
 *
 * @example
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearchTerm = useDebouncedValue(searchTerm, 500);
 *
 * useEffect(() => {
 *   // API call with debouncedSearchTerm
 * }, [debouncedSearchTerm]);
 */
export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

#### 2. Create usePagination Hook

```typescript
// src/hooks/usePagination.ts
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
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(null);

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
```

#### 3. Create useRansackFilters Hook

```typescript
// src/hooks/useRansackFilters.ts
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
 *
 * @example
 * const { filters, setFilter, buildQueryParams } = useRansackFilters();
 *
 * // Set a filter
 * setFilter('name_or_email_cont', 'John');
 *
 * // Build query params for API call
 * const params = buildQueryParams(); // { q: { name_or_email_cont: 'John' } }
 */
export function useRansackFilters(): UseRansackFiltersReturn {
  const [filters, setFilters] = useState<RansackFilter>({});

  const setFilter = useCallback((key: string, value: string | number | null) => {
    setFilters((prev) => {
      if (value === null || value === '') {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: value };
    });
  }, []);

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
```

#### 4. Refactor App.tsx

```tsx
// src/App.tsx (using new hooks)
import { useDebouncedValue } from './hooks/useDebouncedValue';
import { usePagination } from './hooks/usePagination';
import { useRansackFilters } from './hooks/useRansackFilters';

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebouncedValue(searchQuery, 300);

  const {
    currentPage,
    paginationMeta,
    setPaginationMeta,
    handlePageChange,
    resetToFirstPage,
  } = usePagination();

  const { setFilter, buildQueryParams, clearFilters } = useRansackFilters();

  // Effect triggers when debounced value changes
  useEffect(() => {
    resetToFirstPage(); // Reset to page 1 when search changes
  }, [debouncedQuery, resetToFirstPage]);

  const fetchDonors = async () => {
    try {
      const params: Record<string, unknown> = {
        page: currentPage,
        per_page: 10,
        ...buildQueryParams(),
      };

      if (showArchived) {
        params.include_discarded = 'true';
      }

      const response = await apiClient.get('/api/donors', { params });
      setDonors(response.data.donors);
      setPaginationMeta(response.data.meta);
    } catch (error) {
      console.error('Failed to fetch donors:', error);
    }
  };

  // ... rest of component
}
```

### Benefits
- **DRY**: Eliminate duplicated logic across components
- **Testability**: Hooks can be tested in isolation
- **Reusability**: Same hooks usable across different features
- **Maintainability**: Logic updates in one place
- **React Best Practice**: Custom hooks are idiomatic React
- **Type Safety**: Full TypeScript support with proper types
- **Documentation**: JSDoc comments for IntelliSense

### Testing Strategy

```typescript
// src/hooks/useDebouncedValue.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useDebouncedValue } from './useDebouncedValue';

describe('useDebouncedValue', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebouncedValue('test', 300));
    expect(result.current).toBe('test');
  });

  it('debounces value changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: 'initial' } }
    );

    expect(result.current).toBe('initial');

    // Change value
    rerender({ value: 'updated' });

    // Value should not change immediately
    expect(result.current).toBe('initial');

    // Fast-forward time
    jest.advanceTimersByTime(300);

    // Now value should update
    waitFor(() => {
      expect(result.current).toBe('updated');
    });
  });

  it('cancels pending debounce on unmount', () => {
    const { unmount } = renderHook(() => useDebouncedValue('test', 300));

    unmount();

    // Should not throw error
    jest.advanceTimersByTime(300);
  });
});

// src/hooks/usePagination.test.ts
import { renderHook, act } from '@testing-library/react';
import { usePagination } from './usePagination';

describe('usePagination', () => {
  it('initializes with default page 1', () => {
    const { result } = renderHook(() => usePagination());
    expect(result.current.currentPage).toBe(1);
  });

  it('handles page change', () => {
    const { result } = renderHook(() => usePagination());

    act(() => {
      result.current.handlePageChange({} as any, 3);
    });

    expect(result.current.currentPage).toBe(3);
  });

  it('resets to first page', () => {
    const { result } = renderHook(() => usePagination());

    act(() => {
      result.current.setCurrentPage(5);
    });

    expect(result.current.currentPage).toBe(5);

    act(() => {
      result.current.resetToFirstPage();
    });

    expect(result.current.currentPage).toBe(1);
  });
});

// src/hooks/useRansackFilters.test.ts
import { renderHook, act } from '@testing-library/react';
import { useRansackFilters } from './useRansackFilters';

describe('useRansackFilters', () => {
  it('initializes with empty filters', () => {
    const { result } = renderHook(() => useRansackFilters());
    expect(result.current.filters).toEqual({});
  });

  it('sets a filter', () => {
    const { result } = renderHook(() => useRansackFilters());

    act(() => {
      result.current.setFilter('name_cont', 'John');
    });

    expect(result.current.filters).toEqual({ name_cont: 'John' });
  });

  it('removes filter when value is null', () => {
    const { result } = renderHook(() => useRansackFilters());

    act(() => {
      result.current.setFilter('name_cont', 'John');
      result.current.setFilter('name_cont', null);
    });

    expect(result.current.filters).toEqual({});
  });

  it('builds query params correctly', () => {
    const { result } = renderHook(() => useRansackFilters());

    act(() => {
      result.current.setFilter('name_cont', 'John');
      result.current.setFilter('email_cont', 'test@example.com');
    });

    const params = result.current.buildQueryParams();
    expect(params).toEqual({
      q: {
        name_cont: 'John',
        email_cont: 'test@example.com',
      },
    });
  });

  it('returns empty object when no filters', () => {
    const { result } = renderHook(() => useRansackFilters());
    const params = result.current.buildQueryParams();
    expect(params).toEqual({});
  });
});
```

### Files to Create
- `src/hooks/useDebouncedValue.ts` (NEW)
- `src/hooks/usePagination.ts` (NEW)
- `src/hooks/useRansackFilters.ts` (NEW)
- `src/hooks/index.ts` (NEW - barrel export)
- `src/hooks/useDebouncedValue.test.ts` (NEW)
- `src/hooks/usePagination.test.ts` (NEW)
- `src/hooks/useRansackFilters.test.ts` (NEW)

### Files to Modify
- `src/App.tsx` (REFACTOR)
- `src/components/DonationList.tsx` (REFACTOR)
- `src/components/DonationForm.tsx` (REFACTOR)
- `CLAUDE.md` (UPDATE - add custom hooks pattern)

### Barrel Export Pattern

```typescript
// src/hooks/index.ts
export { useDebouncedValue } from './useDebouncedValue';
export { usePagination } from './usePagination';
export type { PaginationMeta, UsePaginationReturn } from './usePagination';
export { useRansackFilters } from './useRansackFilters';
export type { RansackFilter, UseRansackFiltersReturn } from './useRansackFilters';
```

### Future Hook Ideas
- `useApiRequest` - Generic API call hook with loading/error states
- `useDonorSearch` - Encapsulate donor search logic
- `useLocalStorage` - Persist state to localStorage
- `useMediaQuery` - Responsive design helper
- `useDebounce` (callback version) - Debounce function calls

### Related Tickets
- TICKET-031: Can use `useDebouncedValue` in `DonorAutocomplete`
- Part of code quality improvement initiative

### Notes
- Custom hooks must start with "use" prefix (React convention)
- Hooks can call other hooks
- Test hooks using `@testing-library/react-hooks` (now part of main library)
- Add JSDoc comments for better IDE support
- Consider adding to Storybook documentation if implemented
