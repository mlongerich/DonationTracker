## [TICKET-097] Fix ESLint Exhaustive Deps Warnings

**Status:** 🔵 In Progress
**Priority:** 🟡 Medium
**Effort:** S (Small)
**Created:** 2025-11-11
**Dependencies:** None

### User Story
As a developer, I want to fix ESLint exhaustive-deps warnings so that dependency arrays are correctly specified and React hooks work as intended.

### Problem Statement
Multiple pages use `eslint-disable-next-line react-hooks/exhaustive-deps` to suppress warnings about missing dependencies in useEffect hooks. This is a code smell - the proper fix is to wrap callback functions in `useCallback` to make them stable dependencies.

**Code Smell:** Disabling ESLint rules instead of fixing root cause
**Issue:** Multiple pages have `fetchX` functions that aren't stable, causing exhaustive-deps warnings
**Impact:** Potential bugs, infinite loops, or stale closures if dependencies change

### Affected Files

#### 1. DonationsPage.tsx (line 60)
```typescript
useEffect(() => {
  fetchDonations();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [currentPage, dateRange, selectedDonorId, selectedPaymentMethod]);
```

#### 2. SponsorshipsPage.tsx (line 30)
```typescript
useEffect(() => {
  fetchSponsorships();
  // Disable exhaustive-deps: fetchSponsorships is stable but would cause infinite loop if added
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [page, debouncedQuery, showEnded]);
```

#### 3. DonorsPage.tsx
```typescript
useEffect(() => {
  fetchDonors();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [/* dependencies */]);
```

#### 4. ChildrenPage.tsx
```typescript
useEffect(() => {
  fetchChildren({/* ... */});
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [showArchived, debouncedQuery, currentPage, fetchChildren]);
```

**Note:** ChildrenPage is partially correct - it uses `useChildren` hook which returns a stable `fetchChildren` function. Verify if this is already wrapped in useCallback.

### Root Cause
The `fetchX` functions are defined inline in the component body, so they get recreated on every render. This means:
1. They have a new reference each render
2. Adding them to dependency array causes infinite loop
3. Developers disable the ESLint rule instead of fixing the issue

### Acceptance Criteria
- [ ] Wrap all `fetchX` functions in `useCallback`
- [ ] Remove all `eslint-disable-next-line react-hooks/exhaustive-deps` comments
- [ ] Include `fetchX` functions in dependency arrays
- [ ] Verify no infinite loops occur
- [ ] All existing tests pass
- [ ] ESLint passes without warnings

### Technical Approach

#### Pattern: Use useCallback for Fetch Functions

**Before (DonationsPage.tsx):**
```typescript
const DonationsPage = () => {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [dateRange, setDateRange] = useState<{ startDate: string | null; endDate: string | null }>({
    startDate: null,
    endDate: null,
  });
  const [selectedDonorId, setSelectedDonorId] = useState<number | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);

  const { currentPage, paginationMeta, setPaginationMeta, handlePageChange } = usePagination();

  const fetchDonations = async () => {  // ❌ Not wrapped in useCallback
    try {
      const queryParams: Record<string, unknown> = {};

      if (dateRange.startDate) {
        queryParams['q[date_gteq]'] = dateRange.startDate;
      }
      if (dateRange.endDate) {
        queryParams['q[date_lteq]'] = dateRange.endDate;
      }
      if (selectedDonorId) {
        queryParams['q[donor_id_eq]'] = selectedDonorId;
      }
      if (selectedPaymentMethod) {
        queryParams['q[payment_method_eq]'] = selectedPaymentMethod;
      }

      const params: Record<string, unknown> = {
        page: currentPage,
        per_page: 10,
        ...queryParams,
      };

      const response = await apiClient.get('/api/donations', { params });
      setDonations(response.data.donations);
      setPaginationMeta(response.data.meta);
    } catch (error) {
      console.error('Failed to fetch donations:', error);
    }
  };

  useEffect(() => {
    fetchDonations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, dateRange, selectedDonorId, selectedPaymentMethod]);
  // Missing: fetchDonations
};
```

