## [TICKET-050] Children Page UI Standardization

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Started:** TBD
**Completed:** TBD
**Dependencies:** TICKET-049 (Child soft delete backend)
**Blocked by:** TICKET-049

### User Story
As a user, I want the Children page to have the same consistent layout and functionality as the Donors and Donations pages so that the interface is predictable and easy to use.

### Acceptance Criteria
- [ ] Remove "Add Child" button toggle pattern
- [ ] ChildForm is always visible (not conditionally rendered)
- [ ] Add h6 section header "Add Child" (or "Edit Child" when editing)
- [ ] Add h6 section header "List Children"
- [ ] Add search by name TextField with debouncing (300ms)
- [ ] Add "Show Archived Children" checkbox toggle
- [ ] ChildList displays archive/restore buttons based on child state
- [ ] Archive button soft deletes child via API
- [ ] Restore button unarchives child via API
- [ ] Search respects archived toggle state
- [ ] Pagination displays when total_pages > 1
- [ ] Visual indicators for archived children (opacity, chip, tooltip)
- [ ] **Display ALL sponsors per child** (not just first active)
- [ ] Show comma-separated list of sponsors with amounts
- [ ] Handle children with multiple active sponsorships
- [ ] Jest unit tests pass for all new functionality
- [ ] Cypress E2E tests validate archive/restore workflow

### Technical Notes
- **Pattern Reference**: Follow DonorsPage.tsx layout exactly (lines 98-179)
- **State Management**:
  - Add `searchQuery` and `debouncedQuery` state (like DonorsPage:12-13)
  - Add `showArchived` state (like DonorsPage:14)
  - Add `paginationMeta` state (like DonorsPage:18-23)
- **Search Implementation**: Debounce 300ms, reset to page 1 on search change
- **API Integration**: Use Ransack `q[name_cont]` param for search
- **Archive Toggle**: Pass `include_discarded=true` param when checked
- **Pagination**: Use Kaminari backend pagination with `PaginationConcern`

### Frontend Implementation Checklist
- [ ] **ChildrenPage.tsx Updates**:
  - [ ] Remove `showForm` state (line 10)
  - [ ] Remove "Add Child" button (lines 67-71)
  - [ ] Add `searchQuery` and `debouncedQuery` state
  - [ ] Add `showArchived` state
  - [ ] Add `paginationMeta` state
  - [ ] Add debounce useEffect for search (300ms)
  - [ ] Modify `fetchChildren` to use pagination and filters
  - [ ] Add `handleArchive` function (calls DELETE endpoint)
  - [ ] Add `handleRestore` function (calls POST restore endpoint)
  - [ ] Add `handlePageChange` function
  - [ ] Wrap ChildForm in Box with h6 "Add Child"/"Edit Child" header
  - [ ] Always render ChildForm (remove conditional)
  - [ ] Add Box wrapper for "List Children" section
  - [ ] Add search TextField before ChildList
  - [ ] Add "Show Archived Children" Checkbox
  - [ ] Add Pagination component after ChildList
  - [ ] Pass archive/restore handlers to ChildList

- [ ] **ChildList.tsx Updates**:
  - [ ] Add `onArchive` prop
  - [ ] Add `onRestore` prop
  - [ ] Add archive button for active children
  - [ ] Add restore button for archived children
  - [ ] Add visual indicators for archived state (opacity: 0.6)
  - [ ] Add Chip for archived status
  - [ ] Add Tooltip for accessibility
  - [ ] **Display ALL sponsors** (not just first active)
  - [ ] Show sponsor list in secondary text (e.g., "Sponsored by: John ($50/mo), Jane ($75/mo)")
  - [ ] Handle multiple active sponsorships per child
  - [ ] Update "No active sponsor" to "No sponsors" when none exist

- [ ] **API Client Updates** (if needed):
  - [ ] Verify `DELETE /api/children/:id` returns success
  - [ ] Verify `POST /api/children/:id/restore` returns success
  - [ ] Add TypeScript types for archive/restore responses

