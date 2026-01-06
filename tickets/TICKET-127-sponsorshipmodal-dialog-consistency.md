## [TICKET-127] StandardDialog Component + Form/Dialog UX Consistency

**Status:** ✅ Complete
**Priority:** 🟡 Medium
**Effort:** L (Large - 4-6 hours)
**Created:** 2025-11-19
**Updated:** 2026-01-06 (Marked complete - implementation finished 2025-12-07)
**Completed:** 2025-12-07
**Dependencies:** TICKET-021 (QuickDonorCreateDialog UX patterns)
**Supersedes:** TICKET-120 (Canceled - opposite direction)

### User Story
As a user, I want all forms and dialogs to follow the same UX patterns (conditional Cancel buttons in edit mode, close X on dialogs, full-width Submit buttons) so that the application feels consistent and predictable.

As a developer, I want a reusable StandardDialog component to eliminate duplication and ensure future dialogs are automatically consistent.

**Implementation Note:** The final implementation evolved to use **conditional Cancel buttons** (edit mode only) rather than "no Cancel anywhere." This proved to be a better UX pattern as it provides a clear exit from edit mode while maintaining simplicity in create mode. See CLAUDE.md lines 736-805 for the implemented pattern.

### Problem Statement

**Design Pattern Identified:** CODE_SMELL_ANALYSIS (2025-11-26) found inconsistencies and duplication:

**Dialog Duplication Issues:**
- 3 dialogs (SponsorshipModal, QuickDonorCreateDialog, QuickEntityCreateDialog) share 60-80 lines of identical boilerplate
- Close button (X) implementation duplicated across dialogs
- Snackbar error handling duplicated across dialogs
- Dialog sizing/padding duplicated across dialogs
- **Total duplication:** ~180-240 lines that could be eliminated

**SponsorshipModal Issues:**
- No close button (X) in dialog title (inconsistent with QuickDonorCreateDialog)
- SponsorshipForm has Cancel button (violates "No Cancel" pattern)

**SponsorshipForm Issues:**
- Has Cancel button in modal context (violates pattern - modal has close X)
- Form used in both modal and page contexts

**ProjectForm Issues:**
- Submit button missing `fullWidth` prop (inconsistent with other forms)

**Implemented Pattern (Evolved from TICKET-050):**
- ✅ **Conditional Cancel buttons** - edit mode only for inline page forms
- ✅ NO Cancel in create mode (users navigate away) or modal forms (close X)
- ✅ Close X button on dialogs for clear exit
- ✅ Full-width Submit buttons on all forms
- ✅ Extract shared components when duplicated in 2+ places (CLAUDE.md)
- ✅ Error color on Cancel (visual distinction from primary action)

### Acceptance Criteria

#### StandardDialog Component Creation ✅ COMPLETE
- [x] Create `src/components/StandardDialog.tsx` with interface:
  - `open: boolean` - Dialog open state
  - `onClose: () => void` - Close handler
  - `title: string` - Dialog title
  - `children: React.ReactNode` - Form/content to render
  - `error?: string | null` - Optional error message
  - `onErrorClose?: () => void` - Error dismissal handler
  - `maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'` - Dialog width (default 'sm')
- [x] Includes close button (X) with CloseIcon in DialogTitle (absolute positioned, right: 8, top: 8)
- [x] Standard Dialog props: `maxWidth={maxWidth} fullWidth`
- [x] Standard DialogContent padding: `sx={{ pt: 3 }}`
- [x] Standard content Box wrapper: `sx={{ mt: 1 }}`
- [x] Integrated Snackbar + Alert error handling (renders when error prop provided)
- [x] Jest tests (5 tests):
  - Renders title correctly
  - Renders children correctly
  - Close button calls onClose when clicked
  - Error Snackbar displays when error prop provided
  - Custom maxWidth prop applies correctly

#### Dialog Refactoring ✅ COMPLETE
- [x] Refactor SponsorshipModal to use StandardDialog (~40 lines, down from 82)
  - Keep `handleSubmit` API logic
  - Pass title as `Add Sponsor for ${childName}`
  - Pass error state to StandardDialog
  - Remove `onCancel={onClose}` prop from SponsorshipForm
- [x] Refactor QuickDonorCreateDialog to use StandardDialog (~40 lines, down from 105)
  - Keep `handleSubmit` API logic and pre-fill handling
  - Pass title as "Create New Donor"
  - Pass error state to StandardDialog
- [x] Refactor QuickEntityCreateDialog to use StandardDialog (handle tabs + 2 errors)
  - Keep tabs and dual-entity logic
  - May need custom wrapper or conditional rendering
  - Handle childError and projectError states
