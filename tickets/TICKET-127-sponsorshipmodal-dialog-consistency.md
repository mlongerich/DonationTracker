## [TICKET-127] Form & Dialog UX Consistency (No Cancel Buttons)

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Effort:** M (Medium - 2-3 hours)
**Created:** 2025-11-19
**Updated:** 2025-11-26 (Expanded scope: Remove Cancel buttons, add ProjectForm fix)
**Dependencies:** TICKET-021 (QuickDonorCreateDialog UX patterns)
**Supersedes:** TICKET-120 (Canceled - opposite direction)

### User Story
As a user, I want all forms and dialogs to follow the same UX patterns (no Cancel buttons, close X on dialogs, full-width Submit buttons) so that the application feels consistent and predictable.

### Problem Statement

**Design Pattern Identified:** CODE_SMELL_ANALYSIS (2025-11-26) found inconsistencies:

**SponsorshipModal Issues:**
- No close button (X) in dialog title
- SponsorshipForm has Cancel button (violates "No Cancel" pattern)

**SponsorshipForm Issues:**
- Has Cancel button in two locations (SponsorshipModal, SponsorshipsPage)
- Cancel button violates established pattern (per TICKET-050 and CLAUDE.md)

**ProjectForm Issues:**
- Submit button missing `fullWidth` prop (inconsistent with other forms)

**Project Pattern (Established in TICKET-050):**
- ✅ NO Cancel buttons on forms (users can navigate away or close dialogs)
- ✅ Close X button on dialogs for clear exit
- ✅ Full-width Submit buttons on all forms

### Acceptance Criteria

#### SponsorshipModal Changes (Dialog Consistency)
- [ ] Add close button (X) with CloseIcon to DialogTitle
- [ ] Close button calls onClose when clicked
- [ ] Dialog has same sizing as QuickDonorCreateDialog (maxWidth="sm" fullWidth)
- [ ] DialogContent has same padding (pt: 3) and Box wrapper (mt: 1)
- [ ] Remove `onCancel={onClose}` prop from SponsorshipForm (no longer needed)
- [ ] Jest tests for close button (2 tests)

#### SponsorshipForm Changes (Remove Cancel Button)
- [ ] Remove `onCancel` prop from interface (line 10)
- [ ] Remove Cancel button from Stack (lines 63-69)
- [ ] Make Submit button `fullWidth` for consistency
- [ ] Update SponsorshipsPage to remove `onCancel` prop (no longer passed)
- [ ] Jest tests verify Cancel button NOT present (1 test)
- [ ] Jest tests verify Submit button is fullWidth (1 test)

#### ProjectForm Changes (Add fullWidth to Submit)
- [ ] Add `fullWidth` prop to Submit button (line 72)
- [ ] Jest test verifies Submit button is fullWidth (1 test)

#### CLAUDE.md Documentation Update
- [ ] Update "Form Component Pattern" section to document "No Cancel" pattern
- [ ] Add reference to TICKET-050 and TICKET-127 as establishing pattern
- [ ] Remove references to Cancel buttons in examples

#### Pattern Consistency Verification
- [ ] All forms follow pattern: DonationForm ✅, ChildForm ✅, ProjectForm ✅, SponsorshipForm ✅, DonorForm ⚠️ (separate ticket)
- [ ] All dialogs have close X button: QuickDonorCreateDialog ✅, QuickEntityCreateDialog ✅, SponsorshipModal ✅
- [ ] All Submit buttons are fullWidth: DonationForm ✅, ChildForm ✅, ProjectForm ✅, SponsorshipForm ✅, DonorForm ✅

### Technical Approach

#### 1. SponsorshipModal.tsx Changes

**Before:**
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
```

**After (pattern from QuickDonorCreateDialog):**
```tsx
import CloseIcon from '@mui/icons-material/Close';

<Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
  <DialogTitle>
    Add Sponsor for {childName}
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
    <Box sx={{ mt: 1 }}>
      <SponsorshipForm
        childId={childId}
        onSubmit={handleSubmit}
        // onCancel removed ✅
      />
    </Box>
  </DialogContent>
</Dialog>
```

#### 2. SponsorshipForm.tsx Changes

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

#### 3. ProjectForm.tsx Changes

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

#### 4. SponsorshipsPage.tsx Changes

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

#### 5. CLAUDE.md Documentation Update

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

#### 6. Files to Modify

- `src/components/SponsorshipModal.tsx` (+15 lines - add CloseIcon, Box wrapper, update Dialog props, remove onCancel)
- `src/components/SponsorshipForm.tsx` (-10 lines - remove onCancel prop, remove Cancel button, add fullWidth)
- `src/components/ProjectForm.tsx` (+2 lines - add fullWidth to Submit button)
- `src/pages/SponsorshipsPage.tsx` (-1 line - remove onCancel prop)
- `src/components/SponsorshipModal.test.tsx` (+15 lines - 2 new tests for close button)
- `src/components/SponsorshipForm.test.tsx` (+10 lines - verify no Cancel, verify fullWidth)
- `src/components/ProjectForm.test.tsx` (+10 lines - verify fullWidth)
- `CLAUDE.md` (update Form Component Pattern section)

#### 7. Tests to Add/Modify

**SponsorshipModal.test.tsx:**
1. `it('shows close button in dialog title')`
2. `it('close button closes dialog')`

**SponsorshipForm.test.tsx:**
3. `it('does not render Cancel button')`
4. `it('Submit button is fullWidth')`

**ProjectForm.test.tsx:**
5. `it('Submit button is fullWidth')`

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
