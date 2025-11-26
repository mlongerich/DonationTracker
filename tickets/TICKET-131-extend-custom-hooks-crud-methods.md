## [TICKET-131] Extend Custom Hooks with CRUD Methods

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Effort:** M (Medium - 3-4 hours)
**Created:** 2025-11-26
**Dependencies:** None
**Identified By:** CODE_SMELL_ANALYSIS (2025-11-26)

### User Story
As a developer, I want all entity CRUD operations to be centralized in custom hooks so that the codebase is DRY, consistent, and easier to maintain.

### Problem Statement

**Code Smell Identified:** Direct API calls in page components instead of using custom hooks.

**Current State:**
- Custom hooks exist (useDonors, useChildren, useProjects) but only handle fetch operations
- Page components make direct `apiClient.get/post/put/patch/delete` calls for CRUD
- Inconsistent pattern: some operations in hooks, some in pages
- Violates DRY principle (API calls scattered across pages)

**Files Affected:**
1. **DonorsPage.tsx** (lines 72-73, 80-81)
   - Direct `apiClient.patch` for update
   - Direct `apiClient.post` for create
   - Uses `useDonors` hook only for fetch/archive/restore

2. **ChildrenPage.tsx** (lines 66, 73, 83, 89, 104)
   - Direct `apiClient.post` for create
   - Direct `apiClient.put` for update
   - Direct `apiClient.delete` for delete
   - Direct `apiClient.post` for archive
   - Direct `apiClient.post` for restore
   - Uses `useChildren` hook only for fetch

3. **ProjectsPage.tsx** (lines 11, 68, 88)
   - Uses imported helper functions (`createProject`, `updateProject`, `deleteProject`)
   - Direct `apiClient.post` for archive
   - Direct `apiClient.post` for restore
   - Uses `useProjects` hook only for fetch

**Desired Pattern:**
All CRUD operations in custom hooks (consistent with useDonations, useSponsorships).

### Acceptance Criteria

#### useDonors Hook Extension
- [ ] Add `createDonor(data: DonorFormData): Promise<Donor>` method
- [ ] Add `updateDonor(id: number, data: DonorFormData): Promise<Donor>` method
- [ ] Return methods in hook return object
- [ ] Methods handle errors consistently (extract error messages)
- [ ] Update DonorsPage to use new hook methods
- [ ] Remove direct `apiClient.patch/post` calls from DonorsPage

#### useChildren Hook Extension
- [ ] Add `createChild(data: ChildFormData): Promise<Child>` method
- [ ] Add `updateChild(id: number, data: ChildFormData): Promise<Child>` method
- [ ] Add `deleteChild(id: number): Promise<void>` method
- [ ] Add `archiveChild(id: number): Promise<void>` method
- [ ] Add `restoreChild(id: number): Promise<void>` method
- [ ] Return methods in hook return object
- [ ] Methods handle errors consistently
- [ ] Update ChildrenPage to use new hook methods
- [ ] Remove all direct `apiClient` calls from ChildrenPage

#### useProjects Hook Extension
- [ ] Add `createProject(data: ProjectFormData): Promise<Project>` method
- [ ] Add `updateProject(id: number, data: ProjectFormData): Promise<Project>` method
- [ ] Add `deleteProject(id: number): Promise<void>` method
- [ ] Add `archiveProject(id: number): Promise<void>` method
- [ ] Add `restoreProject(id: number): Promise<void>` method
- [ ] Return methods in hook return object
- [ ] Methods handle errors consistently
- [ ] Update ProjectsPage to use new hook methods
- [ ] Remove `createProject`, `updateProject`, `deleteProject` imports from api/client.ts
- [ ] Remove direct `apiClient` calls from ProjectsPage

#### Pattern Consistency Verification
- [ ] All entity hooks follow same pattern (fetch + CRUD methods)
- [ ] All pages use hooks instead of direct API calls
- [ ] Error handling consistent across all hooks
- [ ] Loading states managed in hooks (not pages)

#### Testing
- [ ] Jest tests for all new hook methods (3 hooks × ~5 methods = 15 tests)
- [ ] Integration tests verify pages use hooks correctly
- [ ] All existing tests still pass

### Technical Approach

#### Pattern to Follow (from useDonations, useSponsorships)

