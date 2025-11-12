## [TICKET-051] Add Project Type Filter & Pagination to Projects Page

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Effort:** M (Medium - 2-3 hours)
**Created:** 2025-10-21
**Updated:** 2025-11-12 (Added pagination requirement for consistency)
**Dependencies:** None

### User Story
As a user, I want to filter projects by type (General/Campaign/Sponsorship) and navigate through paginated results on the Projects page so that I can easily find and manage specific categories of projects, consistent with other pages in the application.

### Acceptance Criteria

#### Type Filter (Client-Side)
- [ ] Add dropdown filter above ProjectList for project type selection
- [ ] Dropdown options: "All Types", "General", "Campaign", "Sponsorship"
- [ ] Default selection: "All Types" (shows all projects)
- [ ] Selecting a type filters the displayed project list client-side
- [ ] Filter state resets when creating/editing/deleting projects
- [ ] Visual consistency with other page filters (Material-UI Select component)

#### Pagination (Backend Integration)
- [ ] Migrate to server-side pagination using backend API
- [ ] Use `usePagination` hook (like DonorsPage, ChildrenPage, SponsorshipsPage)
- [ ] Extract pagination metadata from API response (totalPages, totalCount)
- [ ] Add MUI Pagination component below ProjectList
- [ ] Display "Showing X-Y of Z projects" metadata text
- [ ] Pagination resets to page 1 when type filter changes
- [ ] Backend already supports pagination (ProjectsController uses PaginationConcern)

#### Testing
- [ ] Jest unit tests validate filtering logic
- [ ] Jest unit tests validate pagination behavior
- [ ] Cypress E2E test validates type filtering workflow
- [ ] Cypress E2E smoke tests validate pagination UI exists

### Technical Approach

#### Phase 1: Add Pagination (Backend Integration)

**1. ProjectsPage.tsx - Add Pagination State:**
```typescript
import { usePagination } from '../hooks';

const { currentPage, paginationMeta, setPaginationMeta, handlePageChange } = usePagination();
const [projectTypeFilter, setProjectTypeFilter] = useState<string>('all');

// Fetch projects with pagination
useEffect(() => {
  const loadProjects = async () => {
    const params: any = { page: currentPage, per_page: 25 };
    if (showArchived) params.include_discarded = 'true';
    if (projectTypeFilter !== 'all') params.q = { project_type_eq: projectTypeFilter };

    const response = await apiClient.get('/api/projects', { params });
    setProjects(response.data.projects);
    setPaginationMeta(response.data.meta);
  };
  loadProjects();
}, [currentPage, showArchived, projectTypeFilter, setPaginationMeta]);

// Reset to page 1 when filter changes
useEffect(() => {
  handlePageChange(null, 1);
}, [projectTypeFilter, showArchived, handlePageChange]);
```

**2. Add Pagination UI:**
```typescript
{paginationMeta && paginationMeta.total_pages > 1 && (
  <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <Typography variant="body2" color="text.secondary">
      Showing {(currentPage - 1) * 25 + 1}-{Math.min(currentPage * 25, paginationMeta.total_count)} of {paginationMeta.total_count} projects
    </Typography>
    <Pagination
      count={paginationMeta.total_pages}
      page={currentPage}
      onChange={handlePageChange}
      color="primary"
    />
  </Box>
)}
```

#### Phase 2: Add Type Filter (Server-Side via Ransack)

**1. Type Filter Dropdown:**
```typescript
const [projectTypeFilter, setProjectTypeFilter] = useState<string>('all');
```

**2. UI Layout:**
```tsx
<Box sx={{ mb: 2 }}>
  <FormControl size="small" sx={{ minWidth: 200 }}>
    <InputLabel id="project-type-filter-label">Filter by Type</InputLabel>
    <Select
      labelId="project-type-filter-label"
      value={projectTypeFilter}
      label="Filter by Type"
      onChange={(e) => setProjectTypeFilter(e.target.value)}
    >
      <MenuItem value="all">All Types</MenuItem>
      <MenuItem value="general">General</MenuItem>
      <MenuItem value="campaign">Campaign</MenuItem>
      <MenuItem value="sponsorship">Sponsorship</MenuItem>
    </Select>
  </FormControl>
</Box>
```

