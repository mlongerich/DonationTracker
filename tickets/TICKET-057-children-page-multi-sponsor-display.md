## [TICKET-057] Children Page Multi-Sponsor Display

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Effort:** S (Small - 1-2 hours)
**Created:** 2025-10-22
**Dependencies:** TICKET-010 (Children page exists) ✅

### User Story

As a user viewing the Children page, I want to see ALL sponsors for each child (not just one), so that I have complete visibility into who is supporting each child.

### Problem Statement

Currently, the Children page only displays ONE sponsor per child:
- Shows: "Sponsored by John Doe ($50/month)"
- Hidden: Other active sponsors for the same child
- Issue: Cannot see full sponsorship picture at a glance

**Expected Behavior:**
- Show ALL active sponsors in a readable format
- Example: "Sponsored by: John Doe ($50/mo), Jane Smith ($75/mo), Bob Johnson ($100/mo)"
- If no sponsors: "No active sponsors"

### Acceptance Criteria

#### Frontend Changes

- [ ] Update `ChildList.tsx` to display ALL active sponsorships
  - [ ] Map through all sponsorships for child
  - [ ] Filter to only active sponsorships (`sponsorship.active === true`)
  - [ ] Format: "Sponsored by: [Name] ($XX/mo), [Name] ($YY/mo)"
  - [ ] If no active sponsors: "No active sponsors"
  - [ ] Test: 4 tests
    - Shows single sponsor
    - Shows multiple sponsors
    - Shows "No active sponsors" when all ended
    - Shows "No active sponsors" when none exist

- [ ] Update display styling
  - [ ] Use Chip components for each sponsor (optional - better UX)
  - [ ] Or comma-separated list (simpler)
  - [ ] Consistent with Material-UI design

#### Backend (No Changes Needed)

- ✅ API already returns all sponsorships per child
- ✅ Backend filtering works correctly
- ✅ No backend changes required

### Technical Approach

**Current Implementation (shows one):**
```tsx
{sponsorships.get(child.id)?.[0] ? (
  <Typography>
    Sponsored by {sponsorships.get(child.id)?.[0].donor_name}
    (${sponsorships.get(child.id)?.[0].monthly_amount}/month)
  </Typography>
) : (
  <Typography>No active sponsor</Typography>
)}
```

**New Implementation (shows all):**
```tsx
{(() => {
  const childSponsorships = sponsorships.get(child.id) || [];
  const activeSponsors = childSponsorships.filter(s => s.active);

  if (activeSponsors.length === 0) {
    return <Typography color="text.secondary">No active sponsors</Typography>;
  }

  const sponsorText = activeSponsors
    .map(s => `${s.donor_name} ($${s.monthly_amount}/mo)`)
    .join(', ');

  return <Typography>Sponsored by: {sponsorText}</Typography>;
})()}
```

**Alternative with Chips (Better UX):**
```tsx
<Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
  {activeSponsors.map(s => (
    <Chip
      key={s.id}
      label={`${s.donor_name} ($${s.monthly_amount}/mo)`}
      size="small"
      color="primary"
      variant="outlined"
    />
  ))}
</Box>
```

### Files to Modify

**Frontend:**
- `src/components/ChildList.tsx` - Update sponsor display logic
- `src/components/ChildList.test.tsx` - Add 4 new tests

### Test Plan

**Jest Unit Tests (4 new):**
1. Displays single active sponsor correctly
2. Displays multiple active sponsors separated by commas
3. Shows "No active sponsors" when all sponsorships ended
4. Shows "No active sponsors" when no sponsorships exist

### Related Tickets

- TICKET-010: Children page implementation ✅
- TICKET-056: One project per child (affects how sponsorships are grouped)

### Notes

**Why Medium Priority:**
- UI improvement, not a blocker
- Current functionality works (shows at least one sponsor)
- But important for full visibility

**Design Decision:**
- **Option 1:** Comma-separated list (simpler, less visual clutter)
- **Option 2:** Chip components (better visual separation, easier to scan)
- **Recommendation:** Start with Option 1, can upgrade to Option 2 later