**Existing Good Example (useDonations.ts):**
```typescript
export const useDonations = () => {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(null);

  const fetchDonations = useCallback(async (options: FetchOptions) => {
    setLoading(true);
    try {
      const response = await apiClient.get('/api/donations', { params });
      setDonations(response.data.donations);
      setPaginationMeta(response.data.meta);
    } catch (err) {
      setError('Failed to fetch donations');
    } finally {
      setLoading(false);
    }
  }, []);

  const createDonation = useCallback(async (data: DonationFormData): Promise<Donation> => {
    const response = await apiClient.post('/api/donations', { donation: data });
    return response.data.donation;
  }, []);

  return {
    donations,
    loading,
    error,
    paginationMeta,
    fetchDonations,
    createDonation,
  };
};
```

#### 1. useDonors Hook Extension

**File:** `src/hooks/useDonors.ts`

**Add methods:**
```typescript
const createDonor = useCallback(async (data: DonorFormData): Promise<Donor> => {
  const response = await apiClient.post('/api/donors', { donor: data });
  return response.data.donor;
}, []);

const updateDonor = useCallback(async (id: number, data: DonorFormData): Promise<Donor> => {
  const response = await apiClient.patch(`/api/donors/${id}`, { donor: data });
  return response.data.donor;
}, []);

// Return in hook
return {
  donors,
  loading,
  error,
  paginationMeta,
  fetchDonors,
  archiveDonor,
  restoreDonor,
  createDonor,    // ✅ Add
  updateDonor,    // ✅ Add
};
```

**Update DonorsPage.tsx:**
```typescript
const {
  donors,
  loading,
  error,
  paginationMeta,
  fetchDonors,
  archiveDonor,
  restoreDonor,
  createDonor,    // ✅ Add
  updateDonor,    // ✅ Add
} = useDonors();

const handleDonorSubmit = async (data: DonorFormData) => {
  try {
    if (editingDonor) {
      await updateDonor(editingDonor.id, data);  // ✅ Use hook
    } else {
      await createDonor(data);  // ✅ Use hook
    }
    fetchDonors({ page: currentPage, per_page: 25, search: debouncedQuery });
    setEditingDonor(null);
  } catch (err: any) {
    setError(err.response?.data?.errors?.join(', ') || 'Failed to save donor');
  }
};
```

#### 2. useChildren Hook Extension

**File:** `src/hooks/useChildren.ts`

**Add methods:**
```typescript
const createChild = useCallback(async (data: ChildFormData): Promise<Child> => {
  const response = await apiClient.post('/api/children', { child: data });
  return response.data.child;
}, []);

const updateChild = useCallback(async (id: number, data: ChildFormData): Promise<Child> => {
  const response = await apiClient.put(`/api/children/${id}`, { child: data });
  return response.data.child;
}, []);

const deleteChild = useCallback(async (id: number): Promise<void> => {
  await apiClient.delete(`/api/children/${id}`);
}, []);

const archiveChild = useCallback(async (id: number): Promise<void> => {
  await apiClient.post(`/api/children/${id}/archive`);
}, []);

const restoreChild = useCallback(async (id: number): Promise<void> => {
  await apiClient.post(`/api/children/${id}/restore`);
}, []);

// Return in hook
return {
  children,
  loading,
  error,
  paginationMeta,
  fetchChildren,
  createChild,     // ✅ Add
  updateChild,     // ✅ Add
  deleteChild,     // ✅ Add
  archiveChild,    // ✅ Add
  restoreChild,    // ✅ Add
};
```

