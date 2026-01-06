## [TICKET-119] Move Projects to Admin Page Tab

**Status:** ✅ Complete
**Priority:** 🟡 Medium
**Effort:** S-M (Small-Medium - 1-2 hours)
**Created:** 2025-11-17
**Completed:** 2025-12-05
**Dependencies:** None

### User Story
As a user, I want Projects management in the Admin page (as a tab) instead of a standalone page, since projects are administrative/configuration entities rather than day-to-day operational data.

### Context

**Current State:**
- Projects has its own page (`/projects` route)
- Projects appears in top navigation bar
- Projects treated equally with operational pages (Donations, Donors, Children, Sponsorships)

**Problem:**
- Projects are primarily for categorization and reporting
- Not used in daily donation entry workflow
- Clutters top navigation with admin-only feature
- Inconsistent with admin-focused features (Pending Review, CSV Import)

**Solution:**
- Move Projects to Admin page as 3rd tab
- Follow established AdminPage tab pattern (like PendingReviewSection)
- Remove from top navigation
- Clean up routes

**Benefits:**
- Clearer separation: Operational pages vs Admin pages
- Reduced navigation clutter
- Consistent grouping of admin features
- Projects still easily accessible when needed

**Current AdminPage State (as of 2025-12-05):**
- Tab 0: Pending Review (TICKET-111)
- Tab 1: CSV (donor export from TICKET-088)
- Tab 2: Projects (to be added by this ticket)

---

### Acceptance Criteria

**AdminPage Tab:**
- [ ] Add "Projects" tab to AdminPage (3rd tab after "Pending Review" and "CSV")
- [ ] Tab renders ProjectsSection component
- [ ] ProjectsSection includes full CRUD functionality
- [ ] ProjectsSection includes archive/restore functionality
- [ ] ProjectsSection includes "Show Archived" checkbox filter
- [ ] Success/error notifications work correctly

**Navigation & Routing:**
- [ ] Remove `/projects` route from App.tsx
- [ ] Remove "Projects" button from Navigation.tsx (line 24-26)
- [ ] Projects only accessible via `/admin` page, tab 2 (index 2)
- [ ] Direct link to Admin Projects tab: `/admin` (user selects tab)

**Component Extraction:**
- [ ] Create ProjectsSection component following PendingReviewSection pattern
- [ ] Extract all state management from ProjectsPage
- [ ] Extract all CRUD handlers from ProjectsPage
- [ ] ProjectsSection is self-contained (no props needed from AdminPage)

**Cleanup:**
- [ ] Delete ProjectsPage.tsx
- [ ] Delete ProjectsPage.test.tsx
- [ ] Mark TICKET-051 as superseded (standalone projects page improvements no longer relevant)

**Testing:**
- [ ] Jest: AdminPage renders Projects tab
- [ ] Jest: ProjectsSection renders correctly
- [ ] Jest: ProjectsSection CRUD operations work
- [ ] Jest: Navigation doesn't have Projects button
- [ ] Cypress E2E: Navigate to /admin, click Projects tab, verify UI
- [ ] Cypress E2E: Create/edit/delete/archive/restore project from Admin tab
- [ ] All existing tests pass

---

### Technical Approach

#### Phase 1: Extract ProjectsSection Component

**1. Create ProjectsSection.tsx** (copy logic from ProjectsPage.tsx):