- [x] All existing dialog tests pass without modification

#### SponsorshipForm Changes (Remove Cancel Button) ✅ COMPLETE
- [x] Remove `onCancel` prop from interface (line 10)
- [x] Remove Cancel button from Stack (lines 67-69)
- [x] Make Submit button `fullWidth` and `color="primary"` for consistency
- [x] Update SponsorshipsPage to remove `onCancel` prop (no longer passed)
- [x] Jest tests verify Cancel button NOT present (1 test)
- [x] Jest tests verify Submit button is fullWidth (1 test)

#### ProjectForm Changes (Add fullWidth to Submit) ✅ COMPLETE
- [x] Add `fullWidth` and `color="primary"` props to Submit button (line 72)
- [x] Jest test verifies Submit button is fullWidth (1 test)

#### CLAUDE.md Documentation Update ✅ COMPLETE
- [x] Add new "StandardDialog Pattern" section with:
  - Purpose and when to use
  - Interface documentation
  - Usage example
  - Reference to TICKET-127
  - **Location:** CLAUDE.md lines 621-694
- [x] Update "Form Component Pattern" section:
  - Document **"Conditional Cancel" pattern** (evolved from original "No Cancel" plan)
  - Add reference to TICKET-050 and TICKET-127
  - Examples show conditional Cancel logic
  - **Location:** CLAUDE.md lines 736-805
- [x] Update "Shared Component Pattern" section to list StandardDialog

#### Pattern Consistency Verification ✅ COMPLETE
- [x] All forms follow conditional Cancel pattern: DonationForm ✅, ChildForm ✅, ProjectForm ✅, SponsorshipForm ✅ (modal-only, no Cancel), DonorForm ✅
- [x] All dialogs use StandardDialog: QuickDonorCreateDialog ✅, QuickEntityCreateDialog ✅, SponsorshipModal ✅
- [x] All Submit buttons are fullWidth: DonationForm ✅, ChildForm ✅, ProjectForm ✅, SponsorshipForm ✅, DonorForm ✅

### Technical Approach

**✅ IMPLEMENTED (2025-12-07)** - The sections below document the original plan. The actual implementation evolved to use **conditional Cancel buttons** (edit mode only) for inline page forms, which is documented in CLAUDE.md lines 736-805. All other aspects (StandardDialog component, dialog refactoring, fullWidth buttons) were implemented as planned.

**Create generic dialog wrapper to eliminate duplication:**

```tsx
// src/components/StandardDialog.tsx
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  IconButton,
  Snackbar,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface StandardDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  error?: string | null;
  onErrorClose?: () => void;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const StandardDialog: React.FC<StandardDialogProps> = ({
  open,
  onClose,
  title,
  children,
  error = null,
  onErrorClose,
  maxWidth = 'sm',
}) => (
  <>
    <Dialog open={open} onClose={onClose} maxWidth={maxWidth} fullWidth>
      <DialogTitle>
        {title}
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <Box sx={{ mt: 1 }}>{children}</Box>
      </DialogContent>
    </Dialog>
    {error && (
      <Snackbar open={!!error} autoHideDuration={6000} onClose={onErrorClose}>
        <Alert onClose={onErrorClose} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    )}
  </>
);

export default StandardDialog;
```

#### 2. SponsorshipModal Refactor

**Before (82 lines):**
```tsx
<Dialog open={open} onClose={onClose}>
  <DialogTitle>Add Sponsor for {childName}</DialogTitle>
  <DialogContent>
    <SponsorshipForm
      childId={childId}
      onSubmit={handleSubmit}
      onCancel={onClose}  // ❌ Remove this
    />
  </DialogContent>
</Dialog>
<Snackbar>...</Snackbar>  // 20+ lines of error handling
```

**After (~40 lines):**
```tsx
import StandardDialog from './StandardDialog';

const SponsorshipModal: React.FC<SponsorshipModalProps> = ({
  open,
  childId,
  childName,
  onClose,
  onSuccess,
}) => {
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: SponsorshipFormData) => {
    try {
      await apiClient.post('/api/sponsorships', { sponsorship: data });
      onSuccess();
      onClose();
    } catch (err: any) {
      if (err.response?.status === 422) {
        const errorMessage = err.response.data.errors?.[0] || 'Validation error';
        setError(errorMessage);
      } else {
        setError('An unexpected error occurred');
      }
    }
  };

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title={`Add Sponsor for ${childName}`}
      error={error}
      onErrorClose={() => setError(null)}
    >
      <SponsorshipForm childId={childId} onSubmit={handleSubmit} />
    </StandardDialog>
  );
};
```

#### 3. SponsorshipForm.tsx Changes ✅ IMPLEMENTED

