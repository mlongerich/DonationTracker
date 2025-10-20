## [TICKET-047] Consistent Material-UI Card Styling for Lists

**Status:** 🔵 In Progress
**Priority:** 🟡 Medium
**Started:** 2025-10-20
**Dependencies:** TICKET-020 (DonationForm Material-UI styling complete)

### User Story
As a user, I want all list components (DonationList, ProjectList) to have the same professional Card-based styling as DonorList so that the application has a consistent, modern look and feel.

### Acceptance Criteria
- [ ] DonationList uses Material-UI Card components instead of plain `<ul><li>`
- [ ] ProjectList uses Material-UI Card components instead of plain `<ul><li>`
- [ ] Empty state messages use Typography with text.secondary color
- [ ] Match DonorList's Card variant="outlined" styling pattern
- [ ] ProjectList uses IconButtons with Tooltips for actions (matching DonorList pattern)
- [ ] Project type displayed as Chip badge
- [ ] System projects show disabled state (no edit/delete actions)
- [ ] All Jest tests pass after styling changes
- [ ] Cypress E2E tests verify visual consistency
- [ ] Maintain mobile-responsive layout

### Technical Notes

#### DonationList Changes (lines 175-187)
**Current**: Plain `<ul><li>` elements
**Target**: Card-based layout matching DonorList

**Material-UI Components to Add**:
- `Card` with `variant="outlined"`
- `CardContent` for card body
- `Typography` for text content
- `Stack` for card container

**Layout Pattern**:
```typescript
<Stack spacing={2}>
  {donations.map((donation) => (
    <Card key={donation.id} variant="outlined">
      <CardContent>
        <Typography variant="subtitle1">
          ${donation.amount.toFixed(2)}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {donation.date} - {donation.donor_name} - {donation.project_title}
        </Typography>
      </CardContent>
    </Card>
  ))}
</Stack>
```

#### ProjectList Changes (lines 12-35)
**Current**: Plain `<ul><li>` with inline Button components
**Target**: Card-based layout matching DonorList

**Material-UI Components to Add**:
- `Card` with `variant="outlined"`
- `CardContent` for card body
- `Box` for flex layout
- `Typography` for text content
- `Chip` for project type badge
- `IconButton` with `Tooltip` for actions
- `EditIcon` and `DeleteIcon` from @mui/icons-material
- `Stack` for card container

**Layout Pattern**:
```typescript
<Stack spacing={2}>
  {projects.map((project) => (
    <Card key={project.id} variant="outlined">
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle1">{project.title}</Typography>
              <Chip label={project.project_type} size="small" />
            </Box>
          </Box>
          {!project.system && (
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Tooltip title="Edit project">
                <IconButton aria-label="edit" size="small" onClick={() => onEdit(project)}>
                  <EditIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete project">
                <IconButton aria-label="delete" size="small" onClick={() => onDelete(project)}>
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  ))}
</Stack>
```

### TDD Implementation Workflow
1. **RED**: Update DonationList tests to expect Card components (one test at a time)
2. **GREEN**: Implement Card-based layout in DonationList (minimal code)
3. **REFACTOR**: Improve code quality when all tests pass
4. **RED**: Update ProjectList tests to expect Card components (one test at a time)
5. **GREEN**: Implement Card-based layout in ProjectList (minimal code)
6. **REFACTOR**: Improve code quality when all tests pass
7. Run all Jest tests (verify 100% pass rate)
8. Run Cypress E2E tests (visual consistency verification)

### Benefits
- **Consistency**: All lists use same Card-based Material-UI pattern
- **Professional**: Matches modern design standards
- **Accessible**: IconButtons with tooltips, semantic HTML, ARIA labels
- **Maintainable**: Clear separation between form styling (TICKET-020) and list styling (TICKET-047)
- **Mobile-responsive**: Material-UI Card components are inherently responsive

### Files Changed
- `donation_tracker_frontend/src/components/DonationList.tsx`
- `donation_tracker_frontend/src/components/DonationList.test.tsx`
- `donation_tracker_frontend/src/components/ProjectList.tsx`
- `donation_tracker_frontend/src/components/ProjectList.test.tsx`
- `donation_tracker_frontend/cypress/e2e/*.cy.ts` (if selectors need updates)

### Related Commits
- (To be added during implementation)
