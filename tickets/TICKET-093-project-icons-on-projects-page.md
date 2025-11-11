## [TICKET-093] Project Icons on Projects Page

**Status:** 📋 Planned
**Priority:** 🟢 Low
**Effort:** XS (Extra Small - 30-60 minutes)
**Created:** 2025-11-11
**Dependencies:** TICKET-052 (Implemented icon patterns) ✅

### User Story

As a user viewing the Projects page, I want to see visual icons for each project type so that I can quickly identify project categories (general, campaign, sponsorship) at a glance.

### Problem Statement

Currently, the Projects page lists project names without visual indicators of project type. The DonationForm already uses icons in ProjectOrChildAutocomplete:
- ✅ Folder icon for general projects
- ✅ Campaign icon for campaign projects
- ✅ Boy/Girl icons for sponsorship projects (children)

The Projects page should use the same icons for consistency.

### Acceptance Criteria

**UI Updates:**
- [ ] Display icon AFTER project name in ProjectList (same pattern as ChildList)
- [ ] Icon based on project_type field:
  - [ ] `project_type: 'general'` → Folder icon (`<Folder />`)
  - [ ] `project_type: 'campaign'` → Campaign icon (`<Campaign />`)
  - [ ] `project_type: 'sponsorship'` → ChildCare icon (`<ChildCare />`)
- [ ] Icons use `fontSize="small"` and `color="action"` for consistency
- [ ] System projects display appropriate icon (General → Folder, Sponsorship → ChildCare)
- [ ] Icons displayed using same layout as ChildList:
  ```tsx
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
    <Typography>{project.name}</Typography>
    <IconComponent fontSize="small" color="action" />
  </Box>
  ```

**Test Coverage:**
- [ ] ProjectList.test.tsx:
  - [ ] Displays Folder icon for general project
  - [ ] Displays Campaign icon for campaign project
  - [ ] Displays ChildCare icon for sponsorship project
  - [ ] System project displays appropriate icon
- [ ] Cypress E2E:
  - [ ] Create general project → Folder icon appears
  - [ ] Create campaign project → Campaign icon appears
  - [ ] Sponsorship system project displays ChildCare icon

### Technical Implementation

#### Frontend Changes

**1. Update ProjectList.tsx:**

```tsx
// src/components/ProjectList.tsx
import { Folder, Campaign, ChildCare } from '@mui/icons-material';

// Inside ProjectList component
const getProjectIcon = (projectType: string) => {
  switch (projectType) {
    case 'campaign':
      return <Campaign fontSize="small" color="action" data-testid="CampaignIcon" />;
    case 'sponsorship':
      return <ChildCare fontSize="small" color="action" data-testid="ChildCareIcon" />;
    case 'general':
    default:
      return <Folder fontSize="small" color="action" data-testid="FolderIcon" />;
  }
};

// In render
<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
  <Typography variant="subtitle1" component="div">
    {project.name}
  </Typography>
  {getProjectIcon(project.project_type)}
  {project.system && (
    <Chip label="System" size="small" color="default" />
  )}
</Box>
```

**2. Add Tests to ProjectList.test.tsx:**

```tsx
// src/components/ProjectList.test.tsx
import { render, screen } from '@testing-library/react';
import ProjectList from './ProjectList';

it('displays Folder icon for general project', () => {
  const generalProject: Project[] = [
    {
      id: 1,
      name: 'General Fund',
      project_type: 'general',
      system: false,
      created_at: '2025-01-01',
      updated_at: '2025-01-01',
      can_be_deleted: true,
    },
  ];

  render(
    <ProjectList
      projects={generalProject}
      onEdit={jest.fn()}
      onDelete={jest.fn()}
    />
  );

  expect(screen.getByTestId('FolderIcon')).toBeInTheDocument();
});

it('displays Campaign icon for campaign project', () => {
  const campaignProject: Project[] = [
    {
      id: 2,
      name: 'March Campaign',
      project_type: 'campaign',
      system: false,
      created_at: '2025-01-01',
      updated_at: '2025-01-01',
      can_be_deleted: true,
    },
  ];

  render(
    <ProjectList
      projects={campaignProject}
      onEdit={jest.fn()}
      onDelete={jest.fn()}
    />
  );

  expect(screen.getByTestId('CampaignIcon')).toBeInTheDocument();
});

it('displays ChildCare icon for sponsorship project', () => {
  const sponsorshipProject: Project[] = [
    {
      id: 3,
      name: 'Sponsor Maria',
      project_type: 'sponsorship',
      system: true,
      created_at: '2025-01-01',
      updated_at: '2025-01-01',
      can_be_deleted: false,
    },
  ];

  render(
    <ProjectList
      projects={sponsorshipProject}
      onEdit={jest.fn()}
      onDelete={jest.fn()}
    />
  );

  expect(screen.getByTestId('ChildCareIcon')).toBeInTheDocument();
});
```

**3. Add Cypress E2E Test:**

```typescript
// cypress/e2e/project-crud.cy.ts
it('displays Folder icon for newly created general project', () => {
  cy.visit('/projects');

  // Fill out form
  cy.get('input[type="text"]').first().type('Community Outreach');
  cy.get('[role="combobox"]').click();
  cy.contains('li', 'General').click();
  cy.contains('button', /submit/i).click();

  // Verify icon appears
  cy.contains('Community Outreach', { timeout: 5000 }).should('be.visible');
  cy.get('[data-testid="FolderIcon"]').should('be.visible');
});

it('displays Campaign icon for newly created campaign project', () => {
  cy.visit('/projects');

  // Fill out form
  cy.get('input[type="text"]').first().type('Summer Fundraiser');
  cy.get('[role="combobox"]').click();
  cy.contains('li', 'Campaign').click();
  cy.contains('button', /submit/i).click();

  // Verify icon appears
  cy.contains('Summer Fundraiser', { timeout: 5000 }).should('be.visible');
  cy.get('[data-testid="CampaignIcon"]').should('be.visible');
});
```

### Files to Modify

**Frontend:**
- `src/components/ProjectList.tsx` - Add icon rendering logic
- `src/components/ProjectList.test.tsx` - Add 3 unit tests for icons
- `cypress/e2e/project-crud.cy.ts` - Add 2 E2E tests for icon display

**Documentation:**
- `DonationTracking.md` - Document project icon display pattern
- `CLAUDE.md` - Reference existing icon pattern (already documented in TICKET-052)

### Design Considerations

**Icon Placement:**
- Icons appear AFTER project name (same as ChildList)
- Consistent with ChildList pattern for maintainability
- Icons use same MUI styling (`fontSize="small" color="action"`)

**Sponsorship Projects:**
- Use generic ChildCare icon (not gender-specific)
- Rationale: Project represents sponsorship category, not specific child
- Child-specific icons remain in ChildList and ProjectOrChildAutocomplete

### Related Tickets

- ✅ TICKET-052: Implemented icon patterns in ProjectOrChildAutocomplete (dependency)
- 📋 TICKET-093: This ticket (extend icons to Projects page)

### Success Metrics

- ✅ Users can visually identify project types at a glance
- ✅ Consistent icon usage across all project displays
- ✅ Improved visual hierarchy on Projects page

---

*This ticket extends the icon pattern from TICKET-052 to the Projects page for visual consistency and improved UX.*
