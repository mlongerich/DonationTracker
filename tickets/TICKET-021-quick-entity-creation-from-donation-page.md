## [TICKET-021] Quick Entity Creation (Donor/Project/Child) from Donation Page

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Effort:** L (Large - 7-10 hours)
**Started:** 2025-10-15
**Updated:** 2025-11-12 (reviewed and updated for current codebase patterns)
**Dependencies:** TICKET-017 (Autocomplete) ✅, TICKET-052 (ProjectOrChildAutocomplete) ✅, TICKET-054 (SponsorshipModal pattern) ✅

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
- [ ] Add icon button (AddIcon) next to Donor autocomplete
- [ ] Clicking icon opens QuickDonorCreateDialog modal
- [ ] Modal follows SponsorshipModal pattern (Dialog + DialogContent)
- [ ] Modal contains DonorForm (name and email fields)
- [ ] API call handled within dialog (not in DonorForm)
- [ ] Successfully creating donor auto-selects them in autocomplete
- [ ] Modal can be canceled without losing donation form data
- [ ] **Validation errors (422)**: Extract and display via Snackbar
- [ ] **Network errors**: Display generic error message via Snackbar
- [ ] **Multiple validation errors**: Join with commas in single Snackbar
- [ ] **Error dismissal**: Auto-hide after 6 seconds OR manual close
- [ ] Jest tests for QuickDonorCreateDialog component (6 tests - add validation error test)
- [ ] Jest tests for DonationForm integration (3 tests)
- [ ] Cypress E2E test for donor creation + donation flow (3 tests - add validation error test)

#### Project Quick Creation
- [ ] Add icon button next to ProjectOrChildAutocomplete
- [ ] Clicking icon opens QuickProjectCreateDialog modal
- [ ] Modal follows same pattern as QuickDonorCreateDialog
- [ ] Modal contains ProjectForm (title, description, project_type fields)
- [ ] API call handled within dialog
- [ ] Successfully creating project auto-selects it in ProjectOrChildAutocomplete
- [ ] Modal can be canceled without losing donation form data
- [ ] **Validation errors (422)**: Extract and display via Snackbar
- [ ] **Network errors**: Display generic error message via Snackbar
- [ ] **Multiple validation errors**: Join with commas in single Snackbar
- [ ] **Error dismissal**: Auto-hide after 6 seconds OR manual close
- [ ] Jest tests for QuickProjectCreateDialog component (6 tests - add validation error test)
- [ ] Jest tests for DonationForm integration (2 tests)
- [ ] Cypress E2E test for project creation + donation flow (2 tests - add validation error test)

#### Child Quick Creation (for sponsorships)
- [ ] Add icon button next to ProjectOrChildAutocomplete
- [ ] Icon conditionally shown when child donation is selected/possible
- [ ] Clicking icon opens QuickChildCreateDialog modal
- [ ] Modal follows same pattern as QuickDonorCreateDialog
- [ ] Modal contains ChildForm (name and gender fields)
- [ ] API call handled within dialog
- [ ] Successfully creating child auto-selects it in ProjectOrChildAutocomplete
- [ ] Modal can be canceled without losing donation form data
- [ ] **Validation errors (422)**: Extract and display via Snackbar
- [ ] **Network errors**: Display generic error message via Snackbar
- [ ] **Multiple validation errors**: Join with commas in single Snackbar
- [ ] **Error dismissal**: Auto-hide after 6 seconds OR manual close
- [ ] Jest tests for QuickChildCreateDialog component (6 tests - add validation error test)
- [ ] Jest tests for DonationForm integration (2 tests)
- [ ] Cypress E2E test for child creation + donation flow (2 tests - add validation error test)

### Technical Approach

#### Pattern: Follow SponsorshipModal Implementation

**Reference:** `src/components/SponsorshipModal.tsx` - existing modal pattern for entity creation