**After (Fixed):**
```typescript
import { useEffect, useState, useCallback } from 'react';  // Add useCallback

const DonationsPage = () => {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [dateRange, setDateRange] = useState<{ startDate: string | null; endDate: string | null }>({
    startDate: null,
    endDate: null,
  });
  const [selectedDonorId, setSelectedDonorId] = useState<number | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);

  const { currentPage, paginationMeta, setPaginationMeta, handlePageChange } = usePagination();

  const fetchDonations = useCallback(async () => {  // ✅ Wrapped in useCallback
    try {
      const queryParams: Record<string, unknown> = {};

      if (dateRange.startDate) {
        queryParams['q[date_gteq]'] = dateRange.startDate;
      }
      if (dateRange.endDate) {
        queryParams['q[date_lteq]'] = dateRange.endDate;
      }
      if (selectedDonorId) {
        queryParams['q[donor_id_eq]'] = selectedDonorId;
      }
      if (selectedPaymentMethod) {
        queryParams['q[payment_method_eq]'] = selectedPaymentMethod;
      }

      const params: Record<string, unknown> = {
        page: currentPage,
        per_page: 10,
        ...queryParams,
      };

      const response = await apiClient.get('/api/donations', { params });
      setDonations(response.data.donations);
      setPaginationMeta(response.data.meta);
    } catch (error) {
      console.error('Failed to fetch donations:', error);
    }
  }, [currentPage, dateRange, selectedDonorId, selectedPaymentMethod, setPaginationMeta]);
  // ✅ Include all dependencies used inside the callback

  useEffect(() => {
    fetchDonations();
  }, [fetchDonations]);  // ✅ Now safe to include - stable reference
  // ✅ No eslint-disable needed!
};
```

#### Fix for SponsorshipsPage

```typescript
const SponsorshipsPage: React.FC = () => {
  const [sponsorships, setSponsorships] = useState<Sponsorship[]>([]);
  const [page] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebouncedValue(searchQuery, 300);
  const [showEnded, setShowEnded] = useState(false);

  const fetchSponsorships = useCallback(async () => {  // ✅ Add useCallback
    const params: any = { page, per_page: 25 };

    if (debouncedQuery.trim()) {
      params.q = { ...params.q, donor_name_or_child_name_cont: debouncedQuery };
    }
    if (!showEnded) {
      params.q = { ...params.q, end_date_null: true };
    }

    const response = await apiClient.get('/api/sponsorships', { params });
    setSponsorships(response.data.sponsorships);
  }, [page, debouncedQuery, showEnded]);  // ✅ Specify dependencies

  useEffect(() => {
    fetchSponsorships();
  }, [fetchSponsorships]);  // ✅ Safe to include
};
```

#### Fix for DonorsPage

```typescript
const DonorsPage = () => {
  const [donors, setDonors] = useState<Donor[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebouncedValue(searchQuery, 300);
  const { currentPage, paginationMeta, setPaginationMeta, handlePageChange, resetToFirstPage } = usePagination();

  const fetchDonors = useCallback(async () => {  // ✅ Add useCallback
    const params: any = {
      page: currentPage,
      per_page: 10,
      include_discarded: showArchived,
    };

    if (debouncedQuery.trim()) {
      params.q = { name_or_email_cont: debouncedQuery };
    }

    const response = await apiClient.get('/api/donors', { params });
    setDonors(response.data.donors);
    setPaginationMeta(response.data.meta);
  }, [currentPage, showArchived, debouncedQuery, setPaginationMeta]);  // ✅ Specify dependencies

  useEffect(() => {
    fetchDonors();
  }, [fetchDonors]);  // ✅ Safe to include
};
```

#### Special Case: ChildrenPage (using custom hook)

