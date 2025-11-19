## [TICKET-127] SponsorshipModal Dialog UX Consistency

**Status:** 📋 Planned
**Priority:** 🟢 Low
**Effort:** S (Small - 1-2 hours)
**Created:** 2025-11-19
**Dependencies:** TICKET-021 (QuickDonorCreateDialog UX patterns)

### User Story
As a user, I want the "Add Sponsor" dialog to have the same UX patterns as the "Create New Donor" dialog so that the application feels consistent.

### Problem Statement
SponsorshipModal lacks UX features that were added to QuickDonorCreateDialog during TICKET-021 Phase 1:
- No close button (X) in dialog title
- No clear indication of how to cancel/close

### Acceptance Criteria
- [ ] Add close button (X) with CloseIcon to DialogTitle
- [ ] Close button calls onClose when clicked
- [ ] Dialog has same sizing as QuickDonorCreateDialog (maxWidth="sm" fullWidth)
- [ ] DialogContent has same padding (pt: 3) and Box wrapper (mt: 1)
- [ ] Jest tests for close button (2 tests)
- [ ] All existing tests still pass

### Technical Approach

**Pattern to follow:** QuickDonorCreateDialog (src/components/QuickDonorCreateDialog.tsx)

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
        onCancel={onClose}
      />
    </Box>
  </DialogContent>
</Dialog>
```

**Files to modify:**
- `src/components/SponsorshipModal.tsx` (+10 lines - add CloseIcon, update Dialog props, add Box wrapper)
- `src/components/SponsorshipModal.test.tsx` (+15 lines - 2 new tests for close button)

**Tests to add:**
1. `it('shows close button in dialog title')`
2. `it('close button closes dialog')`

### Related Tickets
- TICKET-021: Quick Entity Creation (established dialog UX patterns)
- TICKET-054: Create Sponsorship from Sponsorships Page (original SponsorshipModal implementation)

### Notes
- This is a consistency improvement, not a bug fix
- Low priority - can be done anytime after TICKET-021 Phase 1 complete
- Same pattern can be applied to other modals in the future if needed