**Key Pattern Elements:**
1. Separate dialog component per entity type (not generic)
2. API call handled in dialog component (not in form)
3. Snackbar for error display
4. Form component receives `onSubmit` callback that returns data
5. Dialog manages API call and success/error handling

**1. QuickDonorCreateDialog Component:**
```tsx
// src/components/QuickDonorCreateDialog.tsx
import { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, Snackbar, Alert } from '@mui/material';
import DonorForm from './DonorForm';
import { DonorFormData, Donor } from '../types';
import apiClient from '../api/client';

interface QuickDonorCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (donor: Donor) => void;
  initialName?: string;
}

const QuickDonorCreateDialog: React.FC<QuickDonorCreateDialogProps> = ({
  open,
  onClose,
  onSuccess,
  initialName,
}) => {
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: DonorFormData) => {
    try {
      const response = await apiClient.post('/api/donors', { donor: data });
      const newDonor = response.data.donor;
      onSuccess(newDonor);
      onClose();
      setError(null); // Clear any previous errors
    } catch (err: any) {
      // Handle validation errors (422) and other errors
      if (err.response?.status === 422) {
        const validationErrors = err.response.data.errors;
        const errorMessage = Array.isArray(validationErrors)
          ? validationErrors.join(', ')
          : err.response.data.error || 'Validation failed';
        setError(errorMessage);
      } else {
        setError(err.response?.data?.error || 'Failed to create donor');
      }
    }
  };

  const handleCloseError = () => {
    setError(null);
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Donor</DialogTitle>
        <DialogContent>
          <DonorForm
            onSubmit={handleSubmit}
            donor={initialName ? { name: initialName, email: '' } as any : undefined}
          />
        </DialogContent>
      </Dialog>
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={handleCloseError}
      >
        <Alert
          onClose={handleCloseError}
          severity="error"
          sx={{ width: '100%' }}
        >
          {error}
        </Alert>
      </Snackbar>
    </>
  );
};
```

**Error Handling:**
- **422 Validation Errors**: Extract and display validation messages from backend
- **Network Errors**: Display generic error message
- **Error Array**: Join multiple validation errors with commas
- **Error Persistence**: Errors remain visible until user dismisses (6 second auto-hide)
- **Success Clears Errors**: Successful creation clears any previous error state

**Why Separate Components Instead of Generic:**
- Type safety (Donor vs Project vs Child types)
- Different API endpoints
- Different initial data structures
- Easier to maintain and test
- Follows existing SponsorshipModal pattern