```typescript
// donation_tracker_frontend/src/components/ProjectsSection.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Alert,
  Snackbar,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import ProjectForm from './ProjectForm';
import ProjectList from './ProjectList';
import apiClient, {
  createProject,
  updateProject,
  deleteProject,
} from '../api/client';
import { Project } from '../types';

const ProjectsSection: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [success, setSuccess] = useState<
    'created' | 'updated' | 'deleted' | 'archived' | 'restored' | null
  >(null);
  const [showArchived, setShowArchived] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const params: any = {};
        if (showArchived) {
          params.include_discarded = 'true';
        }
        const response = await apiClient.get('/api/projects', { params });
        setProjects(response.data.projects);
      } catch (error) {
        // Error silently handled - user will see empty list
      }
    };
    loadProjects();
  }, [showArchived]);

  const handleSubmit = async (data: {
    title: string;
    description?: string;
    project_type: string;
  }) => {
    try {
      if (editingProject) {
        await updateProject(editingProject.id, data);
        setEditingProject(null);
        setSuccess('updated');
      } else {
        await createProject(data);
        setSuccess('created');
      }
      const params: any = {};
      if (showArchived) {
        params.include_discarded = 'true';
      }
      const response = await apiClient.get('/api/projects', { params });
      setProjects(response.data.projects);
      setFormKey((prev) => prev + 1); // Reset form by changing key

      // Auto-dismiss notification after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      // Error silently handled
    }
  };

  const handleDelete = async (project: Project) => {
    try {
      await deleteProject(project.id);
      setSuccess('deleted');

      const params: any = {};
      if (showArchived) {
        params.include_discarded = 'true';
      }
      const response = await apiClient.get('/api/projects', { params });
      setProjects(response.data.projects);

      // Auto-dismiss notification after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      // Error silently handled
    }
  };

  const handleArchive = async (id: number) => {
    try {
      await apiClient.post(`/api/projects/${id}/archive`);
      setSuccess('archived');
      setError(null);

      const params: any = {};
      if (showArchived) {
        params.include_discarded = 'true';
      }
      const response = await apiClient.get('/api/projects', { params });
      setProjects(response.data.projects);

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      if (err.response?.status === 422) {
        setError(
          err.response.data.errors?.join(', ') || 'Failed to archive project'
        );
      } else {
        setError('Failed to archive project');
      }
    }
  };

  const handleRestore = async (id: number) => {
    try {
      await apiClient.post(`/api/projects/${id}/restore`);
      setSuccess('restored');
      setError(null);

      const params: any = {};
      if (showArchived) {
        params.include_discarded = 'true';
      }
      const response = await apiClient.get('/api/projects', { params });
      setProjects(response.data.projects);

      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setError('Failed to restore project');
    }
  };

  return (
    <Box>
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Project {success} successfully!
        </Alert>
      )}

      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" component="h2" gutterBottom>
          {editingProject ? 'Edit Project' : 'Create Project'}
        </Typography>
        <ProjectForm
          key={formKey}
          onSubmit={handleSubmit}
          project={editingProject || undefined}
        />
      </Box>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" component="h2" gutterBottom>
          Project List
        </Typography>
        <FormControlLabel
          control={
            <Checkbox
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
          }
          label="Show Archived Projects"
          sx={{ mb: 2 }}
        />
        <ProjectList
          projects={projects}
          onEdit={setEditingProject}
          onDelete={handleDelete}
          onArchive={handleArchive}
          onRestore={handleRestore}
        />
      </Box>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ProjectsSection;
```

**2. Create ProjectsSection.test.tsx:**

```typescript
// donation_tracker_frontend/src/components/ProjectsSection.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProjectsSection from './ProjectsSection';
import apiClient from '../api/client';

jest.mock('../api/client');

describe('ProjectsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { projects: [] },
    });
  });

  it('renders project form and list', async () => {
    render(<ProjectsSection />);

    await waitFor(() => {
      expect(screen.getByText('Create Project')).toBeInTheDocument();
      expect(screen.getByText('Project List')).toBeInTheDocument();
    });
  });

  it('fetches projects on mount', async () => {
    render(<ProjectsSection />);

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/api/projects', { params: {} });
    });
  });

  it('creates new project successfully', async () => {
    const user = userEvent.setup();
    (apiClient.post as jest.Mock).mockResolvedValue({
      data: { project: { id: 1, title: 'Test Project', project_type: 'general' } },
    });

    render(<ProjectsSection />);

    const titleInput = screen.getByLabelText(/title/i);
    await user.type(titleInput, 'Test Project');

    const submitButton = screen.getByRole('button', { name: /create/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Project created successfully/i)).toBeInTheDocument();
    });
  });
});
```

#### Phase 2: Update AdminPage

**1. Add Projects Tab to AdminPage.tsx:**

```typescript
// donation_tracker_frontend/src/pages/AdminPage.tsx
import React, { useState } from 'react';
import { Box, Container, Typography, Tabs, Tab, Button } from '@mui/material';
import Download from '@mui/icons-material/Download';
import PendingReviewSection from '../components/PendingReviewSection';
import ProjectsSection from '../components/ProjectsSection';
import apiClient from '../api/client';

const AdminPage: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleDonorExport = async () => {
    try {
      const params: Record<string, unknown> = {
        include_discarded: false,
      };

      const response = await apiClient.get('/api/donors/export', {
        params,
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
      link.setAttribute('download', `donors_export_${timestamp}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Failed to export donors:', err);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Admin
      </Typography>

      <Tabs value={currentTab} onChange={handleTabChange}>
        <Tab label="Pending Review" />
        <Tab label="CSV" />
        <Tab label="Projects" />
      </Tabs>

      <Box sx={{ mt: 3 }}>
        {currentTab === 0 && <PendingReviewSection />}
        {currentTab === 1 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Export Donors
            </Typography>
            <Button
              variant="contained"
              startIcon={<Download />}
              onClick={handleDonorExport}
              sx={{ mb: 3 }}
            >
              Export All Donors to CSV
            </Button>
          </Box>
        )}
        {currentTab === 2 && <ProjectsSection />}
      </Box>
    </Container>
  );
};

