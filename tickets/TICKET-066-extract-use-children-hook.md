## [TICKET-062] Extract useChildren Custom Hook

**Status:** 📋 Planned
**Priority:** 🔴 High
**Effort:** M (Medium - 2-3 hours)
**Created:** 2025-10-31
**Dependencies:** None

### User Story
As a developer, I want a reusable custom hook for fetching children data so that I don't have to duplicate 100+ lines of data fetching logic across handler functions.

### Problem Statement

**Critical Code Smell: Severe DRY Violation**

`ChildrenPage.tsx` has **7 identical data fetching blocks** (100+ lines duplicated):

```typescript
// This pattern appears in lines: 27, 45, 53, 70, 92, 122, 142
const params: { include_sponsorships: boolean; include_discarded?: string } = {
  include_sponsorships: true
};
if (showArchived) {
  params.include_discarded = 'true';
}
const response = await apiClient.get('/api/children', { params });
setChildren(response.data.children);

// Sponsorship map rebuilding (15 lines duplicated 5x)
const sponsorshipMap = new Map<number, Sponsorship[]>();
response.data.children.forEach((child: Child & { sponsorships?: Sponsorship[] }) => {
  if (child.sponsorships) {
    sponsorshipMap.set(child.id, child.sponsorships);
  }
});
setSponsorships(sponsorshipMap);
```

**Impact:**
- 100+ lines of duplicated code in single file
- Changes must be made in 7 places (error-prone)
- No consistent error handling
- No loading states
- Violates DRY principle severely

**Pattern Drift:**
- ✅ `usePagination` and `useDebouncedValue` hooks exist (CLAUDE.md pattern)
- ❌ No `useResource` pattern for data fetching
- ✅ DonorsPage, DonationsPage don't have this issue (simpler data models)

### Acceptance Criteria

#### Backend (No Changes)
- [ ] No backend changes required (API already supports all features)

#### Frontend Hook
- [ ] Create `hooks/useChildren.ts` custom hook
- [ ] Hook manages: `children`, `sponsorships`, `loading`, `error` state
- [ ] `fetchChildren()` method accepts options: `includeSponsorship`, `includeDiscarded`
- [ ] Automatically builds sponsorship map from nested data
- [ ] Returns `refetch` alias for `fetchChildren`
- [ ] Loading states managed internally
- [ ] Error handling with user-friendly messages

#### Refactor ChildrenPage
- [ ] Replace 7 data fetching blocks with single `useChildren()` hook
- [ ] All handlers call `fetchChildren()` with appropriate options
- [ ] Remove duplicated sponsorship map building logic
- [ ] Add loading indicator (use `loading` state from hook)
- [ ] Add error display (use `error` state from hook)

#### Testing
- [ ] Jest tests for `useChildren` hook (8+ tests)
  - Fetches children successfully
  - Builds sponsorship map correctly
  - Handles `includeSponsorship` option
  - Handles `includeDiscarded` option
  - Sets loading states correctly
  - Handles API errors gracefully
  - Refetch function works
  - Multiple calls don't race
- [ ] Update ChildrenPage tests to use mocked hook
- [ ] All existing E2E tests pass unchanged

### Technical Approach

#### 1. Create useChildren Hook

```typescript
// src/hooks/useChildren.ts
import { useState, useCallback } from 'react';
import apiClient from '../api/client';
import { Child, Sponsorship } from '../types';

interface UseChildrenOptions {
  includeSponsorship?: boolean;
  includeDiscarded?: boolean;
}

interface UseChildrenReturn {
  children: Child[];
  sponsorships: Map<number, Sponsorship[]>;
  loading: boolean;
  error: string | null;
  fetchChildren: (options?: UseChildrenOptions) => Promise<void>;
  refetch: (options?: UseChildrenOptions) => Promise<void>;
}

export const useChildren = (): UseChildrenReturn => {
  const [children, setChildren] = useState<Child[]>([]);
  const [sponsorships, setSponsorships] = useState<Map<number, Sponsorship[]>>(
    new Map()
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChildren = useCallback(async (options: UseChildrenOptions = {}) => {
    setLoading(true);
    setError(null);

    try {
      const params: any = {};
      if (options.includeSponsorship) {
        params.include_sponsorships = true;
      }
      if (options.includeDiscarded) {
        params.include_discarded = 'true';
      }

      const response = await apiClient.get('/api/children', { params });
      setChildren(response.data.children);

      // Build sponsorship map
      const sponsorshipMap = new Map<number, Sponsorship[]>();
      response.data.children.forEach(
        (child: Child & { sponsorships?: Sponsorship[] }) => {
          if (child.sponsorships) {
            sponsorshipMap.set(child.id, child.sponsorships);
          }
        }
      );
      setSponsorships(sponsorshipMap);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error || 'Failed to fetch children';
      setError(errorMessage);
      console.error('Failed to fetch children:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    children,
    sponsorships,
    loading,
    error,
    fetchChildren,
    refetch: fetchChildren, // Alias for consistency
  };
};
```

