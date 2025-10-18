## [TICKET-040] Implement Context API for Donor/Donation State

**Status:** 📋 Planned
**Priority:** 🟢 Low
**Effort:** L (Large)
**Created:** 2025-10-18
**Dependencies:** TICKET-030 (Multi-page architecture recommended first)

### User Story
As a developer, I want to use React Context API for shared donor and donation state so that I can avoid prop drilling and centralize data management across components.

### Problem Statement
Current state management has issues:
- **Prop drilling**: State passed through multiple component levels
- **Repeated fetching**: Each component fetches its own data
- **No caching**: Refetching same data multiple times
- **Scattered logic**: Data fetching logic duplicated across components

**Code Smell:** Deep prop passing, repeated API calls
**Issue:** App.tsx passes props to DonationList → filters, DonorList → handlers

### Acceptance Criteria
- [ ] Create `DonorContext` for donor state management
- [ ] Create `DonationContext` for donation state management
- [ ] Refactor components to use contexts instead of props
- [ ] Implement context-based data fetching
- [ ] Add loading and error states to contexts
- [ ] All existing functionality works with contexts
- [ ] All existing tests pass (update as needed)
- [ ] Update CLAUDE.md with Context API pattern

### Technical Approach

#### 1. Create DonorContext

```typescript
// src/contexts/DonorContext.tsx
import React, { createContext, useContext, useState, useCallback } from 'react';
import apiClient from '../api/client';

interface Donor {
  id: number;
  name: string;
  email: string;
  discarded_at?: string | null;
}

interface PaginationMeta {
  total_count: number;
  total_pages: number;
  current_page: number;
  per_page: number;
}

interface DonorContextValue {
  donors: Donor[];
  loading: boolean;
  error: string | null;
  paginationMeta: PaginationMeta | null;
  searchQuery: string;
  showArchived: boolean;
  currentPage: number;
  selectedIds: number[];
  fetchDonors: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  setShowArchived: (show: boolean) => void;
  setCurrentPage: (page: number) => void;
  setSelectedIds: (ids: number[]) => void;
  archiveDonor: (id: number) => Promise<void>;
  restoreDonor: (id: number) => Promise<void>;
  refreshDonors: () => Promise<void>;
}

const DonorContext = createContext<DonorContextValue | undefined>(undefined);

export const DonorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [donors, setDonors] = useState<Donor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const fetchDonors = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: Record<string, unknown> = {
        page: currentPage,
        per_page: 10,
      };

      if (searchQuery) {
        params.q = { name_or_email_cont: searchQuery };
      }

      if (showArchived) {
        params.include_discarded = 'true';
      }

      const response = await apiClient.get('/api/donors', { params });
      setDonors(response.data.donors);
      setPaginationMeta(response.data.meta);
    } catch (err) {
      setError('Failed to fetch donors');
      console.error('Failed to fetch donors:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, showArchived]);

  const archiveDonor = useCallback(async (id: number) => {
    try {
      await apiClient.delete(`/api/donors/${id}`);
      await fetchDonors();
    } catch (err) {
      console.error('Failed to archive donor:', err);
      throw err;
    }
  }, [fetchDonors]);

  const restoreDonor = useCallback(async (id: number) => {
    try {
      await apiClient.post(`/api/donors/${id}/restore`);
      await fetchDonors();
    } catch (err) {
      console.error('Failed to restore donor:', err);
      throw err;
    }
  }, [fetchDonors]);

  const refreshDonors = useCallback(() => {
    return fetchDonors();
  }, [fetchDonors]);

  const value: DonorContextValue = {
    donors,
    loading,
    error,
    paginationMeta,
    searchQuery,
    showArchived,
    currentPage,
    selectedIds,
    fetchDonors,
    setSearchQuery,
    setShowArchived,
    setCurrentPage,
    setSelectedIds,
    archiveDonor,
    restoreDonor,
    refreshDonors,
  };

  return <DonorContext.Provider value={value}>{children}</DonorContext.Provider>;
};

export const useDonors = () => {
  const context = useContext(DonorContext);
  if (context === undefined) {
    throw new Error('useDonors must be used within a DonorProvider');
  }
  return context;
};
```

#### 2. Create DonationContext (Similar Pattern)

```typescript
// src/contexts/DonationContext.tsx
// Similar structure to DonorContext
// Manages donation state, fetching, filtering
```

#### 3. Wrap App with Providers

```tsx
// src/App.tsx
import { DonorProvider } from './contexts/DonorContext';
import { DonationProvider } from './contexts/DonationContext';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <BrowserRouter>
          <DonorProvider>
            <DonationProvider>
              <Routes>
                {/* ... routes */}
              </Routes>
            </DonationProvider>
          </DonorProvider>
        </BrowserRouter>
      </LocalizationProvider>
    </ThemeProvider>
  );
}
```

#### 4. Refactor Components to Use Context

**Before (DonorsPage):**
```tsx
const DonorsPage = () => {
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(false);
  // ... lots of state

  const fetchDonors = async () => {
    // ... fetch logic
  };

  return (
    <div>
      <DonorList
        donors={donors}
        onArchive={handleArchive}
        loading={loading}
        // ... many props
      />
    </div>
  );
};
```