**2. DonationForm Integration:**
```tsx
// src/components/DonationForm.tsx (UPDATED)
import AddIcon from '@mui/icons-material/Add';
import QuickDonorCreateDialog from './QuickDonorCreateDialog';
import QuickProjectCreateDialog from './QuickProjectCreateDialog';
import QuickChildCreateDialog from './QuickChildCreateDialog';

const DonationForm: React.FC<DonationFormProps> = ({ onSuccess }) => {
  // Existing state
  const [selectedDonor, setSelectedDonor] = useState<Donor | null>(null);
  const [selectedProjectOrChild, setSelectedProjectOrChild] = useState<Option | null>({
    id: 0,
    name: 'General Donation',
    type: 'project',
  });

  // New state for quick create dialogs
  const [donorDialogOpen, setDonorDialogOpen] = useState(false);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [childDialogOpen, setChildDialogOpen] = useState(false);

  const handleDonorCreated = (newDonor: Donor) => {
    setSelectedDonor(newDonor);
  };

  const handleProjectCreated = (newProject: Project) => {
    setSelectedProjectOrChild({
      id: newProject.id,
      name: newProject.title,
      type: 'project',
    });
  };

  const handleChildCreated = (newChild: Child) => {
    setSelectedProjectOrChild({
      id: newChild.id,
      name: newChild.name,
      type: 'child',
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack spacing={2}>
        {/* Existing ProjectOrChildAutocomplete */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
          <ProjectOrChildAutocomplete
            value={selectedProjectOrChild}
            onChange={setSelectedProjectOrChild}
            size="small"
          />
          <IconButton
            aria-label="create project"
            onClick={() => setProjectDialogOpen(true)}
            size="small"
          >
            <AddIcon />
          </IconButton>
          <IconButton
            aria-label="create child"
            onClick={() => setChildDialogOpen(true)}
            size="small"
          >
            <AddIcon />
          </IconButton>
        </Box>

        {/* Donor Autocomplete with Add Icon */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
          <DonorAutocomplete
            value={selectedDonor}
            onChange={setSelectedDonor}
            required={!selectedDonor}
            size="small"
          />
          <IconButton
            aria-label="create donor"
            onClick={() => setDonorDialogOpen(true)}
            size="small"
          >
            <AddIcon />
          </IconButton>
        </Box>

        {/* Existing form fields... */}
      </Stack>

      {/* Quick Create Dialogs */}
      <QuickDonorCreateDialog
        open={donorDialogOpen}
        onClose={() => setDonorDialogOpen(false)}
        onSuccess={handleDonorCreated}
      />
      <QuickProjectCreateDialog
        open={projectDialogOpen}
        onClose={() => setProjectDialogOpen(false)}
        onSuccess={handleProjectCreated}
      />
      <QuickChildCreateDialog
        open={childDialogOpen}
        onClose={() => setChildDialogOpen(false)}
        onSuccess={handleChildCreated}
      />
    </form>
  );
};
```

### UX Design

#### Icon Button Pattern
```
[Donation Form]
Donation For: [General Donation▼  ] [➕ Project] [➕ Child]
Donor:        [Search donor...▼   ] [➕]
Amount:       [$100.00              ]
Date:         [2025-11-12           ]
Payment:      [Check             ▼  ]

[Clicks ➕ next to Donor]

┌──────────────────────────────┐
│ Create New Donor             │
│                              │
│ Name:  [John Doe         ]   │
│ Email: [john@example.com ]   │
│                              │
│ [Submit]                     │
└──────────────────────────────┘
```

**Note:** No Cancel button in dialog (consistent with form component pattern)

### Implementation Strategy

**Phase 1: Donor Quick Creation** (3-4 hours)
1. Write tests for QuickDonorCreateDialog (TDD)
2. Create `QuickDonorCreateDialog.tsx` component (~150 lines)
3. Write tests for DonationForm donor dialog integration
4. Update DonationForm.tsx (add icon button, state, dialog)
5. Verify DonorForm.onSubmit signature works correctly (no changes needed)
6. Add Cypress E2E tests
7. Commit: `frontend: add quick donor creation to donation form (TICKET-021)`

**Phase 2: Project Quick Creation** (2-3 hours)
1. Write tests for QuickProjectCreateDialog (TDD)
2. Create `QuickProjectCreateDialog.tsx` component (~140 lines)
3. Write tests for DonationForm project dialog integration
4. Update DonationForm.tsx (add icon button for project)
5. Verify ProjectForm.onSubmit signature works correctly
6. Add Cypress E2E tests
7. Commit: `frontend: add quick project creation to donation form (TICKET-021)`

**Phase 3: Child Quick Creation** (2-3 hours)
1. Write tests for QuickChildCreateDialog (TDD)
2. Create `QuickChildCreateDialog.tsx` component (~140 lines)
3. Write tests for DonationForm child dialog integration
4. Update DonationForm.tsx (add icon button for child)
5. Verify ChildForm signature works correctly
6. Add Cypress E2E tests
7. Commit: `frontend: add quick child creation to donation form (TICKET-021)`