**Update ChildrenPage.tsx:**
```typescript
const {
  children,
  loading,
  error,
  paginationMeta,
  fetchChildren,
  createChild,     // ✅ Add
  updateChild,     // ✅ Add
  deleteChild,     // ✅ Add
  archiveChild,    // ✅ Add
  restoreChild,    // ✅ Add
} = useChildren();

const handleChildSubmit = async (data: ChildFormData) => {
  try {
    if (editingChild) {
      await updateChild(editingChild.id, data);  // ✅ Use hook
    } else {
      await createChild(data);  // ✅ Use hook
    }
    fetchChildren({ page: currentPage, per_page: 10, search: debouncedQuery });
    setEditingChild(null);
  } catch (err: any) {
    setError(err.response?.data?.errors?.join(', ') || 'Failed to save child');
  }
};

const handleDelete = async (id: number) => {
  try {
    await deleteChild(id);  // ✅ Use hook
    fetchChildren({ page: currentPage, per_page: 10, search: debouncedQuery });
  } catch (err: any) {
    setError(err.response?.data?.error || 'Failed to delete child');
  }
};

const handleArchive = async (id: number) => {
  try {
    await archiveChild(id);  // ✅ Use hook
    fetchChildren({ page: currentPage, per_page: 10, search: debouncedQuery });
  } catch (err: any) {
    setError(err.response?.data?.error || 'Failed to archive child');
  }
};

const handleRestore = async (id: number) => {
  try {
    await restoreChild(id);  // ✅ Use hook
    fetchChildren({ page: currentPage, per_page: 10, search: debouncedQuery });
  } catch (err: any) {
    setError(err.response?.data?.error || 'Failed to restore child');
  }
};
```

#### 3. useProjects Hook Extension

**File:** `src/hooks/useProjects.ts`

**Add methods:**
```typescript
const createProject = useCallback(async (data: ProjectFormData): Promise<Project> => {
  const response = await apiClient.post('/api/projects', { project: data });
  return response.data.project;
}, []);

const updateProject = useCallback(async (id: number, data: ProjectFormData): Promise<Project> => {
  const response = await apiClient.put(`/api/projects/${id}`, { project: data });
  return response.data.project;
}, []);

const deleteProject = useCallback(async (id: number): Promise<void> => {
  await apiClient.delete(`/api/projects/${id}`);
}, []);

const archiveProject = useCallback(async (id: number): Promise<void> => {
  await apiClient.post(`/api/projects/${id}/archive`);
}, []);

const restoreProject = useCallback(async (id: number): Promise<void> => {
  await apiClient.post(`/api/projects/${id}/restore`);
}, []);

// Return in hook
return {
  projects,
  loading,
  error,
  paginationMeta,
  fetchProjects,
  createProject,    // ✅ Add
  updateProject,    // ✅ Add
  deleteProject,    // ✅ Add
  archiveProject,   // ✅ Add
  restoreProject,   // ✅ Add
};
```

**Update ProjectsPage.tsx:**
```typescript
// Remove this import:
// import { createProject, updateProject, deleteProject } from '../api/client';

const {
  projects,
  loading,
  error,
  paginationMeta,
  fetchProjects,
  createProject,    // ✅ Add
  updateProject,    // ✅ Add
  deleteProject,    // ✅ Add
  archiveProject,   // ✅ Add
  restoreProject,   // ✅ Add
} = useProjects();

const handleProjectSubmit = async (data: ProjectFormData) => {
  try {
    if (editingProject) {
      await updateProject(editingProject.id, data);  // ✅ Use hook
    } else {
      await createProject(data);  // ✅ Use hook
    }
    fetchProjects({ page: currentPage, per_page: 10, search: debouncedQuery });
    setEditingProject(null);
  } catch (err: any) {
    setError(err.response?.data?.errors?.join(', ') || 'Failed to save project');
  }
};

const handleDelete = async (id: number) => {
  try {
    await deleteProject(id);  // ✅ Use hook
    fetchProjects({ page: currentPage, per_page: 10, search: debouncedQuery });
  } catch (err: any) {
    setError(err.response?.data?.error || 'Failed to delete project');
  }
};

const handleArchive = async (id: number) => {
  try {
    await archiveProject(id);  // ✅ Use hook
    fetchProjects({ page: currentPage, per_page: 10, search: debouncedQuery });
  } catch (err: any) {
    setError(err.response?.data?.error || 'Failed to archive project');
  }
};

const handleRestore = async (id: number) => {
  try {
    await restoreProject(id);  // ✅ Use hook
    fetchProjects({ page: currentPage, per_page: 10, search: debouncedQuery });
  } catch (err: any) {
    setError(err.response?.data?.error || 'Failed to restore project');
  }
};
```

#### 4. Optional Cleanup: api/client.ts

**If `createProject`, `updateProject`, `deleteProject` are ONLY used in ProjectsPage, remove them:**

