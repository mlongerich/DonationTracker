## [TICKET-120] Add Cancel Button to All Edit Forms for UX Consistency

**Status:** ❌ Canceled
**Priority:** 🟡 Medium
**Effort:** S (Small - 1-2 hours)
**Created:** 2025-11-18
**Updated:** 2025-11-18 (reversed direction - ADD Cancel buttons instead of removing)
**Canceled:** 2025-11-26
**Dependencies:** None
**Identified By:** CODE_SMELL_ANALYSIS (2025-11-18) + User Feedback

### Cancellation Reason

**Canceled by:** CODE_SMELL_ANALYSIS (2025-11-26)

**Reason:** Design decision reversed. Project pattern is **"No Cancel Buttons"** on forms (per TICKET-050 and CLAUDE.md conventions).

**New Direction:**
- Remove Cancel buttons from DonorForm and SponsorshipForm (opposite of this ticket's goal)
- Use close X button on dialogs instead of Cancel buttons
- See TICKET-127 for implementation of correct pattern

**Original Intent:** This ticket proposed adding Cancel buttons to ChildForm and ProjectForm to match DonorForm's pattern. However, the project standard is to NOT have Cancel buttons on forms.

### User Story
As a user, I want a Cancel button when editing entities so that I can easily exit edit mode without having to submit changes or navigate away from the page.

### Problem Statement

**Current Inconsistency:**
- **DonorForm:** ✅ Has Cancel button when editing (good UX)
- **ChildForm:** ❌ No Cancel button when editing (poor UX)
- **ProjectForm:** ❌ No Cancel button when editing (poor UX)
- **DonationForm:** N/A (not used for editing, only creation)

**User Impact:**
When editing a child or project, users have no obvious way to cancel their edits besides:
1. Navigating away (loses context)
2. Submitting unwanted changes
3. Refreshing the page (loses all state)

**New Direction (User Feedback):**
DonorForm's Cancel button provides better UX. We should ADD Cancel buttons to ChildForm and ProjectForm to match DonorForm's pattern, not remove it.

### Acceptance Criteria

#### ChildForm Changes
- [ ] Add `onCancel?: () => void` prop to ChildForm interface
- [ ] Add Cancel button (shown only when `initialData` is provided - edit mode)
- [ ] Update ChildrenPage to provide `handleCancel` callback
- [ ] Clicking Cancel clears `editingChild` state and exits edit mode
- [ ] Jest tests verify Cancel button appears in edit mode
- [ ] Jest tests verify Cancel button calls onCancel callback

#### ProjectForm Changes
- [ ] Add `onCancel?: () => void` prop to ProjectForm interface
- [ ] Add Cancel button (shown only when `project` prop is provided - edit mode)
- [ ] Update ProjectsPage to provide `handleCancel` callback
- [ ] Clicking Cancel clears `editingProject` state and exits edit mode
- [ ] Jest tests verify Cancel button appears in edit mode
- [ ] Jest tests verify Cancel button calls onCancel callback

#### Pattern Consistency
- [ ] All three forms (Donor, Child, Project) have Cancel button in edit mode
- [ ] Cancel button styling matches across all forms (outlined, secondary, fullWidth)
- [ ] Cancel button only appears when editing (not during creation)

### Technical Implementation

#### Pattern to Follow (from DonorForm.tsx)

```tsx
// Interface
interface FormProps {
  entity?: Entity;
  onSubmit?: (data: FormData) => void;
  onCancel?: () => void;  // ✅ Add this
}

// Component
function Form({ entity, onSubmit, onCancel }: FormProps) {
  return (
    <form onSubmit={handleSubmit}>
      <Stack spacing={2}>
        {/* Form fields */}

        <Button type="submit" variant="contained" color="primary" fullWidth>
          {entity ? 'Update' : 'Submit'}
        </Button>

        {/* ✅ Add Cancel button (only in edit mode) */}
        {entity && (
          <Button
            variant="outlined"
            color="secondary"
            fullWidth
            onClick={onCancel}
          >
            Cancel
          </Button>
        )}
      </Stack>
    </form>
  );
}
```

#### 1. ChildForm.tsx Changes

**Before:**
```tsx
// donation_tracker_frontend/src/components/ChildForm.tsx
interface ChildFormProps {
  onSubmit: (data: ChildFormData) => void;
  initialData?: ChildFormData;
  // No onCancel prop ❌
}

const ChildForm: React.FC<ChildFormProps> = ({ onSubmit, initialData }) => {
  return (
    <Stack spacing={2}>
      {/* Form fields */}
      <Button variant="contained" color="primary" fullWidth onClick={handleSubmit}>
        Submit
      </Button>
      {/* No Cancel button ❌ */}
    </Stack>
  );
};
```

**After:**
```tsx
// donation_tracker_frontend/src/components/ChildForm.tsx
interface ChildFormProps {
  onSubmit: (data: ChildFormData) => void;
  initialData?: ChildFormData;
  onCancel?: () => void;  // ✅ Add this
}

const ChildForm: React.FC<ChildFormProps> = ({ onSubmit, initialData, onCancel }) => {
  return (
    <Stack spacing={2}>
      {/* Form fields */}
      <Button variant="contained" color="primary" fullWidth onClick={handleSubmit}>
        {initialData ? 'Update' : 'Submit'}
      </Button>
      {/* ✅ Add Cancel button */}
      {initialData && (
        <Button
          variant="outlined"
          color="secondary"
          fullWidth
          onClick={onCancel}
        >
          Cancel
        </Button>
      )}
    </Stack>
  );
};
```

#### 2. ChildrenPage.tsx Changes

**Add handleCancel function:**
```tsx
// donation_tracker_frontend/src/pages/ChildrenPage.tsx
const handleCancel = () => {
  setEditingChild(null);
};

// Pass to ChildForm
<ChildForm
  onSubmit={handleChildSubmit}
  initialData={editingChild ? { name: editingChild.name, gender: editingChild.gender } : undefined}
  onCancel={handleCancel}  // ✅ Add this
/>
```

#### 3. ProjectForm.tsx Changes

**Before:**
```tsx
// donation_tracker_frontend/src/components/ProjectForm.tsx
interface ProjectFormProps {
  onSubmit: (data: ProjectFormData) => void;
  project?: Project;
  // No onCancel prop ❌
}

const ProjectForm: React.FC<ProjectFormProps> = ({ onSubmit, project }) => {
  return (
    <form onSubmit={handleSubmit}>
      <Stack spacing={2}>
        {/* Form fields */}
        <Button type="submit" variant="contained">
          {project ? 'Update Project' : 'Create Project'}
        </Button>
        {/* No Cancel button ❌ */}
      </Stack>
    </form>
  );
};
```

**After:**
```tsx
// donation_tracker_frontend/src/components/ProjectForm.tsx
interface ProjectFormProps {
  onSubmit: (data: ProjectFormData) => void;
  project?: Project;
  onCancel?: () => void;  // ✅ Add this
}

const ProjectForm: React.FC<ProjectFormProps> = ({ onSubmit, project, onCancel }) => {
  return (
    <form onSubmit={handleSubmit}>
      <Stack spacing={2}>
        {/* Form fields */}
        <Button type="submit" variant="contained" color="primary" fullWidth>
          {project ? 'Update Project' : 'Create Project'}
        </Button>
        {/* ✅ Add Cancel button */}
        {project && (
          <Button
            variant="outlined"
            color="secondary"
            fullWidth
            onClick={onCancel}
          >
            Cancel
          </Button>
        )}
      </Stack>
    </form>
  );
};
```

#### 4. ProjectsPage.tsx Changes

**Add handleCancel function:**
```tsx
// donation_tracker_frontend/src/pages/ProjectsPage.tsx
const handleCancel = () => {
  setEditingProject(null);
};

// Pass to ProjectForm
<ProjectForm
  onSubmit={handleProjectSubmit}
  project={editingProject || undefined}
  onCancel={handleCancel}  // ✅ Add this
/>
```

### User Experience

**Before (Inconsistent):**
- Donors page: Edit donor → see Cancel button ✅
- Children page: Edit child → NO Cancel button ❌ (must navigate away)
- Projects page: Edit project → NO Cancel button ❌ (must navigate away)
- **Result:** Confusing UX

**After (Consistent):**
- Donors page: Edit donor → see Cancel button ✅
- Children page: Edit child → see Cancel button ✅
- Projects page: Edit project → see Cancel button ✅
- **Result:** Predictable UX across all entity forms

**Exit Edit Mode Options:**
1. Click Cancel button (new for Child/Project)
2. Submit form to save changes
3. Click Edit on different entity (switches target)
4. Navigate to different page

### Testing Strategy

#### Jest Unit Tests (ChildForm)
1. Renders without Cancel button when creating new child
2. Renders with Cancel button when editing existing child
3. Calls onCancel callback when Cancel button clicked
4. Cancel button has correct styling (outlined, secondary, fullWidth)

#### Jest Unit Tests (ProjectForm)
1. Renders without Cancel button when creating new project
2. Renders with Cancel button when editing existing project
3. Calls onCancel callback when Cancel button clicked
4. Cancel button has correct styling (outlined, secondary, fullWidth)

#### Jest Unit Tests (ChildrenPage/ProjectsPage)
1. handleCancel function clears editing state
2. Clicking Cancel button exits edit mode
3. Form returns to "create" mode after Cancel

### Files to Modify

- `donation_tracker_frontend/src/components/ChildForm.tsx` (+15 lines - add onCancel prop + Cancel button)
- `donation_tracker_frontend/src/pages/ChildrenPage.tsx` (+5 lines - add handleCancel function)
- `donation_tracker_frontend/src/components/ProjectForm.tsx` (+15 lines - add onCancel prop + Cancel button)
- `donation_tracker_frontend/src/pages/ProjectsPage.tsx` (+5 lines - add handleCancel function)
- `donation_tracker_frontend/src/components/ChildForm.test.tsx` (+40 lines - Cancel button tests)
- `donation_tracker_frontend/src/components/ProjectForm.test.tsx` (+40 lines - Cancel button tests)
- `donation_tracker_frontend/src/pages/ChildrenPage.test.tsx` (+30 lines - handleCancel tests)
- `donation_tracker_frontend/src/pages/ProjectsPage.test.tsx` (+30 lines - handleCancel tests)

### Reference Files

- ✅ `donation_tracker_frontend/src/components/DonorForm.tsx` (lines 90-98) - Pattern to follow
- ✅ `donation_tracker_frontend/src/pages/DonorsPage.tsx` (lines 81-83, 107) - Page integration pattern

### Effort Justification

**Estimated Time:** 1-2 hours

**Breakdown:**
- Add Cancel to ChildForm + tests: 30 minutes
- Add handleCancel to ChildrenPage + tests: 15 minutes
- Add Cancel to ProjectForm + tests: 30 minutes
- Add handleCancel to ProjectsPage + tests: 15 minutes
- Manual testing: 10 minutes
- Commit + documentation update: 10 minutes

**Rationale:**
- Small, focused change (8 files)
- Straightforward pattern replication (DonorForm → ChildForm/ProjectForm)
- Improves UX consistency
- Low risk - additive change only

### CLAUDE.md Documentation Update

**After implementation, update CLAUDE.md Form Component Pattern section (lines 416-459):**

```markdown
#### Form Component Pattern

**Standard:** All form components follow consistent UX patterns for maintainability

**Button Configuration:**
- **Cancel button** - Shown ONLY when editing existing entity (not during creation)
  - Styling: `variant="outlined" color="secondary" fullWidth`
  - Callback: `onCancel` prop (optional, only used in edit mode)
  - Action: Clears editing state, returns form to create mode
- **Submit button:** Full-width, primary color (`variant="contained" color="primary" fullWidth`)
- **Placement:** Submit first, Cancel second (bottom of form)

**Example (ChildForm, DonorForm, ProjectForm):**
```tsx
<Box component="form" onSubmit={handleSubmit}>
  {/* Form fields */}
  <TextField label="Name" size="small" fullWidth required />

  {/* Submit button */}
  <Button type="submit" variant="contained" color="primary" fullWidth>
    {initialData ? 'Update' : 'Create'}
  </Button>

  {/* Cancel button (edit mode only) */}
  {initialData && (
    <Button variant="outlined" color="secondary" fullWidth onClick={onCancel}>
      Cancel
    </Button>
  )}
</Box>
```

**Props:**
- `onSubmit: (data: FormData) => Promise<void>` - Required
- `initialData?: FormData` - Optional (edit mode if provided)
- `onCancel?: () => void` - Optional (edit mode callback)
```

### Notes
- This is a **UX improvement**, not a bug fix
- Adds user-requested functionality (Cancel button)
- Makes all entity forms consistent
- Low risk - only adds optional functionality
- User feedback preferred Cancel button over no Cancel button

---

## Change Log

**2025-11-18: Ticket Created**
- Identified during CODE_SMELL_ANALYSIS review
- DonorForm is the only form with Cancel button
- Initial direction: Remove Cancel button for consistency

**2025-11-18: Direction Reversed (User Feedback)**
- User prefers Cancel button UX
- New direction: ADD Cancel buttons to ChildForm and ProjectForm
- Updated ticket to reflect new implementation plan
- Changed from "removal" ticket to "standardization" ticket
- Updated effort estimate: 30min → 1-2 hours
