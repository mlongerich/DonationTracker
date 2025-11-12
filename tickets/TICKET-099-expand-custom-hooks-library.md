## [TICKET-099] Expand Custom Hooks Library

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Effort:** M (Medium)
**Created:** 2025-11-11
**Dependencies:** None

### User Story
As a developer, I want consistent custom hooks for all entity types so that data fetching logic is reusable and pages remain thin.

### Problem Statement
We have a good foundation with `useChildren`, `useDebouncedValue`, `usePagination`, and `useRansackFilters` hooks, but not all entities have corresponding hooks. This leads to inconsistent patterns across pages.

**Code Smell:** Inconsistent data fetching patterns across pages
**Current State:**
- ✅ ChildrenPage uses `useChildren` hook (clean, consistent)
- ❌ DonorsPage has inline fetch logic
- ❌ DonationsPage has inline fetch logic
- ❌ SponsorshipsPage has inline fetch logic
- ❌ ProjectsPage has inline fetch logic

**Impact:** Duplicated code, harder to maintain, inconsistent error handling

### Acceptance Criteria
- [ ] Create `useDonors` custom hook
- [ ] Create `useDonations` custom hook
- [ ] Create `useSponsorships` custom hook
- [ ] Create `useProjects` custom hook
- [ ] Refactor corresponding pages to use new hooks
- [ ] All hooks follow same API pattern as `useChildren`
- [ ] Comprehensive tests for all hooks
- [ ] All existing page tests pass
- [ ] Update CLAUDE.md with Custom Hooks pattern

### Current Pattern (useChildren - The Gold Standard)

```typescript
// src/hooks/useChildren.ts
export interface FetchChildrenOptions {
  includeSponsorship?: boolean;
  includeDiscarded?: boolean;
  page?: number;
  perPage?: number;
  search?: string;
}

export const useChildren = () => {
  const [children, setChildren] = useState<Child[]>([]);
  const [sponsorships, setSponsorships] = useState<Map<number, Sponsorship[]>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(null);

  const fetchChildren = useCallback(async (options: FetchChildrenOptions = {}) => {
    setLoading(true);
    setError(null);

    try {
      const params: Record<string, any> = {
        page: options.page || 1,
        per_page: options.perPage || 10,
        include_discarded: options.includeDiscarded || false,
        include_sponsorships: options.includeSponsorship || false,
      };

      if (options.search?.trim()) {
        params.q = { name_cont: options.search };
      }

      const response = await apiClient.get('/api/children', { params });
      setChildren(response.data.children);
      setPaginationMeta(response.data.meta);

      if (options.includeSponsorship) {
        const sponsorshipMap = new Map<number, Sponsorship[]>();
        response.data.children.forEach((child: Child) => {
          if (child.sponsorships) {
            sponsorshipMap.set(child.id, child.sponsorships);
          }
        });
        setSponsorships(sponsorshipMap);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch children');
      console.error('Failed to fetch children:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { children, sponsorships, loading, error, paginationMeta, fetchChildren };
};
```

**Usage in ChildrenPage:**
```typescript
const ChildrenPage = () => {
  const [showArchived, setShowArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebouncedValue(searchQuery, 300);
  const { currentPage, handlePageChange, resetToFirstPage } = usePagination();

  const { children, sponsorships, loading, error, paginationMeta, fetchChildren } = useChildren();

  useEffect(() => {
    fetchChildren({
      includeSponsorship: true,
      includeDiscarded: showArchived,
      page: currentPage,
      perPage: 10,
      search: debouncedQuery,
    });
  }, [showArchived, debouncedQuery, currentPage, fetchChildren]);

  // Page is now thin, focused on UI logic only
};
```

### Technical Approach

#### 1. Create useDonors Hook