```typescript
// Remove these exports (lines ~60-80):
// export const createProject = async (data: ProjectFormData): Promise<Project> => { ... }
// export const updateProject = async (id: number, data: ProjectFormData): Promise<Project> => { ... }
// export const deleteProject = async (id: number): Promise<void> => { ... }
```

**If they're used elsewhere (e.g., QuickEntityCreateDialog), keep them and deprecate later.**

### Benefits

1. **DRY Principle:** No duplicate API call logic across pages
2. **Consistency:** All entity operations follow same pattern
3. **Maintainability:** Single source of truth for API calls per entity
4. **Testability:** Easier to mock hooks than scattered API calls
5. **Type Safety:** Centralized TypeScript types for API responses
6. **Future-Proofing:** Easy to add loading states, optimistic updates, caching

### Testing Strategy

#### Jest Unit Tests (15 new tests)

**useDonors.test.ts:**
1. `it('createDonor makes POST request and returns donor')`
2. `it('updateDonor makes PATCH request and returns updated donor')`

**useChildren.test.ts:**
3. `it('createChild makes POST request and returns child')`
4. `it('updateChild makes PUT request and returns updated child')`
5. `it('deleteChild makes DELETE request')`
6. `it('archiveChild makes POST request to archive endpoint')`
7. `it('restoreChild makes POST request to restore endpoint')`

**useProjects.test.ts:**
8. `it('createProject makes POST request and returns project')`
9. `it('updateProject makes PUT request and returns updated project')`
10. `it('deleteProject makes DELETE request')`
11. `it('archiveProject makes POST request to archive endpoint')`
12. `it('restoreProject makes POST request to restore endpoint')`

**Integration Tests (Page components):**
13. DonorsPage: Verify hook methods called on form submit
14. ChildrenPage: Verify hook methods called on all CRUD actions
15. ProjectsPage: Verify hook methods called on all CRUD actions

### Files to Modify

**Custom Hooks (3 files):**
- `src/hooks/useDonors.ts` (+20 lines - 2 new methods)
- `src/hooks/useChildren.ts` (+50 lines - 5 new methods)
- `src/hooks/useProjects.ts` (+50 lines - 5 new methods)

**Page Components (3 files):**
- `src/pages/DonorsPage.tsx` (-5 lines - replace direct API calls with hook methods)
- `src/pages/ChildrenPage.tsx` (-20 lines - replace direct API calls with hook methods)
- `src/pages/ProjectsPage.tsx` (-10 lines - replace direct API calls and imports with hook methods)

**API Client (optional cleanup):**
- `src/api/client.ts` (-30 lines - remove createProject, updateProject, deleteProject if unused elsewhere)

**Tests (6 files):**
- `src/hooks/useDonors.test.ts` (+20 lines - 2 new tests)
- `src/hooks/useChildren.test.ts` (+50 lines - 5 new tests)
- `src/hooks/useProjects.test.ts` (+50 lines - 5 new tests)
- `src/pages/DonorsPage.test.tsx` (update mocks)
- `src/pages/ChildrenPage.test.tsx` (update mocks)
- `src/pages/ProjectsPage.test.tsx` (update mocks)

### Effort Justification

**Estimated Time:** 3-4 hours

**Breakdown:**
- Extend useDonors hook + update DonorsPage: 45 minutes
- Extend useChildren hook + update ChildrenPage: 60 minutes
- Extend useProjects hook + update ProjectsPage: 60 minutes
- Write hook tests (15 tests): 45 minutes
- Update page tests (mocks): 30 minutes
- Manual testing: 15 minutes
- Commit + documentation: 15 minutes

**Rationale:**
- Medium effort (3 hooks, 3 pages, ~15 tests)
- Straightforward pattern replication (from useDonations, useSponsorships)
- Reduces code duplication significantly
- Improves long-term maintainability

### Related Tickets
- TICKET-032: Custom Hooks Library (established pattern) ✅ Complete
- TICKET-066: useDonations Hook (reference implementation) ✅ Complete
- TICKET-099: useSponsorships Hook (reference implementation) ✅ Complete
- CODE_SMELL_ANALYSIS (2025-11-26): Identified direct API calls pattern violation

### Notes
- This is a refactoring ticket - no functionality changes
- All existing tests should pass with updated mocks
- Establishes consistent pattern for all entity hooks
- Future entity hooks should include CRUD methods from start