**Note:** The implementation correctly removed Cancel button from SponsorshipForm because it's modal-only (dialogs have close X button). Other inline page forms (ChildForm, DonorForm, ProjectForm) got conditional Cancel buttons for edit mode.

**Before:**
```tsx
interface SponsorshipFormProps {
  onSubmit: (data: SponsorshipFormData) => void;
  childId?: number;
  onCancel: () => void;  // ❌ Remove this
}

const SponsorshipForm: React.FC<SponsorshipFormProps> = ({
  onSubmit,
  childId,
  onCancel,  // ❌ Remove this
}) => {
  return (
    <Stack spacing={2}>
      {/* Form fields */}
      <Stack direction="row" spacing={2}>
        <Button variant="contained" onClick={handleSubmit}>Submit</Button>
        <Button variant="outlined" onClick={onCancel}>Cancel</Button>  {/* ❌ Remove */}
      </Stack>
    </Stack>
  );
};
```

**After:**
```tsx
interface SponsorshipFormProps {
  onSubmit: (data: SponsorshipFormData) => void;
  childId?: number;
  // onCancel removed ✅
}

const SponsorshipForm: React.FC<SponsorshipFormProps> = ({
  onSubmit,
  childId,
}) => {
  return (
    <Stack spacing={2}>
      {/* Form fields */}
      <Button
        variant="contained"
        color="primary"
        fullWidth  // ✅ Add this
        onClick={handleSubmit}
      >
        Submit
      </Button>
      {/* Cancel button removed ✅ */}
    </Stack>
  );
};
```

#### 4. ProjectForm.tsx Changes ✅ IMPLEMENTED

**Before:**
```tsx
<Button type="submit" variant="contained" disabled={!title.trim()}>
  {project ? 'Update Project' : 'Create Project'}
</Button>
```

**After:**
```tsx
<Button
  type="submit"
  variant="contained"
  color="primary"
  fullWidth  // ✅ Add this
  disabled={!title.trim()}
>
  {project ? 'Update Project' : 'Create Project'}
</Button>
```

#### 5. SponsorshipsPage.tsx Changes ✅ IMPLEMENTED

**Remove `onCancel` prop from SponsorshipForm (no longer exists):**

```tsx
// Before:
<SponsorshipForm
  onSubmit={handleCreateSponsorship}
  onCancel={() => setShowForm(false)}  // ❌ Remove this line
/>

// After:
<SponsorshipForm
  onSubmit={handleCreateSponsorship}
  // onCancel removed ✅
/>
```

**User can cancel by navigating away or clicking elsewhere on page.**

#### 6. CLAUDE.md Documentation Update ✅ IMPLEMENTED

**Update "Form Component Pattern" section (lines ~416-459):**

```markdown
#### Form Component Pattern

**Standard:** All form components follow consistent UX patterns for maintainability

**Button Configuration:**
- **NO Cancel button** - Forms embedded in pages (user can navigate away naturally)
- **Submit button:** Full-width, primary color (`variant="contained" color="primary" fullWidth`)
- **Placement:** Bottom of form

**Example (All Forms: DonationForm, ChildForm, ProjectForm, SponsorshipForm):**
```tsx
<Box component="form" onSubmit={handleSubmit}>
  {/* Form fields */}
  <TextField label="Name" size="small" fullWidth required />

  {/* Submit button */}
  <Button type="submit" variant="contained" color="primary" fullWidth>
    {initialData ? 'Update' : 'Create'}
  </Button>
</Box>
```

**Props:**
- `onSubmit: (data: FormData) => Promise<void>` - Required
- `initialData?: FormData` - Optional (edit mode if provided)

**Rationale:**
- Embedded forms don't need Cancel (user navigates away via page links)
- Full-width Submit button is more prominent and mobile-friendly
- Consistent across all forms

**See:** TICKET-050 (ChildForm consistency), TICKET-127 (SponsorshipForm consistency)
```

#### 7. Files Modified/Created ✅ COMPLETE (2025-12-07)

**New Files:**
- `src/components/StandardDialog.tsx` (+60 lines - new generic dialog component)
- `src/components/StandardDialog.test.tsx` (+80 lines - 5 comprehensive tests)

