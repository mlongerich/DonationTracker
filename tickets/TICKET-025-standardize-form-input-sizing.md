## [TICKET-025] Standardize Form Input Sizing Across Application

**Status:** 📋 Planned
**Priority:** 🟢 Low
**Dependencies:** None

### User Story
As a user, I want consistent form input sizing throughout the application so that the UI looks cohesive and professional.

### Problem Statement
Currently, form inputs have inconsistent sizing across different sections:
- **Add Donor** section: TextField inputs use default `medium` size
- **Record Donation** section: TextField, DatePicker, and Autocomplete use default `medium` size
- **Recent Donations** filters: All inputs use `size="small"` (DatePickers, Autocomplete)
- **Donors** section: Action buttons use `size="small"`

This creates a visual inconsistency where the main forms (Add Donor, Record Donation) have larger inputs than the filter components.

### Acceptance Criteria
- [ ] All TextField components use `size="small"` consistently
- [ ] All DatePicker components use `size="small"` consistently
- [ ] All Autocomplete components use `size="small"` consistently
- [ ] All Button components use `size="small"` (or appropriate sizing)
- [ ] Consider adding MUI theme defaults for consistent sizing
- [ ] Update existing components to match new standard
- [ ] Verify visual consistency across all sections

### Technical Approach

#### Option 1: Component-Level Changes (Recommended)
Update each component individually to add `size="small"` prop:
- Pros: Explicit, easy to review, no breaking changes
- Cons: More verbose, requires touching multiple files

#### Option 2: Theme-Level Defaults
Set default size in `theme.ts` using component overrides:
```typescript
components: {
  MuiTextField: {
    defaultProps: {
      size: 'small',
    },
  },
  MuiAutocomplete: {
    defaultProps: {
      size: 'small',
    },
  },
}
```
- Pros: DRY principle, applies to all future components
- Cons: Less explicit, could affect third-party components

#### Recommended: Hybrid Approach
1. Add theme defaults for new components
2. Update existing components explicitly for clarity
3. Document the standard in CLAUDE.md

### Implementation Plan
1. **Audit Current State**: Document all TextField, DatePicker, Autocomplete usages
2. **Update DonorForm**: Add `size="small"` to Name and Email TextFields
3. **Update DonationForm**: Add `size="small"` to Amount, Date, and Donor fields
4. **Verify DonationList**: Confirm already using `size="small"` (✓)
5. **Verify DonorList**: Confirm buttons using `size="small"` (✓)
6. **Theme Defaults** (Optional): Add MUI theme component overrides
7. **Visual QA**: Test all forms in browser to verify consistency
8. **Documentation**: Update CLAUDE.md with input sizing standards

### Files to Change
- `src/components/DonorForm.tsx` (lines 71, 77 - add size prop)
- `src/components/DonationForm.tsx` (lines 121+, DatePicker, Autocomplete)
- `src/theme.ts` (optional - add component defaults)
- `CLAUDE.md` (document MUI component sizing standards)

### Benefits
- **Visual Consistency**: Professional, cohesive UI appearance
- **Better UX**: Compact inputs improve space utilization
- **Future-Proof**: Theme defaults ensure new components follow standard
- **Accessibility**: Smaller inputs still meet WCAG touch target guidelines (MUI handles this)

### Design Notes
- MUI `size="small"` reduces height from 56px to 40px
- Touch targets remain accessible (Material Design guidelines)
- Maintains proper spacing and padding
- Labels and helper text scale appropriately

### Testing Checklist
- [ ] DonorForm inputs render at small size
- [ ] DonationForm inputs render at small size
- [ ] All forms remain responsive on mobile
- [ ] Focus states work correctly
- [ ] Validation error messages display properly
- [ ] Autocomplete dropdowns align correctly

### Related Tickets
- None (UI improvement ticket)

### Estimated Effort
- 1-2 hours (simple prop additions + testing)
- Low risk, high visual impact