**3. Placement:**
- Add filter dropdown in "Project List" section
- Position above ProjectList component
- Follow DonorsPage pattern for consistent layout

### Backend Status

**Already Implemented:**
- ✅ ProjectsController includes `PaginationConcern` (pagination support)
- ✅ ProjectsController includes `RansackFilterable` (filtering support)
- ✅ Project model has `ransackable_attributes` including `project_type`
- ✅ Backend returns pagination `meta` object

**What We Need:**
- Frontend integration with `usePagination` hook
- Frontend Ransack query: `?q[project_type_eq]=<type>`
- Type filter dropdown UI

### Testing Strategy

**Jest Unit Tests** (`ProjectsPage.test.tsx`):
- [ ] Renders type filter dropdown
- [ ] Default selection shows "All Types"
- [ ] Selecting "General" filters to only general projects
- [ ] Selecting "Campaign" filters to only campaign projects
- [ ] Selecting "Sponsorship" filters to only sponsorship projects
- [ ] "All Types" shows all projects again
- [ ] Filter dropdown displays all 4 options

**Cypress E2E Tests** (`project-management.cy.ts` - update existing):
- [ ] Navigate to /projects page
- [ ] Select "Sponsorship" from type filter
- [ ] Verify only sponsorship projects displayed
- [ ] Select "All Types"
- [ ] Verify all projects displayed again

### Files to Modify
- `donation_tracker_frontend/src/pages/ProjectsPage.tsx` - Add filter state and UI
- `donation_tracker_frontend/src/pages/ProjectsPage.test.tsx` - Add filter tests
- `donation_tracker_frontend/cypress/e2e/project-management.cy.ts` - Add filter E2E test

### UI/UX Design Specifications

**Filter Dropdown:**
- Component: Material-UI Select
- Size: small
- MinWidth: 200px
- Label: "Filter by Type"
- Margin bottom: 2

**Layout Structure:**
```tsx
<Box sx={{ mb: 4 }}>
  <Typography variant="h6" component="h2" gutterBottom>
    Project List
  </Typography>

  <Box sx={{ mb: 2 }}>
    <FormControl size="small" sx={{ minWidth: 200 }}>
      {/* Filter dropdown */}
    </FormControl>
  </Box>

  <ProjectList projects={filteredProjects} ... />
</Box>
```

### Estimated Time
~2-3 hours (pagination integration + type filtering)
- Phase 1 (Pagination): 1-1.5 hours
- Phase 2 (Type Filter): 0.5-1 hour
- Testing: 0.5 hour

### Related Tickets
- ✅ TICKET-009: Project-based donations (complete)
- ✅ TICKET-053: Sponsorships page pagination (complete - pattern to follow)
- 📋 TICKET-046: Donation list project filter (planned)

### Pattern to Follow
**Reference Implementation:** TICKET-053 (SponsorshipsPage)
- Uses `usePagination` hook for state management
- Extracts `meta` from API response
- MUI Pagination component with metadata display
- Resets to page 1 on filter change

**Consistency Goal:**
All 5 pages (Donors, Donations, Children, Sponsorships, Projects) should have:
- Server-side pagination (25 items/page)
- Pagination UI with metadata
- Filter integration with pagination reset

### Notes
- **Changed Approach:** Server-side pagination instead of client-side filtering
- Backend already supports pagination + Ransack filtering (no backend changes needed)
- Follows established pattern from DonorsPage, ChildrenPage, SponsorshipsPage
- Ensures consistency across all list pages

---

*Updated 2025-11-12: Expanded scope to include pagination for consistency with other pages*
