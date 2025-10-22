## [TICKET-051] Add Project Type Sort/Filter to Projects Page

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Effort:** S (Small - 1-2 hours)
**Created:** 2025-10-21
**Dependencies:** None

### User Story
As a user, I want to sort and filter projects by type (General/Campaign/Sponsorship) on the Projects page so that I can easily find and manage specific categories of projects.

### Acceptance Criteria
- [ ] Add dropdown filter above ProjectList for project type selection
- [ ] Dropdown options: "All Types", "General", "Campaign", "Sponsorship"
- [ ] Default selection: "All Types" (shows all projects)
- [ ] Selecting a type filters the displayed project list client-side
- [ ] Filter state resets when creating/editing/deleting projects
- [ ] Visual consistency with other page filters (Material-UI Select component)
- [ ] Jest unit tests validate filtering logic
- [ ] Cypress E2E test validates type filtering workflow

### Technical Approach

#### Frontend Changes (Client-Side Filtering)

**1. ProjectsPage.tsx Updates:**
```typescript
const [projectTypeFilter, setProjectTypeFilter] = useState<string>('all');

// Filter projects based on selected type
const filteredProjects = projectTypeFilter === 'all'
  ? projects
  : projects.filter(p => p.project_type === projectTypeFilter);

// Pass filtered list to ProjectList
<ProjectList
  projects={filteredProjects}
  onEdit={setEditingProject}
  onDelete={handleDelete}
/>
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

### Alternative Approach: Server-Side Filtering

**If project count grows large (100+ projects):**
- Add Ransack filtering to backend: `q[project_type_eq]=<type>`
- Follow DonationsPage pattern with pagination + filters
- Add `PaginationConcern` and `RansackFilterable` to ProjectsController
- **Not needed for MVP** - client-side filtering sufficient for now

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
~1-2 hours (simple client-side filtering)

### Related Tickets
- ✅ TICKET-009: Project-based donations (complete)
- 📋 TICKET-046: Donation list project filter (planned)

### Notes
- Client-side filtering chosen over server-side for simplicity
- Current project count is low (<50 expected)
- Can migrate to server-side Ransack filtering later if needed
- Follows existing pattern from other pages

---

*This ticket addresses user request: "Can you sort project list by type"*