export default AdminPage;
```

**2. Update AdminPage.test.tsx:**

```typescript
// Add test for Projects tab
it('renders Projects tab', () => {
  render(<AdminPage />);

  const projectsTab = screen.getByRole('tab', { name: /projects/i });
  expect(projectsTab).toBeInTheDocument();
});

it('shows ProjectsSection when Projects tab clicked', async () => {
  const user = userEvent.setup();
  render(<AdminPage />);

  const projectsTab = screen.getByRole('tab', { name: /projects/i });
  await user.click(projectsTab);

  expect(screen.getByText('Create Project')).toBeInTheDocument();
  expect(screen.getByText('Project List')).toBeInTheDocument();
});
```

#### Phase 3: Clean Up Routes & Navigation

**1. Remove Projects Route from App.tsx:**

```typescript
// donation_tracker_frontend/src/App.tsx
// DELETE this import:
// import ProjectsPage from './pages/ProjectsPage';

// DELETE this route:
// <Route path="projects" element={<ProjectsPage />} />
```

**2. Remove Projects Button from Navigation.tsx:**

```typescript
// donation_tracker_frontend/src/components/Navigation.tsx
// DELETE this button:
// <Button color="inherit" component={RouterLink} to="/projects">
//   Projects
// </Button>
```

**3. Update Navigation.test.tsx:**

```typescript
// Remove or update test that expects Projects link
// it('renders Projects link', () => { ... }) ← DELETE THIS TEST
```

#### Phase 4: Cleanup Old Files

**1. Delete ProjectsPage files:**
- `donation_tracker_frontend/src/pages/ProjectsPage.tsx`
- `donation_tracker_frontend/src/pages/ProjectsPage.test.tsx`

**2. Update TICKET-051:**
- Add note: "**Status:** ❌ Superseded by TICKET-119 (Projects moved to Admin tab)"

#### Phase 5: Update E2E Tests

**1. Update project-management.cy.ts:**

```typescript
// cypress/e2e/project-management.cy.ts
describe('Project Management (Admin Tab)', () => {
  it('manages projects from admin page', () => {
    cy.visit('/admin');

    // Click Projects tab
    cy.contains('button', 'Projects').click();

    // Verify Projects section renders
    cy.contains('Create Project').should('be.visible');
    cy.contains('Project List').should('be.visible');

    // Create project
    cy.get('input[name="title"]').type('Test Project');
    cy.get('button').contains(/create/i).click();

    // Verify success
    cy.contains(/Project created successfully/i).should('be.visible');
  });
});
```

---

### Files to Create
- `donation_tracker_frontend/src/components/ProjectsSection.tsx`
- `donation_tracker_frontend/src/components/ProjectsSection.test.tsx`
- `tickets/TICKET-119-move-projects-to-admin-tab.md` (this file)

### Files to Modify
- `donation_tracker_frontend/src/pages/AdminPage.tsx` (add Projects tab)
- `donation_tracker_frontend/src/pages/AdminPage.test.tsx` (add Projects tab tests)
- `donation_tracker_frontend/src/App.tsx` (remove /projects route)
- `donation_tracker_frontend/src/components/Navigation.tsx` (remove Projects button)
- `donation_tracker_frontend/src/components/Navigation.test.tsx` (remove Projects link test)
- `donation_tracker_frontend/cypress/e2e/project-management.cy.ts` (update to use Admin tab)
- `tickets/TICKET-051-project-page-type-sort-filter.md` (mark superseded)

### Files to Delete
- `donation_tracker_frontend/src/pages/ProjectsPage.tsx`
- `donation_tracker_frontend/src/pages/ProjectsPage.test.tsx`

---

### Testing Strategy

**Jest Unit Tests:**
- [ ] ProjectsSection renders correctly
- [ ] ProjectsSection fetches projects on mount
- [ ] ProjectsSection creates project successfully
- [ ] ProjectsSection updates project successfully
- [ ] ProjectsSection deletes project successfully
- [ ] ProjectsSection archives/restores projects
- [ ] ProjectsSection "Show Archived" checkbox works
- [ ] AdminPage renders Projects tab
- [ ] AdminPage shows ProjectsSection when Projects tab clicked
- [ ] Navigation doesn't render Projects button

**Cypress E2E Tests:**
- [ ] Navigate to /admin
- [ ] Click Projects tab
- [ ] Verify Projects section renders
- [ ] Create new project
- [ ] Edit project
- [ ] Archive project
- [ ] Restore project
- [ ] Delete project
- [ ] "Show Archived" checkbox filters correctly
- [ ] Verify /projects route no longer exists (404)

---

### UI/UX Design Specifications

**AdminPage Tab Layout:**
- Tabs: `["Pending Review", "CSV", "Projects"]`
- Projects tab index: 2
- Container: `maxWidth="lg"` (same as AdminPage)
- Margin top: 3 (same as other tabs)
- CSV tab functionality: Donor export (TICKET-088)

**ProjectsSection Layout:**
- No page title (AdminPage already has "Admin" title)
- Section titles: "Create Project" / "Edit Project", "Project List"
- Typography: h6 variant for section titles
- Spacing: mb: 4 between sections
- Success alerts: mb: 2
- Archive checkbox: mb: 2

---

### Estimated Time
~1-2 hours total:
- Phase 1 (Extract ProjectsSection): 20 mins (mostly copy-paste)
- Phase 2 (Update AdminPage): 10 mins
- Phase 3 (Routes & Navigation): 10 mins
- Phase 4 (Cleanup): 5 mins
- Phase 5 (E2E Tests): 15 mins
- Testing: 20 mins

---

### Related Tickets

**Supersedes:**
- **TICKET-051**: Project Page Type Filter & Pagination (standalone page no longer needed)

**Related:**
- TICKET-111: Admin Pending Review UI (established AdminPage tab pattern)
- TICKET-088: Donor CSV Export (CSV tab content - completed 2025-12-05)
- TICKET-009: Project-based donations (CRUD functionality already implemented)

---

### Implementation Checklist

#### Phase 1: Extract Component
- [ ] Create ProjectsSection.tsx
- [ ] Create ProjectsSection.test.tsx
- [ ] Run Jest tests for ProjectsSection

#### Phase 2: Update AdminPage
- [ ] Add Projects tab to AdminPage.tsx
- [ ] Import ProjectsSection
- [ ] Update AdminPage.test.tsx
- [ ] Run Jest tests for AdminPage

#### Phase 3: Clean Up Routes
- [ ] Remove ProjectsPage import from App.tsx
- [ ] Remove /projects route from App.tsx
- [ ] Remove Projects button from Navigation.tsx
- [ ] Update Navigation.test.tsx
- [ ] Run Jest tests for App and Navigation

#### Phase 4: Delete Old Files
- [ ] Delete ProjectsPage.tsx
- [ ] Delete ProjectsPage.test.tsx
- [ ] Update TICKET-051 status

#### Phase 5: Update E2E Tests
- [ ] Update project-management.cy.ts
- [ ] Run Cypress E2E tests
- [ ] Verify /projects returns 404

#### Final Verification
- [ ] All Jest tests pass (frontend)
- [ ] All Cypress E2E tests pass
- [ ] Manual smoke test: navigate to /admin, use Projects tab
- [ ] Manual test: verify /projects route doesn't exist
- [ ] Update CLAUDE.md if patterns changed
- [ ] Update docs/DonationTracking.md if architecture changed

---

### Success Criteria

**Functionality:**
- [ ] Projects fully accessible from Admin page, tab 2
- [ ] All CRUD operations work (create, update, delete, archive, restore)
- [ ] "Show Archived" checkbox filters correctly
- [ ] Success/error notifications display correctly
- [ ] /projects route returns 404

**Code Quality:**
- [ ] ProjectsSection follows PendingReviewSection pattern
- [ ] No code duplication (logic moved, not copied)
- [ ] All tests pass (100% pass rate)
- [ ] No linting errors
- [ ] Type safety maintained

**User Experience:**
- [ ] Projects tab is intuitive to find
- [ ] No disruption to existing workflows
- [ ] Navigation cleaner (5 buttons instead of 6)
- [ ] Admin features grouped logically

---

### Rollback Plan

**If Issues Arise:**
1. Revert commits (this ticket only touches frontend)
2. No database changes to rollback
3. Can restore ProjectsPage files from git history
4. Can re-add /projects route and navigation button

**Low Risk Changes:**
- Pure frontend refactoring
- No backend changes
- No database migrations
- Easy to revert

---

### Notes
- **Pattern Consistency:** Follows PendingReviewSection established in TICKET-111
- **No Backend Changes:** All changes are frontend-only
- **Navigation Clarity:** Reduces top nav from 6 to 5 buttons (cleaner UX)
- **Future Enhancement:** Can add pagination/filters to ProjectsSection later (TICKET-051 ideas)
- **AdminPage Evolution:** CSV tab currently has donor export functionality (TICKET-088). Can add CSV import UI later.
- **Design Decision:** Projects are admin-focused, not operational (correct categorization)
- **Current State (2025-12-05):** AdminPage has "Pending Review" and "CSV" tabs. Projects tab to be added as 3rd tab.

---

*Created: 2025-11-17*
*Last Updated: 2025-12-05 (updated to reflect TICKET-088 CSV tab completion)*
*Estimated Effort: 1-2 hours*
*Impact: Frontend navigation UX improvement*