```typescript
// src/hooks/useDonors.ts
import { useState, useCallback } from 'react';
import apiClient from '../api/client';
import { Donor, PaginationMeta } from '../types';

export interface FetchDonorsOptions {
  includeDiscarded?: boolean;
  page?: number;
  perPage?: number;
  search?: string;
}

export const useDonors = () => {
  const [donors, setDonors] = useState<Donor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(null);

  const fetchDonors = useCallback(async (options: FetchDonorsOptions = {}) => {
    setLoading(true);
    setError(null);

    try {
      const params: Record<string, any> = {
        page: options.page || 1,
        per_page: options.perPage || 10,
        include_discarded: options.includeDiscarded || false,
      };

      if (options.search?.trim()) {
        params.q = { name_or_email_cont: options.search };
      }

      const response = await apiClient.get('/api/donors', { params });
      setDonors(response.data.donors);
      setPaginationMeta(response.data.meta);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch donors');
    } finally {
      setLoading(false);
    }
  }, []);

  const archiveDonor = useCallback(async (id: number) => {
    try {
      await apiClient.post(`/api/donors/${id}/archive`);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.response?.data?.error || 'Failed to archive donor' };
    }
  }, []);

  const restoreDonor = useCallback(async (id: number) => {
    try {
      await apiClient.post(`/api/donors/${id}/restore`);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.response?.data?.error || 'Failed to restore donor' };
    }
  }, []);

  return {
    donors,
    loading,
    error,
    paginationMeta,
    fetchDonors,
    archiveDonor,
    restoreDonor,
  };
};
```

**Usage:**
```typescript
const DonorsPage = () => {
  const [showArchived, setShowArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebouncedValue(searchQuery, 300);
  const { currentPage, handlePageChange } = usePagination();

  const { donors, loading, error, paginationMeta, fetchDonors, archiveDonor, restoreDonor } = useDonors();

  useEffect(() => {
    fetchDonors({
      includeDiscarded: showArchived,
      page: currentPage,
      perPage: 10,
      search: debouncedQuery,
    });
  }, [showArchived, debouncedQuery, currentPage, fetchDonors]);

  // Thin page logic only
};
```

#### 2. Create useDonations Hook

```typescript
// src/hooks/useDonations.ts
export interface FetchDonationsOptions {
  page?: number;
  perPage?: number;
  dateRange?: { startDate: string | null; endDate: string | null };
  donorId?: number | null;
  paymentMethod?: string | null;
}

export const useDonations = () => {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(null);

  const fetchDonations = useCallback(async (options: FetchDonationsOptions = {}) => {
    setLoading(true);
    setError(null);

    try {
      const queryParams: Record<string, unknown> = {};

      if (options.dateRange?.startDate) {
        queryParams['q[date_gteq]'] = options.dateRange.startDate;
      }
      if (options.dateRange?.endDate) {
        queryParams['q[date_lteq]'] = options.dateRange.endDate;
      }
      if (options.donorId) {
        queryParams['q[donor_id_eq]'] = options.donorId;
      }
      if (options.paymentMethod) {
        queryParams['q[payment_method_eq]'] = options.paymentMethod;
      }

      const params: Record<string, unknown> = {
        page: options.page || 1,
        per_page: options.perPage || 10,
        ...queryParams,
      };

      const response = await apiClient.get('/api/donations', { params });
      setDonations(response.data.donations);
      setPaginationMeta(response.data.meta);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch donations');
    } finally {
      setLoading(false);
    }
  }, []);

  return { donations, loading, error, paginationMeta, fetchDonations };
};
```

#### 3. Create useSponsorships Hook

```typescript
// src/hooks/useSponsorships.ts
export interface FetchSponsorshipsOptions {
  page?: number;
  perPage?: number;
  search?: string;
  showEnded?: boolean;
  childId?: number;
}

export const useSponsorships = () => {
  const [sponsorships, setSponsorships] = useState<Sponsorship[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(null);

  const fetchSponsorships = useCallback(async (options: FetchSponsorshipsOptions = {}) => {
    setLoading(true);
    setError(null);

    try {
      const params: any = {
        page: options.page || 1,
        per_page: options.perPage || 25,
      };

      if (options.search?.trim()) {
        params.q = { donor_name_or_child_name_cont: options.search };
      }

      if (!options.showEnded) {
        params.q = { ...params.q, end_date_null: true };
      }

      if (options.childId) {
        params.child_id = options.childId;
      }

      const response = await apiClient.get('/api/sponsorships', { params });
      setSponsorships(response.data.sponsorships);
      setPaginationMeta(response.data.meta);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch sponsorships');
    } finally {
      setLoading(false);
    }
  }, []);

  const endSponsorship = useCallback(async (id: number) => {
    try {
      await apiClient.delete(`/api/sponsorships/${id}`);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.response?.data?.error || 'Failed to end sponsorship' };
    }
  }, []);

  return { sponsorships, loading, error, paginationMeta, fetchSponsorships, endSponsorship };
};
```

