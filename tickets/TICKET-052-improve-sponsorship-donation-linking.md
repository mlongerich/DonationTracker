## [TICKET-052] Improve Sponsorship Donation Linking in DonationForm

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Effort:** M (Medium - 2-3 hours)
**Created:** 2025-10-21
**Dependencies:** TICKET-010 (Sponsorship model complete) ✅

### User Story
As a user recording donations, I want to easily identify and select sponsorship projects so that I can correctly attribute donations to specific child sponsorships without confusion.

### Problem Statement
**Current Behavior:**
- DonationForm has Project dropdown showing ALL projects (general, campaign, sponsorship)
- Sponsorship projects have titles like "Sponsor Maria"
- No visual distinction between project types
- User must know/remember which projects are sponsorships
- Easy to select wrong project type

**Example Confusion:**
```
Project Dropdown:
- General Fund
- Sponsor Maria       <-- Is this a sponsorship? (yes)
- School Supplies     <-- Is this a sponsorship? (no, campaign)
- Sponsor Juan        <-- Is this a sponsorship? (yes)
```

### Acceptance Criteria

#### Option A: Enhanced Project Dropdown with Type Grouping
- [ ] Group projects by `project_type` using Material-UI optgroup
- [ ] Display format: "{Title} ({Type})" e.g., "Sponsor Maria (Sponsorship)"
- [ ] Order: Sponsorships first, then Campaigns, then General
- [ ] Color-coded chips/badges by type

#### Option B: Separate Sponsorship Toggle (RECOMMENDED)
- [ ] Add "Is this donation for a child sponsorship?" checkbox/toggle
- [ ] **If YES:**
  - [ ] Show ChildAutocomplete component (search by child name)
  - [ ] Fetch active sponsorship for selected child
  - [ ] Auto-populate `projectId` from `sponsorship.project_id`
  - [ ] Display: "Sponsoring {ChildName} - ${MonthlyAmount}/month"
- [ ] **If NO:**
  - [ ] Show Project dropdown (filter OUT sponsorship projects)
  - [ ] Only show general and campaign projects
- [ ] Clear, mutually exclusive UI paths

#### Option C: Side-by-Side Selection
- [ ] Two separate selection areas on form
- [ ] Left: "Child Sponsorship" with ChildAutocomplete
- [ ] Right: "Other Project" with Project dropdown
- [ ] Radio buttons to choose which applies

#### General UX Improvement (All Options)
- [ ] When user selects a project with `project_type === 'sponsorship'`, auto-populate donation amount to $100
- [ ] User can still manually override the pre-populated amount
- [ ] Provides sensible default for typical sponsorship donation amounts

### Recommended Approach: Option B (Toggle-Based)

**Benefits:**
- ✅ Clear user intent captured upfront
- ✅ Prevents accidental wrong project type selection
- ✅ Reuses existing ChildAutocomplete component (DRY)
- ✅ Simpler mental model for users
- ✅ Scales well if we add more project types

**User Workflow:**
```
1. User checks "Is this for child sponsorship?"
   → YES path:
     2a. Search for child name (autocomplete)
     3a. Select child
     4a. System auto-fills project from active sponsorship
     5a. User sees "Sponsoring Maria - $50/month"

   → NO path:
     2b. Select from non-sponsorship projects dropdown
     3b. Shows only General/Campaign projects
```

### Technical Implementation (Option B)

#### Backend Changes

**1. New API Endpoint:**
```ruby
# GET /api/children/:id/active_sponsorship
# Returns active sponsorship with project_id for donation linking
```

**Controller:**
```ruby
class Api::ChildrenController < ApplicationController
  def active_sponsorship
    child = Child.find(params[:id])
    sponsorship = child.sponsorships.active.first

    if sponsorship
      render json: {
        sponsorship: {
          id: sponsorship.id,
          project_id: sponsorship.project_id,
          monthly_amount: sponsorship.monthly_amount,
          child_name: child.name
        }
      }
    else
      render json: { error: "No active sponsorship for this child" }, status: 404
    end
  end
end
```

**Routes:**
```ruby
resources :children do
  member do
    get :active_sponsorship
  end
end
```

**Tests:**
- [ ] RSpec request spec: GET /api/children/:id/active_sponsorship success
- [ ] RSpec request spec: 404 when no active sponsorship
- [ ] RSpec request spec: excludes ended sponsorships

#### Frontend Changes

**1. DonationForm.tsx Updates:**

```tsx
const [isSponsorshipDonation, setIsSponsorshipDonation] = useState(false);
const [selectedChild, setSelectedChild] = useState<Child | null>(null);
const [sponsorshipInfo, setSponsorshipInfo] = useState<{
  monthly_amount: number;
  child_name: string;
} | null>(null);

// Fetch sponsorship when child selected
useEffect(() => {
  if (selectedChild && isSponsorshipDonation) {
    fetchActiveSponsorshipForChild(selectedChild.id).then(data => {
      setProjectId(data.sponsorship.project_id);
      setSponsorshipInfo({
        monthly_amount: data.sponsorship.monthly_amount,
        child_name: data.sponsorship.child_name
      });
    });
  }
}, [selectedChild, isSponsorshipDonation]);

// Filter projects based on toggle
const availableProjects = isSponsorshipDonation
  ? [] // Hide project dropdown when sponsorship selected
  : projects.filter(p => p.project_type !== 'sponsorship');
```

