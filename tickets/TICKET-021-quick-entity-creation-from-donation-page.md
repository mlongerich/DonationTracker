## [TICKET-021] Quick Entity Creation (Donor/Project/Child) from Donation Page

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Effort:** L (Large - expanded scope to include Project and Child)
**Started:** 2025-10-15
**Updated:** 2025-11-05 (expanded scope)
**Dependencies:** TICKET-017 (Autocomplete) ✅, TICKET-019 (DonationsPage) ✅

### User Story
As a user, I want to create new donors, projects, or children while recording a donation so that I don't have to navigate away from the donation page when I need to create related entities on the fly.

### Problem Statement
**Current Workflow:**
1. User is recording a donation
2. Realizes donor/project/child doesn't exist
3. Must navigate to Donors/Projects/Children page
4. Create entity
5. Navigate back to Donations page
6. Re-enter all donation data (lost state)

**Desired Workflow:**
1. User is recording a donation
2. Clicks "Add" icon next to autocomplete (like "Add Sponsor" on Children page)
3. Modal opens with entity creation form
4. Create entity without losing donation form state
5. Entity auto-selected in autocomplete
6. Continue with donation submission

### Acceptance Criteria

#### Donor Quick Creation
- [ ] Donor autocomplete shows "➕ Create new donor" option when no matches found
- [ ] OR: Add icon button next to Donor autocomplete
- [ ] Clicking option/icon opens inline modal with DonorForm
- [ ] Modal contains donor name and email fields
- [ ] Successfully creating donor auto-selects them in autocomplete
- [ ] Modal can be canceled without losing donation form data
- [ ] Validation errors shown in modal
- [ ] Jest tests for donor modal interaction
- [ ] Cypress E2E test for donor creation + donation flow

#### Project Quick Creation
- [ ] Add icon button next to Project autocomplete (like Children page sponsor icon)
- [ ] Clicking icon opens inline modal with ProjectForm
- [ ] Modal contains project title, description, project_type fields
- [ ] Successfully creating project auto-selects it in autocomplete
- [ ] Modal can be canceled without losing donation form data
- [ ] Validation errors shown in modal
- [ ] Jest tests for project modal interaction
- [ ] Cypress E2E test for project creation + donation flow

#### Child Quick Creation (for sponsorships)
- [ ] Add icon button next to Child autocomplete (when sponsorship selected)
- [ ] Clicking icon opens inline modal with ChildForm
- [ ] Modal contains child name field
- [ ] Successfully creating child auto-selects them in autocomplete
- [ ] Modal can be canceled without losing donation form data
- [ ] Validation errors shown in modal
- [ ] Jest tests for child modal interaction
- [ ] Cypress E2E test for child creation + donation flow

### Technical Approach

#### Shared Pattern: Inline Entity Creation Modal

**1. Reusable Dialog Component:**
```tsx
// src/components/QuickEntityCreateDialog.tsx
interface QuickEntityCreateDialogProps<T> {
  open: boolean;
  onClose: () => void;
  onSuccess: (entity: T) => void;
  entityType: 'donor' | 'project' | 'child';
  initialValue?: string; // Pre-populate from search term
}

const QuickEntityCreateDialog = <T,>({
  open,
  onClose,
  onSuccess,
  entityType,
  initialValue
}: QuickEntityCreateDialogProps<T>) => {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Create New {entityType}</DialogTitle>
      <DialogContent>
        {entityType === 'donor' && (
          <DonorForm
            onSubmit={handleDonorSubmit}
            initialData={{ name: initialValue }}
            embedded
          />
        )}
        {entityType === 'project' && (
          <ProjectForm
            onSubmit={handleProjectSubmit}
            initialData={{ title: initialValue }}
            embedded
          />
        )}
        {entityType === 'child' && (
          <ChildForm
            onSubmit={handleChildSubmit}
            initialData={{ name: initialValue }}
            embedded
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
```

**2. DonationForm Integration:**
```tsx
// src/components/DonationForm.tsx
const DonationForm = ({ onSubmit, initialData }: DonationFormProps) => {
  const [quickCreateOpen, setQuickCreateOpen] = useState<'donor' | 'project' | 'child' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleQuickCreateSuccess = (entityType: string, entity: any) => {
    if (entityType === 'donor') setSelectedDonor(entity);
    if (entityType === 'project') setSelectedProject(entity);
    if (entityType === 'child') setSelectedChild(entity);
    setQuickCreateOpen(null);
  };

  return (
    <Box component="form">
      {/* Donor Autocomplete with Add Icon */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
        <DonorAutocomplete
          value={selectedDonor}
          onChange={setSelectedDonor}
          onInputChange={setSearchTerm}
          size="small"
          required
        />
        <IconButton
          aria-label="create donor"
          onClick={() => setQuickCreateOpen('donor')}
          size="small"
        >
          <AddIcon />
        </IconButton>
      </Box>

      {/* Project Autocomplete with Add Icon */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
        <ProjectAutocomplete
          value={selectedProject}
          onChange={setSelectedProject}
          size="small"
        />
        <IconButton
          aria-label="create project"
          onClick={() => setQuickCreateOpen('project')}
          size="small"
        >
          <AddIcon />
        </IconButton>
      </Box>

      {/* Quick Create Dialog */}
      {quickCreateOpen && (
        <QuickEntityCreateDialog
          open={!!quickCreateOpen}
          onClose={() => setQuickCreateOpen(null)}
          onSuccess={(entity) => handleQuickCreateSuccess(quickCreateOpen, entity)}
          entityType={quickCreateOpen}
          initialValue={searchTerm}
        />
      )}
    </Box>
  );
};
```