```typescript
// Check if useChildren already returns a stable fetchChildren
// If not, fix it in the hook

// src/hooks/useChildren.ts
export const useChildren = () => {
  const [children, setChildren] = useState<Child[]>([]);
  const [sponsorships, setSponsorships] = useState<Map<number, Sponsorship[]>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(null);

  const fetchChildren = useCallback(async (options: FetchChildrenOptions = {}) => {  // ✅ Already wrapped?
    // ... fetch logic ...
  }, []);  // ✅ If no dependencies, empty array

  return { children, sponsorships, loading, error, paginationMeta, fetchChildren };
};
```

**Verify:** If `useChildren` already wraps `fetchChildren` in useCallback, the eslint-disable in ChildrenPage may already be unnecessary. Test and remove if safe.

### Benefits
- **Correctness**: Dependencies properly tracked, avoiding stale closures
- **No infinite loops**: useCallback prevents function recreation on every render
- **ESLint compliance**: No need to disable linting rules
- **Best Practices**: Follows React hooks best practices
- **Maintainability**: Future developers won't wonder why rules are disabled

### Testing Strategy

```bash
# 1. Run ESLint
npm run lint

# 2. Verify no exhaustive-deps warnings
npm run lint -- --quiet

# 3. Run all tests
npm test

# 4. Manual verification
# - Open each page in browser
# - Verify no infinite loops (check Network tab)
# - Verify filtering still works correctly
# - Verify pagination works
```

### Files to Modify
- `src/pages/DonationsPage.tsx` (ADD useCallback, REMOVE eslint-disable)
- `src/pages/SponsorshipsPage.tsx` (ADD useCallback, REMOVE eslint-disable)
- `src/pages/DonorsPage.tsx` (ADD useCallback, REMOVE eslint-disable)
- `src/pages/ChildrenPage.tsx` (VERIFY if needed, possibly REMOVE eslint-disable)
- `src/hooks/useChildren.ts` (VERIFY fetchChildren is wrapped in useCallback)

### Checklist
1. [ ] Import useCallback in each affected file
2. [ ] Wrap fetchX functions in useCallback
3. [ ] Specify correct dependency arrays for useCallback
4. [ ] Update useEffect to include fetchX in dependencies
5. [ ] Remove eslint-disable comments
6. [ ] Run ESLint - verify no warnings
7. [ ] Test each page - verify no infinite loops
8. [ ] Run full test suite

### Common Pitfalls

**Pitfall 1: Including setState functions in dependencies**
```typescript
// ❌ Wrong - setState functions don't need to be in dependencies
const fetchData = useCallback(async () => {
  const response = await api.get('/data');
  setData(response.data);
}, [setData]);  // Unnecessary

// ✅ Correct - setState functions are stable, don't include
const fetchData = useCallback(async () => {
  const response = await api.get('/data');
  setData(response.data);
}, []);
```

**Pitfall 2: Object/array dependencies that change every render**
```typescript
// ❌ Wrong - dateRange is a new object every render
const [dateRange, setDateRange] = useState({ start: null, end: null });

const fetchData = useCallback(async () => {
  // uses dateRange
}, [dateRange]);  // Causes infinite loop!

// ✅ Correct - destructure primitive values
const fetchData = useCallback(async () => {
  // uses dateRange.start and dateRange.end
}, [dateRange.start, dateRange.end]);  // Only reruns when primitives change
```

### Related Tickets
- Part of CODE_SMELL_ANALYSIS initiative
- Follows React hooks best practices
- Identified in code smell review on 2025-11-11

### Notes
- Quick win - improves code quality and removes tech debt
- After this fix, run `grep -r "eslint-disable-next-line react-hooks/exhaustive-deps" src/pages/` to ensure all are removed
- Consider adding ESLint rule to error (not warn) on exhaustive-deps in future
- This pattern should be documented in CLAUDE.md for future reference