#### 2. Refactor ChildrenPage

**Before (167 lines):**
```typescript
const ChildrenPage = () => {
  const [children, setChildren] = useState<Child[]>([]);
  const [sponsorships, setSponsorships] = useState<Map<number, Sponsorship[]>>(new Map());

  useEffect(() => {
    const loadChildren = async () => {
      const params = { include_sponsorships: true };
      if (showArchived) params.include_discarded = 'true';
      const response = await apiClient.get('/api/children', { params });
      setChildren(response.data.children);
      // 15 lines of sponsorship map building...
    };
    loadChildren();
  }, [showArchived]);

  const handleCreate = async (data: ChildFormData) => {
    await apiClient.post('/api/children', { child: data });
    // Duplicate fetching logic (20 lines)
  };

  const handleArchive = async (id: number) => {
    await apiClient.post(`/api/children/${id}/archive`);
    // Duplicate fetching logic (20 lines)
  };
  // ... 5 more handlers with duplicate logic
};
```

**After (67 lines - 100 lines removed!):**
```typescript
import { useChildren } from '../hooks';

const ChildrenPage = () => {
  const { children, sponsorships, loading, error, fetchChildren } = useChildren();
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    fetchChildren({ includeSponsorship: true, includeDiscarded: showArchived });
  }, [showArchived, fetchChildren]);

  const handleCreate = async (data: ChildFormData) => {
    await apiClient.post('/api/children', { child: data });
    fetchChildren({ includeSponsorship: true, includeDiscarded: showArchived });
  };

  const handleArchive = async (id: number) => {
    try {
      await apiClient.post(`/api/children/${id}/archive`);
      fetchChildren({ includeSponsorship: true, includeDiscarded: showArchived });
      setError(null);
    } catch (err: any) {
      if (err.response?.status === 422) {
        setError(err.response.data.errors?.join(', ') || 'Failed to archive child');
      }
    }
  };

  // All other handlers simplified to single line: fetchChildren(...)

  return (
    <Box>
      {loading && <CircularProgress />}
      {error && <Alert severity="error">{error}</Alert>}
      <ChildList children={children} sponsorships={sponsorships} ... />
    </Box>
  );
};
```

#### 3. Add Loading & Error UI

```typescript
// Add to ChildrenPage return
<Box>
  <Typography variant="h4">Children Management</Typography>

  {error && (
    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
      {error}
    </Alert>
  )}

  {loading && (
    <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
      <CircularProgress />
    </Box>
  )}

  {!loading && (
    <>
      <ChildForm ... />
      <ChildList children={children} sponsorships={sponsorships} ... />
    </>
  )}
</Box>
```

### Testing Strategy

#### Hook Tests (8 tests)

