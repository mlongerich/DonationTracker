## [TICKET-064] Smart Sponsorship Detection & Auto-Creation in Donation Form

**Status:** 🔵 Ready to Start
**Priority:** 🔴 High (Blocks TICKET-053)
**Effort:** L (Large - 6-8 hours)
**Created:** 2025-10-29
**Dependencies:** Backend sponsorship_id implementation ✅
**Blocks:** TICKET-053 (Sponsorships Page testing)

### User Story
As a user creating a donation to a sponsorship project, I want the system to automatically detect or create the appropriate sponsorship relationship, so that I don't have to manually manage sponsorship IDs or understand the technical relationship between donations and sponsorships.

### Problem Statement
After backend changes in TICKET-053, the system now requires:
- **Business Rule:** All donations to sponsorship-type projects MUST have a `sponsorship_id`
- **Current Gap:** DonationForm has no way to detect, create, or select sponsorships
- **User Impact:** Cannot create donations to sponsorship projects (validation error)

The system needs intelligent sponsorship detection that:
1. Searches for matching sponsorships based on project + donor
2. Auto-creates a sponsorship if none exists
3. Auto-selects if exactly one match
4. Prompts user to choose if multiple matches

### Acceptance Criteria

#### Smart Detection Logic
- [ ] When user selects sponsorship-type project AND donor, system searches for matching sponsorships
- [ ] Search parameters:
  - `project_id` = selected project
  - `donor_id` = selected donor
  - `end_date_null=true` (only active sponsorships)
- [ ] System uses Ransack query: `/api/sponsorships?q[project_id_eq]=X&q[donor_id_eq]=Y&q[end_date_null]=true`

#### 0 Matches → Auto-Create Sponsorship
- [ ] System auto-creates new sponsorship with:
  - `donor_id` from form
  - `child_id` from project (lookup via `project.sponsorships.first.child_id`)
  - `monthly_amount` = donation amount (best guess)
- [ ] Shows success Chip: "New sponsorship created for {child_name}"
- [ ] Uses created sponsorship_id for donation

#### 1 Match → Auto-Select
- [ ] System auto-selects the matching sponsorship
- [ ] Shows info Chip: "Sponsorship: {child_name} - ${amount}/month"
- [ ] Uses sponsorship_id for donation

#### 2+ Matches → User Selection Modal
- [ ] Shows "Select Sponsorship" button
- [ ] Clicking button opens Modal dialog
- [ ] Modal displays list of matching sponsorships with Radio buttons:
  - Child name
  - Monthly amount
  - Status (Active/Ended)
  - Start date
- [ ] Modal has Cancel and Confirm buttons
- [ ] User must select one sponsorship before confirming
- [ ] After confirmation, shows selected sponsorship in Chip
- [ ] Uses selected sponsorship_id for donation

#### General Donation Projects
- [ ] Non-sponsorship projects skip sponsorship detection entirely
- [ ] `sponsorship_id` remains null for general donations
- [ ] No chips or modals shown

#### Form Submission
- [ ] DonationForm includes `sponsorship_id` in API payload when present
- [ ] Backend accepts `sponsorship_id` parameter (already implemented)
- [ ] Backend validation passes (sponsorship projects have sponsorship_id)

### Technical Approach

#### Type Updates
```typescript
// src/types/donation.ts (already done)
export interface DonationFormData {
  amount: number;
  date: string;
  donor_id: number;
  project_id?: number | null;
  sponsorship_id?: number | null; // ✅ Added
  status?: string;
  description?: string;
}
```

#### API Client Update
```typescript
// src/api/client.ts
export const fetchSponsorshipsForDonation = async (
  projectId: number,
  donorId: number
): Promise<Sponsorship[]> => {
  const response = await apiClient.get('/api/sponsorships', {
    params: {
      per_page: 100, // Get all matches
      q: {
        project_id_eq: projectId,
        donor_id_eq: donorId,
        end_date_null: true
      }
    }
  });
  return response.data.sponsorships;
};

export const createSponsorship = async (data: SponsorshipFormData): Promise<Sponsorship> => {
  const response = await apiClient.post('/api/sponsorships', { sponsorship: data });
  return response.data.sponsorship;
};
```

#### DonationForm State
```typescript
const [selectedSponsorship, setSelectedSponsorship] = useState<Sponsorship | null>(null);
const [sponsorshipMatches, setSponsorshipMatches] = useState<Sponsorship[]>([]);
const [showSponsorshipModal, setShowSponsorshipModal] = useState(false);
const [sponsorshipAutoCreated, setSponsorshipAutoCreated] = useState(false);
```

#### Detection Logic
```typescript
useEffect(() => {
  const detectSponsorship = async () => {
    // Skip if not sponsorship project or no donor
    if (!projectId || !selectedDonor) {
      setSelectedSponsorship(null);
      return;
    }

    const selectedProject = projects.find(p => p.id === projectId);
    if (selectedProject?.project_type !== 'sponsorship') {
      setSelectedSponsorship(null);
      return;
    }

    // Search for matching sponsorships
    const matches = await fetchSponsorshipsForDonation(projectId, selectedDonor.id);
    setSponsorshipMatches(matches);

    if (matches.length === 0) {
      // Auto-create sponsorship
      const childId = await getChildIdFromProject(projectId); // Helper function
      const newSponsorship = await createSponsorship({
        donor_id: selectedDonor.id,
        child_id: childId,
        monthly_amount: parseFloat(amount) || 0
      });
      setSelectedSponsorship(newSponsorship);
      setSponsorshipAutoCreated(true);
    } else if (matches.length === 1) {
      // Auto-select single match
      setSelectedSponsorship(matches[0]);
      setSponsorshipAutoCreated(false);
    } else {
      // Multiple matches - require user selection
      setShowSponsorshipModal(true);
      setSponsorshipAutoCreated(false);
    }
  };

  detectSponsorship();
}, [projectId, selectedDonor, amount]);
```