#### 4. Create useProjects Hook

```typescript
// src/hooks/useProjects.ts
export interface FetchProjectsOptions {
  includeDiscarded?: boolean;
  page?: number;
  perPage?: number;
}

export const useProjects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(null);

  const fetchProjects = useCallback(async (options: FetchProjectsOptions = {}) => {
    setLoading(true);
    setError(null);

    try {
      const params: Record<string, any> = {
        page: options.page || 1,
        per_page: options.perPage || 10,
        include_discarded: options.includeDiscarded || false,
      };

      const response = await apiClient.get('/api/projects', { params });
      setProjects(response.data.projects);
      setPaginationMeta(response.data.meta);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  }, []);

  return { projects, loading, error, paginationMeta, fetchProjects };
};
```

### Benefits
- **Consistency**: All entities follow same hook pattern
- **Reusability**: Hooks can be used across multiple pages/components
- **Testability**: Hooks are easy to test in isolation
- **Maintainability**: Centralized data fetching logic
- **DRY**: Eliminate duplicated fetch logic across pages
- **Performance**: Proper useCallback usage prevents unnecessary rerenders

### Testing Strategy

```typescript
// src/hooks/useDonors.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDonors } from './useDonors';
import apiClient from '../api/client';

jest.mock('../api/client');

describe('useDonors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches donors successfully', async () => {
    const mockDonors = [
      { id: 1, name: 'John Doe', email: 'john@example.com' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
    ];

    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { donors: mockDonors, meta: { total_pages: 1, current_page: 1 } },
    });

    const { result } = renderHook(() => useDonors());

    expect(result.current.loading).toBe(false);
    expect(result.current.donors).toEqual([]);

    await act(async () => {
      await result.current.fetchDonors({ page: 1, perPage: 10 });
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.donors).toEqual(mockDonors);
      expect(result.current.error).toBeNull();
    });
  });

  it('handles fetch errors', async () => {
    (apiClient.get as jest.Mock).mockRejectedValue({
      response: { data: { error: 'Server error' } },
    });

    const { result } = renderHook(() => useDonors());

    await act(async () => {
      await result.current.fetchDonors();
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Server error');
      expect(result.current.donors).toEqual([]);
    });
  });
});
```

### Files to Create
- `src/hooks/useDonors.ts` (NEW)
- `src/hooks/useDonors.test.ts` (NEW)
- `src/hooks/useDonations.ts` (NEW)
- `src/hooks/useDonations.test.ts` (NEW)
- `src/hooks/useSponsorships.ts` (NEW)
- `src/hooks/useSponsorships.test.ts` (NEW)
- `src/hooks/useProjects.ts` (NEW)
- `src/hooks/useProjects.test.ts` (NEW)

### Files to Modify
- `src/hooks/index.ts` (UPDATE - export new hooks)
- `src/pages/DonorsPage.tsx` (REFACTOR - use useDonors)
- `src/pages/DonationsPage.tsx` (REFACTOR - use useDonations)
- `src/pages/SponsorshipsPage.tsx` (REFACTOR - use useSponsorships)
- `src/pages/ProjectsPage.tsx` (REFACTOR - use useProjects)
- `CLAUDE.md` (UPDATE - document Custom Hooks pattern)

### Migration Checklist
1. [ ] Create useDonors hook with tests
2. [ ] Refactor DonorsPage to use useDonors
3. [ ] Create useDonations hook with tests
4. [ ] Refactor DonationsPage to use useDonations
5. [ ] Create useSponsorships hook with tests
6. [ ] Refactor SponsorshipsPage to use useSponsorships
7. [ ] Create useProjects hook with tests
8. [ ] Refactor ProjectsPage to use useProjects
9. [ ] Run full test suite
10. [ ] Update documentation in CLAUDE.md

### Related Tickets
- Part of CODE_SMELL_ANALYSIS initiative
- Follows pattern established with useChildren (TICKET-066)
- Identified in code smell review on 2025-11-11
- Integrates with TICKET-097 (ESLint exhaustive-deps fixes)

### Notes
- This standardizes data fetching across all entity types
- After this ticket, all pages will have consistent, testable data fetching
- Consider extracting common logic to a base `useEntity` hook if duplication emerges
- Document the hook pattern in CLAUDE.md for future entity types