```typescript
// src/hooks/useChildren.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useChildren } from './useChildren';
import apiClient from '../api/client';

jest.mock('../api/client');

describe('useChildren', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches children successfully', async () => {
    const mockChildren = [{ id: 1, name: 'Maria' }];
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { children: mockChildren },
    });

    const { result } = renderHook(() => useChildren());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    result.current.fetchChildren();

    await waitFor(() => {
      expect(result.current.children).toEqual(mockChildren);
      expect(result.current.loading).toBe(false);
    });
  });

  it('builds sponsorship map from nested data', async () => {
    const mockChildren = [
      {
        id: 1,
        name: 'Maria',
        sponsorships: [
          { id: 10, donor_id: 5, child_id: 1, monthly_amount: '50' },
        ],
      },
    ];
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { children: mockChildren },
    });

    const { result } = renderHook(() => useChildren());
    result.current.fetchChildren({ includeSponsorship: true });

    await waitFor(() => {
      const sponsorshipsForChild = result.current.sponsorships.get(1);
      expect(sponsorshipsForChild).toHaveLength(1);
      expect(sponsorshipsForChild![0].id).toBe(10);
    });
  });

  it('includes sponsorships when option is true', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { children: [] },
    });

    const { result } = renderHook(() => useChildren());
    result.current.fetchChildren({ includeSponsorship: true });

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/api/children', {
        params: { include_sponsorships: true },
      });
    });
  });

  it('includes discarded when option is true', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { children: [] },
    });

    const { result } = renderHook(() => useChildren());
    result.current.fetchChildren({ includeDiscarded: true });

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/api/children', {
        params: { include_discarded: 'true' },
      });
    });
  });

  it('sets loading state correctly', async () => {
    (apiClient.get as jest.Mock).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ data: { children: [] } }), 100))
    );

    const { result } = renderHook(() => useChildren());

    expect(result.current.loading).toBe(false);

    result.current.fetchChildren();

    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('handles API errors gracefully', async () => {
    (apiClient.get as jest.Mock).mockRejectedValue({
      response: { data: { error: 'Server error' } },
    });

    const { result } = renderHook(() => useChildren());
    result.current.fetchChildren();

    await waitFor(() => {
      expect(result.current.error).toBe('Server error');
      expect(result.current.loading).toBe(false);
    });
  });

  it('provides refetch alias', () => {
    const { result } = renderHook(() => useChildren());
    expect(result.current.refetch).toBe(result.current.fetchChildren);
  });

  it('clears error on successful fetch', async () => {
    (apiClient.get as jest.Mock)
      .mockRejectedValueOnce({ response: { data: { error: 'Error' } } })
      .mockResolvedValueOnce({ data: { children: [] } });

    const { result } = renderHook(() => useChildren());

    result.current.fetchChildren();
    await waitFor(() => expect(result.current.error).toBe('Error'));

    result.current.fetchChildren();
    await waitFor(() => expect(result.current.error).toBe(null));
  });
});
```

### Benefits

- ✅ **DRY**: 100+ lines removed from ChildrenPage
- ✅ **Maintainability**: Single source of truth for children fetching
- ✅ **Consistency**: All handlers use same logic
- ✅ **Error Handling**: Centralized, user-friendly messages
- ✅ **Loading States**: Built-in, no manual management
- ✅ **Testability**: Hook tested independently
- ✅ **Reusability**: Can be used in other components if needed
- ✅ **Pattern Consistency**: Follows existing `usePagination` pattern

### Files to Create
- `src/hooks/useChildren.ts` (NEW - 70 lines)
- `src/hooks/useChildren.test.ts` (NEW - 120 lines, 8 tests)

### Files to Modify
- `src/hooks/index.ts` (ADD export: `export { useChildren } from './useChildren';`)
- `src/pages/ChildrenPage.tsx` (REFACTOR - remove 100 lines, add hook usage)
- `src/pages/ChildrenPage.test.tsx` (UPDATE - mock useChildren hook)

### Comparison: Before vs After

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Lines in ChildrenPage.tsx | 234 | ~130 | **-100 lines (-43%)** |
| Data fetching blocks | 7 | 1 | **-6 duplicates** |
| Error handling locations | 7 | 1 (in hook) | **Centralized** |
| Loading state management | None | Built-in | **+Feature** |
| Test complexity | High (7 paths) | Low (1 path) | **Simpler** |

### Related Tickets
- ✅ TICKET-032: Custom Hooks Library (established pattern)
- 📋 TICKET-050: Children Page UI Standardization (uses this hook)
- Part of code quality improvement initiative (CODE_SMELL_ANALYSIS.md)

### Notes
- This is the #1 critical code smell identified in the analysis
- No breaking changes - purely internal refactoring
- Hook can be extended with pagination/search in future
- Follows React Hooks best practices (useCallback, dependency arrays)
- Error boundary (TICKET-036) will catch hook errors if implemented

---

**Estimated Time:** 2-3 hours
- Hook creation: 1 hour
- Hook tests: 1 hour
- ChildrenPage refactoring: 30 minutes
- Testing & verification: 30 minutes