**After (DonorsPage):**
```tsx
const DonorsPage = () => {
  const {
    donors,
    loading,
    error,
    fetchDonors,
    archiveDonor,
  } = useDonors();

  useEffect(() => {
    fetchDonors();
  }, [fetchDonors]);

  return (
    <div>
      {loading && <CircularProgress />}
      {error && <Alert severity="error">{error}</Alert>}
      <DonorList />  {/* No props! */}
    </div>
  );
};
```

**DonorList Component:**
```tsx
const DonorList = () => {
  const { donors, archiveDonor, selectedIds, setSelectedIds } = useDonors();

  // Component logic using context directly
  return (
    <Stack spacing={2}>
      {donors.map((donor) => (
        <DonorCard
          key={donor.id}
          donor={donor}
          onArchive={() => archiveDonor(donor.id)}
          selected={selectedIds.includes(donor.id)}
        />
      ))}
    </Stack>
  );
};
```

### Benefits
- **No Prop Drilling**: Components access data directly
- **Centralized State**: Single source of truth
- **Better Performance**: Memoized callbacks reduce re-renders
- **Easier Testing**: Mock context instead of props
- **Cleaner Code**: Components focus on presentation
- **Shared State**: Multiple components access same data

### Testing Strategy

```typescript
// src/contexts/DonorContext.test.tsx
import { renderHook, act, waitFor } from '@testing-library/react';
import { DonorProvider, useDonors } from './DonorContext';
import apiClient from '../api/client';

jest.mock('../api/client');

describe('DonorContext', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <DonorProvider>{children}</DonorProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches donors on fetchDonors call', async () => {
    const mockDonors = [
      { id: 1, name: 'John Doe', email: 'john@example.com' },
    ];

    (apiClient.get as jest.Mock).mockResolvedValue({
      data: {
        donors: mockDonors,
        meta: { total_count: 1, total_pages: 1, current_page: 1, per_page: 10 },
      },
    });

    const { result } = renderHook(() => useDonors(), { wrapper });

    act(() => {
      result.current.fetchDonors();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.donors).toEqual(mockDonors);
  });

  it('handles fetch errors gracefully', async () => {
    (apiClient.get as jest.Mock).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useDonors(), { wrapper });

    act(() => {
      result.current.fetchDonors();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to fetch donors');
  });

  it('archives donor and refreshes list', async () => {
    (apiClient.delete as jest.Mock).mockResolvedValue({});
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { donors: [], meta: {} },
    });

    const { result } = renderHook(() => useDonors(), { wrapper });

    await act(async () => {
      await result.current.archiveDonor(1);
    });

    expect(apiClient.delete).toHaveBeenCalledWith('/api/donors/1');
    expect(apiClient.get).toHaveBeenCalled(); // Refresh called
  });
});
```

### Context Performance Optimization

```typescript
// Optimize re-renders with useMemo
const value: DonorContextValue = useMemo(
  () => ({
    donors,
    loading,
    error,
    paginationMeta,
    searchQuery,
    showArchived,
    currentPage,
    selectedIds,
    fetchDonors,
    setSearchQuery,
    setShowArchived,
    setCurrentPage,
    setSelectedIds,
    archiveDonor,
    restoreDonor,
    refreshDonors,
  }),
  [
    donors,
    loading,
    error,
    paginationMeta,
    searchQuery,
    showArchived,
    currentPage,
    selectedIds,
    fetchDonors,
    archiveDonor,
    restoreDonor,
    refreshDonors,
  ]
);
```

### Files to Create
- `src/contexts/DonorContext.tsx` (NEW)
- `src/contexts/DonationContext.tsx` (NEW)
- `src/contexts/DonorContext.test.tsx` (NEW)
- `src/contexts/DonationContext.test.tsx` (NEW)

### Files to Modify
- `src/App.tsx` (WRAP with providers)
- `src/pages/DonorsPage.tsx` (USE context instead of local state)
- `src/pages/DonationsPage.tsx` (USE context instead of local state)
- `src/components/DonorList.tsx` (USE context)
- `src/components/DonationList.tsx` (USE context)
- `CLAUDE.md` (UPDATE with Context API pattern)

### Alternative: State Management Libraries

**Context API is appropriate for:**
- Medium-sized applications
- Simple state sharing
- Avoid prop drilling

**Consider Redux/Zustand/Jotai if:**
- Very complex state logic
- Need dev tools debugging
- Need middleware (logging, persistence)
- Large team with established patterns

**For this project: Context API is sufficient**

### Migration Strategy

1. **Phase 1**: Create contexts without using them
2. **Phase 2**: Wrap app with providers
3. **Phase 3**: Refactor one page at a time to use context
4. **Phase 4**: Remove old prop-passing code
5. **Phase 5**: Add optimizations (useMemo, useCallback)

### Future Enhancements
- Add context-based caching (React Query pattern)
- Implement optimistic updates
- Add undo/redo functionality
- Add offline support with context persistence
- Add WebSocket integration for real-time updates

### Related Tickets
- TICKET-030: Best implemented after multi-page architecture
- TICKET-032: Can use custom hooks alongside context
- Part of code quality improvement initiative

### Notes
- Context re-renders all consumers when value changes
- Use multiple small contexts instead of one large context
- Memoize context values to prevent unnecessary re-renders
- Consider React Query for more advanced data fetching patterns
- Test context separately from components
