## [TICKET-120] Remove Cancel Button from DonorForm for Pattern Consistency

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Effort:** XS (Extra Small - 30 minutes)
**Created:** 2025-11-18
**Dependencies:** None
**Identified By:** CODE_SMELL_ANALYSIS (2025-11-18)

### User Story
As a developer, I want DonorForm to follow the established Form Component Pattern so that all forms in the application have consistent UX and behavior.

### Problem Statement

DonorForm currently has a Cancel button (lines 90-98), which violates the documented **Form Component Pattern** (CLAUDE.md lines 416-459).

**Pattern Violation:**
```tsx
// DonorForm.tsx (INCONSISTENT ❌)
{donor && (
  <Button variant="outlined" color="secondary" fullWidth onClick={onCancel}>
    Cancel
  </Button>
)}
```

**Expected Pattern (from ChildForm, DonationForm, ProjectForm):**
```tsx
// ✅ Correct pattern - No Cancel button
<Button type="submit" variant="contained" color="primary" fullWidth>
  {initialData ? 'Update' : 'Create'}
</Button>
```

**Root Cause:** DonorForm was created before the "No Cancel button" pattern was established in TICKET-050.

**Why This Matters:**
1. **UI Inconsistency:** Users see Cancel button on Donors page, but not on Children/Donations/Projects pages
2. **Pattern Confusion:** Future contributors may add Cancel buttons to other forms
3. **Code Maintenance:** DonorsPage still has `onCancel` callback and `handleCancel` logic that's unused elsewhere

### Acceptance Criteria
- [ ] Remove Cancel button from DonorForm.tsx (lines 90-98)
- [ ] Remove `onCancel` prop from DonorForm interface (line 12)
- [ ] Remove `handleCancel` function from DonorsPage.tsx (lines 100-102)
- [ ] Remove `onCancel={handleCancel}` from DonorForm usage in DonorsPage.tsx (line 121)
- [ ] Update DonorForm tests to verify no Cancel button exists
- [ ] Verify "Edit Donor" mode still allows user to clear form by creating new donor
- [ ] All existing tests pass (DonorForm + DonorsPage)

### Technical Implementation

#### 1. DonorForm.tsx Changes

**Before:**
```tsx
// donation_tracker_frontend/src/components/DonorForm.tsx
interface DonorFormProps {
  donor?: Donor;
  onSubmit?: (data: DonorFormData) => void;
  onCancel?: () => void;  // ❌ Remove this
}

function DonorForm({ donor, onSubmit, onCancel }: DonorFormProps) {
  // ...
  return (
    <form onSubmit={handleSubmit}>
      <Stack spacing={2}>
        {/* ... form fields ... */}
        <Button type="submit" variant="contained" color="primary" fullWidth>
          {donor ? 'Update' : 'Submit'}
        </Button>
        {donor && (  // ❌ Remove this entire block
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

**After:**
```tsx
// donation_tracker_frontend/src/components/DonorForm.tsx
interface DonorFormProps {
  donor?: Donor;
  onSubmit?: (data: DonorFormData) => void;
  // onCancel removed ✅
}

function DonorForm({ donor, onSubmit }: DonorFormProps) {
  // ...
  return (
    <form onSubmit={handleSubmit}>
      <Stack spacing={2}>
        {/* ... form fields ... */}
        <Button type="submit" variant="contained" color="primary" fullWidth>
          {donor ? 'Update' : 'Submit'}
        </Button>
        {/* Cancel button removed ✅ */}
      </Stack>
    </form>
  );
}
```

#### 2. DonorsPage.tsx Changes

**Before:**
```tsx
// donation_tracker_frontend/src/pages/DonorsPage.tsx:100-102
const handleCancel = () => {
  setEditingDonor(null);
};

// Line 121
<DonorForm
  donor={editingDonor || undefined}
  onSubmit={handleDonorSubmit}
  onCancel={handleCancel}  // ❌ Remove this
/>
```

**After:**
```tsx
// donation_tracker_frontend/src/pages/DonorsPage.tsx
// handleCancel function removed ✅