#### UI Components

**Sponsorship Status Chip:**
```tsx
{selectedSponsorship && (
  <Chip
    label={
      sponsorshipAutoCreated
        ? `New sponsorship created for ${selectedSponsorship.child_name}`
        : `Sponsorship: ${selectedSponsorship.child_name} - $${selectedSponsorship.monthly_amount}/month`
    }
    color={sponsorshipAutoCreated ? "success" : "info"}
    size="small"
  />
)}
```

**Multiple Matches Button:**
```tsx
{sponsorshipMatches.length > 1 && !selectedSponsorship && (
  <Button
    variant="outlined"
    onClick={() => setShowSponsorshipModal(true)}
  >
    Select Sponsorship ({sponsorshipMatches.length} matches)
  </Button>
)}
```

**Selection Modal:**
```tsx
<Dialog open={showSponsorshipModal} onClose={() => setShowSponsorshipModal(false)}>
  <DialogTitle>Select Sponsorship</DialogTitle>
  <DialogContent>
    <RadioGroup value={selectedSponsorship?.id} onChange={handleSponsorshipChange}>
      {sponsorshipMatches.map(sponsorship => (
        <FormControlLabel
          key={sponsorship.id}
          value={sponsorship.id}
          control={<Radio />}
          label={`${sponsorship.child_name} - $${sponsorship.monthly_amount}/month (${sponsorship.active ? 'Active' : 'Ended'})`}
        />
      ))}
    </RadioGroup>
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setShowSponsorshipModal(false)}>Cancel</Button>
    <Button onClick={handleConfirmSponsorship} disabled={!selectedSponsorship}>
      Confirm
    </Button>
  </DialogActions>
</Dialog>
```

#### Submission Update
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  // ... existing validation

  await createDonation({
    amount: parseFloat(amount),
    date,
    donor_id: selectedDonor.id,
    project_id: projectId,
    sponsorship_id: selectedSponsorship?.id || null, // ✅ Include sponsorship_id
  });

  // ... rest of submission
};
```

### Helper Functions

**Get Child ID from Project:**
```typescript
const getChildIdFromProject = async (projectId: number): Promise<number> => {
  // Fetch project's existing sponsorships to find child_id
  const response = await apiClient.get(`/api/projects/${projectId}/sponsorships`);
  if (response.data.sponsorships.length > 0) {
    return response.data.sponsorships[0].child_id;
  }
  throw new Error('Cannot determine child for sponsorship project');
};
```

**Alternative:** Backend could return `child_id` in Project API response for sponsorship-type projects.

### Files to Modify
- ✅ `src/types/donation.ts` - Add sponsorship_id to DonationFormData
- `src/api/client.ts` - Add fetchSponsorshipsForDonation, createSponsorship
- `src/components/DonationForm.tsx` - Add detection logic, state, UI components
- `src/components/DonationForm.test.tsx` - Add tests for all scenarios
- `src/pages/DonationsPage.test.tsx` - Update integration tests

### Test Plan

**Jest Unit Tests:**
1. ✅ DonationFormData type includes optional sponsorship_id
2. Auto-detection triggers when sponsorship project + donor selected
3. Auto-detection skips for general projects
4. 0 matches → Auto-creates sponsorship and shows success chip
5. 1 match → Auto-selects and shows info chip
6. 2+ matches → Shows "Select Sponsorship" button
7. Modal opens with list of sponsorships
8. Modal selection updates selected sponsorship
9. Modal confirmation closes dialog and shows chip
10. Form submission includes sponsorship_id in payload
11. Backend validation passes (no 422 error)

**Cypress E2E Test:**
- Navigate to Donations page
- Select sponsorship project
- Select donor
- Verify sponsorship chip appears (auto-created or auto-selected)
- Enter amount and date
- Submit donation
- Verify donation created successfully
- Verify sponsorship relationship exists in database

### Edge Cases
- **No child_id for project:** Show error, prevent submission
- **API errors during detection:** Show error Alert, allow retry
- **Auto-create fails:** Show error, allow manual sponsorship creation
- **User changes project/donor:** Clear selected sponsorship, re-run detection
- **User changes amount:** Update auto-created sponsorship's monthly_amount

### Related Tickets
- TICKET-053: Sponsorships Page Filters (blocked by this ticket)
- Backend sponsorship_id implementation (completed in TICKET-053)

### Notes
- This is a **pure frontend feature** (backend already supports all required operations)
- No new API endpoints needed (uses existing /api/sponsorships)
- Detection logic runs client-side using Ransack queries
- Auto-creation provides seamless UX (user doesn't need to understand sponsorship concept)
- Modal provides flexibility for edge cases (multiple active sponsorships per child)

### Success Criteria
- ✅ User can create donations to sponsorship projects without manual sponsorship_id entry
- ✅ System intelligently detects/creates/selects sponsorships
- ✅ All backend validations pass (sponsorship projects have sponsorship_id)
- ✅ TICKET-053 unblocked and can continue with testing