**Modified Files:**
- `src/components/SponsorshipModal.tsx` (-42 lines - refactor to use StandardDialog, remove boilerplate)
- `src/components/QuickDonorCreateDialog.tsx` (-65 lines - refactor to use StandardDialog)
- `src/components/QuickEntityCreateDialog.tsx` (-40 lines - refactor to use StandardDialog with tabs)
- `src/components/SponsorshipForm.tsx` (-10 lines - remove onCancel prop, remove Cancel button, add fullWidth)
- `src/components/ProjectForm.tsx` (+2 lines - add fullWidth + color to Submit button)
- `src/pages/SponsorshipsPage.tsx` (-1 line - remove onCancel prop)
- `src/components/SponsorshipForm.test.tsx` (+10 lines - verify no Cancel, verify fullWidth)
- `src/components/ProjectForm.test.tsx` (+10 lines - verify fullWidth + color)
- `CLAUDE.md` (+60 lines - add StandardDialog Pattern section, update Form Component Pattern)

**Net Change:**
- +140 lines (StandardDialog + tests + docs)
- -157 lines (duplication removed from 3 dialogs + form fixes)
- **Total:** -17 lines with significantly better maintainability

#### 8. Tests Added/Modified ✅ COMPLETE (2025-12-07)

**StandardDialog.test.tsx (NEW):**
1. `it('renders title correctly')`
2. `it('renders children correctly')`
3. `it('close button calls onClose when clicked')`
4. `it('displays error Snackbar when error prop provided')`
5. `it('applies custom maxWidth prop correctly')`

**Existing Dialog Tests:**
- SponsorshipModal.test.tsx - No changes needed (StandardDialog tested separately)
- QuickDonorCreateDialog.test.tsx - No changes needed
- QuickEntityCreateDialog.test.tsx - No changes needed

**SponsorshipForm.test.tsx:**
6. `it('does not render Cancel button')`
7. `it('Submit button is fullWidth and primary color')`

**ProjectForm.test.tsx:**
8. `it('Submit button is fullWidth and primary color')`

### Related Tickets
- TICKET-050: ChildForm UI Consistency (established "No Cancel" pattern) ✅ Complete
- TICKET-021: Quick Entity Creation (established dialog UX patterns) ✅ Complete
- TICKET-054: Create Sponsorship from Sponsorships Page (original SponsorshipModal implementation) ✅ Complete
- TICKET-120: Add Cancel Button to All Edit Forms (CANCELED - opposite direction) ❌

### Notes
- This is a consistency improvement, not a bug fix
- Enforces "No Cancel Button" pattern established in TICKET-050 and documented in CLAUDE.md
- Fixes CODE_SMELL_ANALYSIS findings (2025-11-26)
- DonorForm will need similar treatment in separate ticket (has Cancel button, violates pattern)

---

## Change Log

**2025-12-07: ✅ COMPLETED**
- All work completed and merged (commits: 554c03c, 6336d98)
- StandardDialog component created and tested (5 comprehensive tests)
- 3 dialogs refactored to use StandardDialog (SponsorshipModal, QuickDonorCreateDialog, QuickEntityCreateDialog)
- SponsorshipForm Cancel button removed (modal-only form, dialog has close X)
- ProjectForm Submit button made fullWidth + color="primary"
- **Implementation Evolution:** Conditional Cancel pattern adopted instead of "no Cancel anywhere"
  - Inline page forms (ChildForm, DonorForm, ProjectForm) got conditional Cancel in edit mode
  - Modal forms (SponsorshipForm) have no Cancel (dialog close X instead)
  - CREATE mode: No Cancel (user navigates away)
  - EDIT mode: YES Cancel (exits edit mode)
- CLAUDE.md updated with StandardDialog Pattern (lines 621-694) and Form Component Pattern (lines 736-805)
- All E2E tests pass (58/58)
- Net result: -17 lines of code with significantly better maintainability

**2025-12-05: Major Scope Expansion - StandardDialog Component**
- Added StandardDialog generic component creation (eliminates 180-240 lines duplication)
- Refactor 3 dialogs to use StandardDialog (SponsorshipModal, QuickDonorCreateDialog, QuickEntityCreateDialog)
- Renamed ticket to "StandardDialog Component + Form/Dialog UX Consistency"
- Updated effort from M (2-3 hours) to L (4-6 hours)
- Updated status to In Progress
- Added comprehensive StandardDialog tests (5 tests)
- Added CLAUDE.md "StandardDialog Pattern" section
- Benefits: Net -17 lines, much better maintainability, single source of truth for dialogs

**2025-11-26: Expanded Scope**
- Added SponsorshipForm Cancel button removal (was causing pattern violation)
- Added ProjectForm fullWidth fix (small UX consistency issue)
- Added CLAUDE.md documentation update
- Renamed ticket to "Form & Dialog UX Consistency (No Cancel Buttons)"
- Updated effort from S (1-2 hours) to M (2-3 hours)
- Updated priority from Low to Medium
- Added supersedes TICKET-120 (opposite direction)

**2025-11-19: Original Creation**
- Focus: SponsorshipModal close button only
- Small effort (1-2 hours)
- Low priority