// Line 121 (updated)
<DonorForm
  donor={editingDonor || undefined}
  onSubmit={handleDonorSubmit}
  // onCancel removed ✅
/>
```

#### 3. Test Updates

**DonorForm.test.tsx:**
```tsx
// Add test to verify no Cancel button
it('should not render cancel button', () => {
  const mockDonor = { id: 1, name: 'John Doe', email: 'john@example.com' };
  render(<DonorForm donor={mockDonor} />);

  expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
});
```

**DonorsPage.test.tsx:**
```tsx
// Remove or update any tests that expect handleCancel behavior
// Verify edit mode still works without Cancel button
it('allows user to exit edit mode by creating new donor', async () => {
  const mockDonors = [{ id: 1, name: 'John Doe', email: 'john@example.com' }];
  // ... test implementation
});
```

### User Experience

**Before (Inconsistent):**
- Donors page: Edit donor → see Cancel button → click Cancel → exit edit mode
- Children page: Edit child → NO Cancel button → must submit or navigate away
- **Result:** Confusing UX

**After (Consistent):**
- ALL pages: Edit mode → NO Cancel button → submit or navigate away
- **Result:** Predictable UX across all forms

**Alternative Exit Strategies (user still has options):**
1. Navigate to different page via Navigation menu
2. Submit form to complete edit
3. Click "Edit" on a different donor (switches edit target)

### Testing Strategy

**Jest Unit Tests:**
1. DonorForm renders without Cancel button
2. DonorForm interface does not accept onCancel prop
3. DonorsPage does not have handleCancel function
4. Edit mode still works correctly
5. All existing DonorForm tests pass
6. All existing DonorsPage tests pass

**Manual Testing:**
1. Edit donor → verify no Cancel button
2. Edit donor → submit form → verify edit completes
3. Edit donor → navigate to Children page → return to Donors page → verify state reset

### Files to Modify
- `donation_tracker_frontend/src/components/DonorForm.tsx` (remove Cancel button + onCancel prop)
- `donation_tracker_frontend/src/pages/DonorsPage.tsx` (remove handleCancel + onCancel usage)
- `donation_tracker_frontend/src/components/DonorForm.test.tsx` (add test for no Cancel button)
- `donation_tracker_frontend/src/pages/DonorsPage.test.tsx` (update/remove Cancel-related tests)

### Reference Files
- ✅ `donation_tracker_frontend/src/components/ChildForm.tsx` (correct pattern - no Cancel button)
- ✅ `donation_tracker_frontend/src/components/DonationForm.tsx` (correct pattern - no Cancel button)
- ✅ `donation_tracker_frontend/src/components/ProjectForm.tsx` (correct pattern - no Cancel button)
- ✅ TICKET-050 (established "No Cancel button" pattern for ChildForm)
- ✅ CLAUDE.md lines 416-459 (Form Component Pattern documentation)

### Related Tickets
- ✅ TICKET-050: Children Page UI Standardization (established the pattern)
- Part of CODE_SMELL_ANALYSIS initiative (2025-11-18)

### Effort Justification

**Estimated Time:** 30 minutes

**Breakdown:**
- Remove Cancel button from DonorForm: 5 minutes
- Remove onCancel from DonorsPage: 5 minutes
- Update tests: 10 minutes
- Manual testing: 5 minutes
- Commit + documentation: 5 minutes

**Rationale:**
- Very small change (4 file edits)
- No new functionality - only removal
- Tests already comprehensive, minimal updates needed
- Pattern already established in 3 other forms

### Notes
- This is a **consistency fix**, not a bug fix
- No user-facing functionality changes (users can still exit edit mode via navigation)
- Aligns with pattern established in TICKET-050
- Low risk - only affects Donors page
- Can be bundled with other small UI consistency fixes if desired

---

## Change Log

**2025-11-18: Ticket Created**
- Identified during CODE_SMELL_ANALYSIS review
- DonorForm is the only form with Cancel button
- Pattern documented in CLAUDE.md (TICKET-050)
- Medium priority - affects UX consistency