### Files to Create
- `src/components/QuickDonorCreateDialog.tsx` (NEW ~150 lines)
- `src/components/QuickProjectCreateDialog.tsx` (NEW ~140 lines)
- `src/components/QuickChildCreateDialog.tsx` (NEW ~140 lines)
- `src/components/QuickDonorCreateDialog.test.tsx` (NEW ~50 lines)
- `src/components/QuickProjectCreateDialog.test.tsx` (NEW ~50 lines)
- `src/components/QuickChildCreateDialog.test.tsx` (NEW ~50 lines)

### Files to Modify
- `src/components/DonationForm.tsx` (+140 lines for all 3 dialogs)
- `src/components/DonationForm.test.tsx` (+70 lines for integration tests)
- `cypress/e2e/donation-entry.cy.ts` (+60 lines for E2E tests)
- **No changes needed** to DonorForm, ProjectForm, ChildForm (already follow correct pattern)

### Testing Strategy

**Jest Unit Tests (QuickDonorCreateDialog - 6 tests):**

1. Renders with dialog title "Create New Donor"
2. Shows DonorForm inside dialog
3. Calls onSuccess with new donor when API succeeds
4. Closes dialog after successful creation
5. Shows validation error (422) in Snackbar when API returns validation errors
6. Shows generic error in Snackbar when API fails with network error

**Jest Unit Tests (DonationForm Integration - 3 tests per entity):**


1. Donor: Icon button opens dialog, created donor auto-selected in autocomplete
2. Project: Icon button opens dialog, created project auto-selected in autocomplete
3. Child: Icon button opens dialog, created child auto-selected in autocomplete

**Cypress E2E Tests (7 scenarios):**

1. Create donor via icon → complete donation → verify donor and donation created
2. Create donor with invalid email → verify validation error shown in Snackbar
3. Create project via icon → complete donation → verify project and donation created
4. Create project with missing title → verify validation error shown in Snackbar
5. Create child via icon → complete donation → verify child and donation created
6. Create child with missing name → verify validation error shown in Snackbar
7. Cancel dialog → verify donation form data preserved

### Estimated Time

- **Phase 1 (Donor):** 3-4 hours
- **Phase 2 (Project):** 2-3 hours
- **Phase 3 (Child):** 2-3 hours
- **Total:** 7-10 hours

### Related Tickets

- TICKET-017: Donor Autocomplete Search ✅ (DonorAutocomplete component)
- TICKET-052: ProjectOrChildAutocomplete ✅ (grouped autocomplete)
- TICKET-054: Create Sponsorship from Sponsorships Page ✅ (SponsorshipModal pattern reference)

### Key Corrections from Original Ticket

1. ❌ **Removed:** `embedded` prop pattern (not needed, forms already correct)
2. ✅ **Added:** Use SponsorshipModal pattern for consistency
3. ✅ **Added:** Proper error handling with Snackbar (422 validation + network errors)
4. ✅ **Updated:** Reference ProjectOrChildAutocomplete (current reality)
5. ✅ **Added:** API client integration details
6. ✅ **Updated:** Separate dialog components per entity (not generic)
7. ✅ **Clarified:** No changes needed to existing form components

### Notes

- **Pattern Consistency**: Follows SponsorshipModal pattern for entity creation dialogs
- **No Form Changes**: DonorForm, ProjectForm, ChildForm already follow correct pattern
- **State Management**: Use local component state (no global state needed)
- **Form Reuse**: Existing forms work as-is in dialog context
- **Mobile Friendly**: Material-UI Dialog is responsive
- **Type Safety**: Separate components per entity ensure proper TypeScript types
- **Error Handling**: All modals handle 422 validation errors AND network errors properly

### Success Criteria

- [ ] User can create donor/project/child without leaving donation page
- [ ] Donation form state preserved during entity creation
- [ ] Created entities immediately auto-selected in autocompletes
- [ ] All tests passing (Jest + Cypress)
- [ ] Error handling follows SponsorshipModal pattern (Snackbar)
- [ ] UX matches Children page "Add Sponsor" pattern (PersonAddIcon)
