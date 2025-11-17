## [TICKET-117] Standardize Admin Page Card Design

**Status:** 📋 Planned
**Priority:** 🟢 Low
**Size:** XS (Extra Small)
**Dependencies:** None
**Created:** 2025-11-17

---

### User Story
As a user, I want consistent card styling across the Admin Page so that the interface looks polished and professional.

---

### Context

**Why:** Current Admin Page cards have inconsistent styling compared to other list views in the application.

**Current State:**
- DonationList, ChildList, DonorList, ProjectList all follow TICKET-047 standardization
- Admin Page PendingReviewDonationList has different card styling

**Scope:** Apply TICKET-047 card styling patterns to Admin Page

---

### Acceptance Criteria

- [ ] Admin Page donation cards match styling from other list pages
- [ ] Consistent spacing (padding, margins)
- [ ] Consistent typography (font sizes, weights)
- [ ] Consistent colors (text, backgrounds, borders)
- [ ] Consistent hover effects
- [ ] Consistent card shadows/elevation
- [ ] Visual regression test or screenshot comparison

---

### Technical Approach

#### Review TICKET-047 Card Styling Standards

```tsx
// Standard card pattern from TICKET-047
<Card sx={{ mb: 2 }}>
  <CardContent>
    <Stack spacing={2}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h6">{title}</Typography>
        <Chip label={status} size="small" />
      </Box>
      <Typography variant="body2" color="text.secondary">
        {details}
      </Typography>
    </Stack>
  </CardContent>
</Card>
```

#### Update PendingReviewDonationList

```tsx
// src/components/PendingReviewDonationList.tsx
// Apply same card structure, spacing, and styling as DonationList
<Card sx={{ mb: 2 }}>  {/* ✅ Consistent margin-bottom */}
  <CardContent>
    <Stack spacing={2}>  {/* ✅ Consistent internal spacing */}
      {/* ... content ... */}
    </Stack>
  </CardContent>
</Card>
```

---

### Files to Modify
- `src/components/PendingReviewDonationList.tsx` (apply TICKET-047 standards)
- Optional: Extract shared card style constants if duplication is high

---

### Testing Strategy

**Visual Regression:**
```typescript
// Cypress visual test
it('matches card styling across pages', () => {
  cy.visit('/donations');
  cy.get('[data-testid="donation-card"]').first().screenshot('donation-card');

  cy.visit('/admin');
  cy.get('[data-testid="pending-review-card"]').first().screenshot('pending-card');

  // Compare screenshots (manual or using cypress-image-diff plugin)
});
```

**Manual Verification:**
1. Open /donations page
2. Note card styling (spacing, colors, shadows)
3. Open /admin page
4. Compare - should be identical

---

### Success Criteria

- [ ] Admin cards visually match other list pages
- [ ] No layout shifts or inconsistencies
- [ ] Passes visual regression test (if implemented)
- [ ] Code review confirms TICKET-047 patterns applied

---

### Notes
- **Reference:** TICKET-047 (Consistent Material-UI Card Styling for Lists)
- **Scope:** Styling only, no functional changes
- **Quick Win:** Simple visual polish, low effort, high perceived quality
- **Future:** Consider extracting shared `<DonationCard>` component to enforce consistency (TICKET-031 pattern)

---

### Related Tickets
- **TICKET-047:** List Styling Standardization (pattern to follow)
- **TICKET-031:** Extract DonorAutocomplete (shared component pattern)

---

*Created: 2025-11-17*
*Admin Page UX improvement - Visual consistency*