**2. UI Layout:**
```tsx
<FormControlLabel
  control={
    <Checkbox
      checked={isSponsorshipDonation}
      onChange={(e) => setIsSponsorshipDonation(e.target.checked)}
    />
  }
  label="Is this donation for a child sponsorship?"
/>

{isSponsorshipDonation ? (
  <>
    <ChildAutocomplete
      value={selectedChild}
      onChange={setSelectedChild}
      label="Select Child"
      required
    />
    {sponsorshipInfo && (
      <Alert severity="info">
        Sponsoring {sponsorshipInfo.child_name} - ${sponsorshipInfo.monthly_amount}/month
      </Alert>
    )}
  </>
) : (
  <TextField
    select
    label="Project (Optional)"
    value={projectId || ''}
    onChange={(e) => setProjectId(Number(e.target.value) || null)}
  >
    <MenuItem value="">None</MenuItem>
    {availableProjects.map(project => (
      <MenuItem key={project.id} value={project.id}>
        {project.title}
      </MenuItem>
    ))}
  </TextField>
)}
```

**3. Amount Pre-Population for Sponsorship Projects:**

```tsx
// Watch for project selection changes
useEffect(() => {
  if (projectId) {
    const selectedProject = projects.find(p => p.id === projectId);
    if (selectedProject?.project_type === 'sponsorship') {
      setAmount('100.00'); // Pre-populate with default sponsorship amount
    }
  }
}, [projectId, projects]);
```

**4. API Client Method:**
```typescript
export const fetchActiveSponsorshipForChild = async (childId: number) => {
  const response = await apiClient.get(`/api/children/${childId}/active_sponsorship`);
  return response.data;
};
```

**4. New Component (Optional): SponsorshipSelector.tsx**
- Encapsulates child selection + sponsorship fetch logic
- Reusable across forms
- Props: `onSponsorshipSelect(projectId, sponsorshipInfo)`

#### Testing Strategy

**Backend Tests (RSpec):**
- [ ] Request spec: GET /api/children/:id/active_sponsorship returns correct project_id
- [ ] Request spec: Returns 404 when child has no active sponsorship
- [ ] Request spec: Ignores ended sponsorships (end_date present)
- [ ] Request spec: Returns first sponsorship if multiple active (edge case)

**Frontend Tests (Jest):**
- [ ] DonationForm: Shows project dropdown by default (sponsorship toggle OFF)
- [ ] DonationForm: Shows ChildAutocomplete when toggle ON
- [ ] DonationForm: Hides project dropdown when sponsorship mode
- [ ] DonationForm: Auto-populates projectId when child selected
- [ ] DonationForm: Filters out sponsorship projects from dropdown
- [ ] DonationForm: Displays sponsorship info alert when child selected
- [ ] DonationForm: Pre-populates amount to '100.00' when sponsorship project selected
- [ ] DonationForm: User can override pre-populated amount

**E2E Tests (Cypress):**
- [ ] User toggles sponsorship mode
- [ ] User selects child from autocomplete
- [ ] System auto-fills project
- [ ] User submits donation successfully
- [ ] Donation appears in list with correct project

### Alternative Approaches Considered

**Why NOT Option A (Grouped Dropdown):**
- ❌ Still requires user to scroll through all projects
- ❌ Harder to distinguish at a glance
- ❌ No prevention of wrong type selection

**Why NOT Option C (Side-by-Side):**
- ❌ Takes more screen space
- ❌ Redundant UI elements visible at once
- ❌ More complex responsive layout

### Files to Create
- `tickets/TICKET-052-improve-sponsorship-donation-linking.md`

### Files to Modify
- **Backend:**
  - `app/controllers/api/children_controller.rb` - Add active_sponsorship action
  - `config/routes.rb` - Add route
  - `spec/requests/api/children_spec.rb` - Add 4 tests
- **Frontend:**
  - `src/components/DonationForm.tsx` - Add sponsorship toggle + child selection
  - `src/components/DonationForm.test.tsx` - Add 6 tests
  - `src/api/client.ts` - Add fetchActiveSponsorshipForChild method
  - `src/api/client.test.ts` - Add 1 test
  - (Optional) `src/components/SponsorshipSelector.tsx` - New reusable component

### Edge Cases to Handle
1. **Child has no active sponsorship:**
   - Show error: "This child does not have an active sponsorship"
   - Disable form submission or allow fallback to project dropdown
2. **Child has multiple active sponsorships:**
   - Return first one (or show selector for multiple)
   - Document business rule
3. **Sponsorship ends during donation entry:**
   - Validate on submission
   - Show error if sponsorship ended between selection and submit

### Related Tickets
- ✅ TICKET-010: Children & Sponsorship tracking (backend complete)
- ✅ TICKET-009: Project-based donations (infrastructure complete)
- 📋 TICKET-052: This ticket (improve UX for linking)
- 📋 Phase 5 (future): Dedicated Sponsorships page

### Success Metrics
- Reduced user confusion (qualitative feedback)
- Fewer donations mis-categorized to wrong project type
- Faster donation entry for sponsorships (fewer clicks)

---

*This ticket focuses on improving the user experience of linking donations to sponsorships. The backend mapping already works correctly via the Project relationship.*