### UI/UX Design Specifications
**Layout Structure** (matching DonorsPage):
```tsx
<Box>
  <Typography variant="h4" component="h1">Children Management</Typography>

  <Box sx={{ mb: 4 }}>
    <Typography variant="h6" component="h2">
      {editingChild ? 'Edit Child' : 'Add Child'}
    </Typography>
    <ChildForm ... />
  </Box>

  <Box sx={{ mb: 4 }}>
    <Typography variant="h6" component="h2">List Children</Typography>
    <TextField placeholder="Search by name..." size="small" ... />
    <FormControlLabel
      control={<Checkbox checked={showArchived} ... />}
      label="Show Archived Children"
    />
    <ChildList ... />
  </Box>

  {paginationMeta.total_pages > 1 && <Pagination ... />}
</Box>
```

**Search Field**:
- Placeholder: "Search by name..."
- Size: small
- Full width
- Margin bottom: 2

**Archive Checkbox**:
- Label: "Show Archived Children"
- Margin bottom: 2

**Archived Child Visual Indicators**:
- Opacity: 0.6 (like DonorList)
- Chip: "Archived" (color: default, size: small)
- Tooltip: "This child is archived" (on hover)

### Testing Strategy
**Jest Unit Tests** (`ChildrenPage.test.tsx`):
- [ ] Renders "Add Child" heading
- [ ] Renders "List Children" heading
- [ ] Renders ChildForm always (no toggle button)
- [ ] Search field updates state on change
- [ ] Debounce delays search by 300ms
- [ ] Archive checkbox toggles showArchived state
- [ ] Pagination appears when total_pages > 1
- [ ] Archive button calls handleArchive
- [ ] Restore button calls handleRestore

**Jest Unit Tests** (`ChildList.test.tsx`):
- [ ] Displays archive button for active children
- [ ] Displays restore button for archived children
- [ ] Archived children have reduced opacity
- [ ] Archived chip appears on archived children
- [ ] Tooltip shows on hover over archived children
- [ ] Displays all active sponsors (multiple) correctly
- [ ] Shows "No sponsors" when child has no sponsorships
- [ ] Formats multiple sponsors as comma-separated list

**Cypress E2E Tests** (`children-page.cy.ts` - new file):
- [ ] Navigate to /children page
- [ ] Search for child by name
- [ ] Archive a child (verify API call)
- [ ] Verify child disappears from list
- [ ] Toggle "Show Archived Children"
- [ ] Verify archived child appears with visual indicators
- [ ] Restore archived child (verify API call)
- [ ] Verify child reappears in active list
- [ ] Test pagination navigation (if applicable)

### Files to Change
- `donation_tracker_frontend/src/pages/ChildrenPage.tsx`
- `donation_tracker_frontend/src/pages/ChildrenPage.test.tsx`
- `donation_tracker_frontend/src/components/ChildList.tsx`
- `donation_tracker_frontend/src/components/ChildList.test.tsx`
- `donation_tracker_frontend/src/types/child.ts` (if needed for archive types)
- `donation_tracker_frontend/cypress/e2e/children-page.cy.ts` (new)

### Accessibility Requirements
- All buttons have proper aria-labels
- Archived state announced to screen readers
- Keyboard navigation works for all controls
- Focus management when toggling edit mode
- Tooltips provide context for archive/restore actions

### Related Commits
- TBD

### Reference Tickets
- TICKET-001: Donor soft delete pattern (frontend reference)
- TICKET-030: Multi-page architecture refactoring
- TICKET-047: List styling standardization
- TICKET-049: Child soft delete backend (dependency)

### Reference Files
- `donation_tracker_frontend/src/pages/DonorsPage.tsx` (primary pattern reference)
- `donation_tracker_frontend/src/components/DonorList.tsx` (archive UI pattern)
