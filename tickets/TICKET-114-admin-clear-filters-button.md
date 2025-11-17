## [TICKET-114] Add Clear Filters Button to Admin Page

**Status:** 📋 Planned
**Priority:** 🟢 Low
**Size:** XS (Extra Small)
**Dependencies:** None
**Created:** 2025-11-17

---

### User Story
As an admin, I want a "Clear Filters" button on the Admin Page so that I can quickly reset all filters (status, date range) to their default state without manually clearing each field.

---

### Context

**Why:** Currently users must manually clear each filter field to reset the view. A single "Clear" button improves UX.

**Current State:** Admin Page has status dropdown and date range filters, but no clear button

**Scope:** Add a "Clear Filters" button that resets all filter state to defaults

---

### Acceptance Criteria

- [ ] Add "Clear Filters" button next to filter controls
- [ ] Button resets status filter to "All Statuses" (or undefined)
- [ ] Button clears both From Date and To Date fields
- [ ] Button triggers re-fetch with cleared filters
- [ ] Button is disabled when no filters are active
- [ ] Button styling matches existing UI (outlined variant)
- [ ] Add frontend test for clear button behavior

---

### Technical Approach

```tsx
// src/pages/AdminPage.tsx
const handleClearFilters = () => {
  setStatusFilter(undefined);
  setFromDate(null);
  setToDate(null);
  // Filters will automatically re-fetch via useEffect dependency
};

const hasActiveFilters = statusFilter !== undefined || fromDate !== null || toDate !== null;

// In render:
<Button
  variant="outlined"
  onClick={handleClearFilters}
  disabled={!hasActiveFilters}
>
  Clear Filters
</Button>
```

---

### Files to Modify
- `src/pages/AdminPage.tsx` (add clear button and handler)
- `src/pages/AdminPage.test.tsx` (add test for clear button)

---

### Testing Strategy

```typescript
it('clears all filters when Clear button clicked', () => {
  render(<AdminPage />);

  // Set filters
  fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'failed' } });
  fireEvent.change(screen.getByLabelText('From Date'), { target: { value: '2025-01-01' } });

  // Click clear
  fireEvent.click(screen.getByText('Clear Filters'));

  // Verify filters cleared
  expect(screen.getByLabelText('Status')).toHaveValue('');
  expect(screen.getByLabelText('From Date')).toHaveValue('');
});

it('disables Clear button when no filters active', () => {
  render(<AdminPage />);
  expect(screen.getByText('Clear Filters')).toBeDisabled();
});
```

---

### Success Criteria

- [ ] Clear button appears on Admin Page
- [ ] Button resets all filters when clicked
- [ ] Button disabled when no filters active
- [ ] Tests pass
- [ ] No console errors

---

### Notes
- Simple UX improvement
- Follow existing button styling patterns
- Disable when no filters to prevent confusion

---

*Created: 2025-11-17*
*Admin Page UX improvement*