**3. Autocomplete Option Alternative (Donor Only):**
```tsx
// Add custom option to autocomplete results
const donorOptions = [
  ...donors,
  {
    id: -1,
    name: `➕ Create new donor "${searchTerm}"`,
    isCreateOption: true
  }
];

const handleDonorChange = (event, value) => {
  if (value?.isCreateOption) {
    setQuickCreateOpen('donor');
  } else {
    setSelectedDonor(value);
  }
};
```

### UX Design

#### Icon Button Pattern (Recommended)
```
[Donation Form]
Amount: [$100.00           ]
Date:   [2025-11-05        ]
Donor:  [Search donor...▼  ] [➕]
Project:[General Donation▼ ] [➕]

[Clicks ➕ next to Donor]

┌──────────────────────────────┐
│ Create New Donor             │
│                              │
│ Name:  [John Doe         ]   │
│ Email: [john@example.com ]   │
│                              │
│ [Cancel]  [Create Donor]     │
└──────────────────────────────┘
```

#### Alternative: Autocomplete Option (Donor Only)
```
Donor: [Search for John▼]
       → John Smith
       → Johnny Appleseed
       → ➕ Create new donor "John"
```

### Implementation Strategy

**Phase 1: Donor Quick Creation (Original Scope)**
1. Create `QuickEntityCreateDialog` component
2. Add icon button to donor autocomplete
3. Wire up donor creation flow
4. Test donor creation + donation submission
5. Commit: `frontend: add quick donor creation to donation form`

**Phase 2: Project Quick Creation**
1. Add icon button to project autocomplete
2. Integrate `ProjectForm` in dialog
3. Test project creation flow
4. Commit: `frontend: add quick project creation to donation form`

**Phase 3: Child Quick Creation**
1. Add icon button to child autocomplete (sponsorship context)
2. Integrate `ChildForm` in dialog
3. Test child creation flow
4. Commit: `frontend: add quick child creation to donation form`

### Files to Create
- `src/components/QuickEntityCreateDialog.tsx` (NEW - reusable modal, ~150 lines)

### Files to Modify
- `src/components/DonationForm.tsx` (add icon buttons + dialog integration, +80 lines)
- `src/components/DonorForm.tsx` (add `embedded` prop to hide Cancel button, +5 lines)
- `src/components/ProjectForm.tsx` (add `embedded` prop, +5 lines)
- `src/components/ChildForm.tsx` (add `embedded` prop, +5 lines)
- `src/components/DonationForm.test.tsx` (add modal tests, +50 lines)
- `cypress/e2e/donation-entry.cy.ts` (add quick creation tests, +60 lines)

### Testing Strategy

**Jest Unit Tests:**
1. QuickEntityCreateDialog renders for each entity type
2. Dialog opens when icon button clicked
3. Dialog closes on cancel
4. Entity created and auto-selected on success
5. Donation form state preserved during modal interaction
6. Validation errors shown in modal

**Cypress E2E Tests:**
1. Create donor via icon → complete donation → verify donor and donation created
2. Create project via icon → complete donation → verify project and donation created
3. Create child via icon (sponsorship) → complete donation → verify child and donation created
4. Cancel modal → verify donation form data preserved

### Estimated Time
- **Phase 1 (Donor):** 2-3 hours
- **Phase 2 (Project):** 1-2 hours
- **Phase 3 (Child):** 1-2 hours
- **Total:** 4-7 hours

### Related Tickets
- TICKET-017: Donor Autocomplete Search ✅ (base component)
- TICKET-019: Multi-Page Architecture ✅ (DonationsPage exists)
- TICKET-054: Create Sponsorship from Sponsorships Page ✅ (similar pattern)

### Notes
- **UX Consistency**: Icon button approach matches Children page "Add Sponsor" pattern
- **State Management**: Use local component state (no global state needed)
- **Form Reuse**: Existing forms (DonorForm, ProjectForm, ChildForm) used in modal
- **Mobile Friendly**: Material-UI Dialog is responsive

### Success Criteria
- [ ] User can create donor/project/child without leaving donation page
- [ ] Donation form state preserved during entity creation
- [ ] Created entities immediately available in autocompletes
- [ ] All tests passing (Jest + Cypress)
- [ ] UX matches Children page "Add Sponsor" pattern
