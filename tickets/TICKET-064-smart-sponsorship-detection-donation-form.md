## [TICKET-064] Smart Sponsorship Detection & Auto-Creation in Donation Form

**Status:** 🔵 Ready to Start
**Priority:** 🔴 High (Blocks TICKET-053)
**Effort:** L (Large - 6-8 hours)
**Created:** 2025-10-29
**Updated:** 2025-10-29 (Revised with omnibar UX)
**Dependencies:** Backend sponsorship_id parameter support (NOT YET IMPLEMENTED)
**Blocks:** TICKET-053 (Sponsorships Page testing)

### User Story
As a user creating a donation, I want to easily select either a project OR a child, and have the system automatically handle sponsorship creation/detection, so that I can make sponsorship donations without understanding the technical relationship between donations, sponsorships, projects, and children.

### Problem Statement
After backend changes in TICKET-053, the system now requires:
- **Business Rule:** All donations to sponsorship-type projects MUST have a `sponsorship_id`
- **Current Gap:** DonationForm has no way to detect, create, or select sponsorships
- **Backend Gap:** `donation_params` does NOT permit `sponsorship_id` parameter
- **User Impact:** Cannot create donations to sponsorship projects (validation error)

**Additional Challenge:** First-time sponsorship donations where no project exists yet:
- User wants to donate to child "Eli"
- No "Sponsor Eli" project exists
- Current project selector cannot handle this scenario

### Solution: Unified Omnibar Search

Replace project selector with unified **"Project or Child"** autocomplete that:
1. Searches BOTH projects AND children simultaneously
2. User can select either a project (general/campaign/sponsorship) OR a child
3. System resolves selection to `project_id` + `child_id` (for sponsorships)
4. Auto-detects or creates sponsorship based on donor + child combination

**Example User Flow:**
```
User types "Eli" → Shows:
  🏗️ Sponsor Eli (Project)     [if project exists]
  👶 Eli (Child)                [always shows child]

Scenario A: User selects "Sponsor Eli" project
  → Use project_id
  → Derive child_id from project
  → Auto-detect/create sponsorship

Scenario B: User selects "Eli" child
  → Find existing project for Eli (or create new one)
  → Use derived project_id
  → Auto-detect/create sponsorship

Scenario C: User selects "Summer Campaign" project
  → Use project_id
  → Skip sponsorship logic (not sponsorship type)
  → Create general donation
```

---

## Acceptance Criteria

### Backend Prerequisites
- [ ] **CRITICAL:** Add `sponsorship_id` to `donation_params` permit list in `DonationsController`
- [ ] Verify backend validation: `sponsorship_project_must_have_sponsorship_id` validation exists

### Omnibar Component (ProjectOrChildAutocomplete)
- [ ] Create new shared component `ProjectOrChildAutocomplete.tsx`
- [ ] Component searches `/api/projects` AND `/api/children` in parallel
- [ ] Displays grouped results: "Projects" and "Children"
- [ ] Shows icons: 🏗️ for projects, 👶 for children
- [ ] Debounced search (300ms)
- [ ] Loading state with spinner
- [ ] "Type to search" empty state
- [ ] Supports clear/reset

### Selection Handling
- [ ] When **project** selected:
  - Store `project_id`
  - If sponsorship project: derive `child_id` from project's sponsorships
  - If general/campaign: skip sponsorship logic
- [ ] When **child** selected:
  - Store `child_id`
  - Find existing project for child (via child's sponsorships)
  - If no project exists: system will create on sponsorship creation
  - Store derived `project_id` (or null if creating new)

### Smart Sponsorship Detection (Child + Donor)
- [ ] Detection triggers when user has selected:
  - A child (either directly OR via sponsorship project)
  - A donor
- [ ] Search parameters:
  - `child_id` = selected/derived child
  - `donor_id` = selected donor
  - `end_date_null=true` (only active sponsorships)
- [ ] API call: `GET /api/sponsorships?q[child_id_eq]=X&q[donor_id_eq]=Y&q[end_date_null]=true`

### 0 Matches → Auto-Create Sponsorship
- [ ] System auto-creates new sponsorship with:
  - `donor_id` from form
  - `child_id` from selection (direct or derived)
  - `monthly_amount` = donation amount (best guess)
- [ ] Backend auto-creates "Sponsor {child_name}" project (via `Sponsorship.create_sponsorship_project` callback)
- [ ] Shows success Chip: "✅ New sponsorship created for {child_name}"
- [ ] Uses created `sponsorship_id` for donation

### 1 Match → Auto-Select
- [ ] System auto-selects the matching sponsorship
- [ ] Shows info Chip: "ℹ️ Sponsorship: {child_name} - ${amount}/month"
- [ ] Uses existing `sponsorship_id` for donation

### 2+ Matches → User Selection Modal
- [ ] Shows warning Alert: "Multiple sponsorships found. Please select one."
- [ ] Shows "Select Sponsorship" button
- [ ] Clicking button opens Modal dialog
- [ ] Modal displays list with Radio buttons:
  - Child name
  - Monthly amount
  - Status badge (Active/Ended)
  - Start date
- [ ] Modal has Cancel and Confirm buttons
- [ ] User must select one before confirming
- [ ] After confirmation, shows selected sponsorship in Chip
- [ ] Uses selected `sponsorship_id` for donation

### General/Campaign Projects
- [ ] Non-sponsorship projects skip sponsorship detection entirely
- [ ] `sponsorship_id` remains null for general donations
- [ ] No chips or modals shown

### Form Submission
- [ ] DonationForm includes `sponsorship_id` in API payload when present
- [ ] Backend accepts `sponsorship_id` parameter (prerequisite must be completed)
- [ ] Backend validation passes (sponsorship projects have sponsorship_id)
- [ ] Success message shows donation created

---

## Technical Approach

### Backend Changes (PREREQUISITE)

**File:** `donation_tracker_api/app/controllers/api/donations_controller.rb`

```ruby
def donation_params
  params.require(:donation).permit(
    :amount,
    :date,
    :donor_id,
    :project_id,
    :sponsorship_id,  # ← ADD THIS LINE
    :status,
    :description
  )
end
```

**Test:** Verify parameter is accepted:
```ruby
# spec/requests/api/donations_spec.rb
it "accepts sponsorship_id parameter" do
  post "/api/donations", params: {
    donation: {
      amount: 100,
      date: Date.today,
      donor_id: donor.id,
      project_id: project.id,
      sponsorship_id: sponsorship.id  # Should not be filtered out
    }
  }
  expect(response).to have_http_status(:created)
  expect(Donation.last.sponsorship_id).to eq(sponsorship.id)
end
```

---

### Frontend Type Updates

**File:** `src/types/child.ts` (NEW)

```typescript
/**
 * Represents a child who can be sponsored.
 */
export interface Child {
  id: number;
  name: string;
  discarded_at?: string | null;
}
```

**File:** `src/types/index.ts`

```typescript
export * from './child';  // Add export
```

**File:** `src/types/donation.ts` (ALREADY DONE ✅)

```typescript
export interface DonationFormData {
  amount: number;
  date: string;
  donor_id: number;
  project_id?: number | null;
  sponsorship_id?: number | null; // ✅ Already exists
  status?: string;
  description?: string;
}
```

---

### API Client Updates

**File:** `src/api/client.ts`

```typescript
// Add to existing exports

/**
 * Fetch children matching search query (for omnibar)
 */
export const fetchChildren = async (searchQuery: string) => {
  const response = await apiClient.get('/api/children', {
    params: {
      q: { name_cont: searchQuery },
      per_page: 10
    }
  });
  return response.data.children || [];
};

/**
 * Search for active sponsorships matching donor + child
 */
export const fetchSponsorshipsForDonation = async (
  donorId: number,
  childId: number
): Promise<Sponsorship[]> => {
  const response = await apiClient.get('/api/sponsorships', {
    params: {
      per_page: 100, // Get all matches
      q: {
        child_id_eq: childId,    // ← Search by child_id (not project_id)
        donor_id_eq: donorId,
        end_date_null: true      // Only active sponsorships
      }
    }
  });
  return response.data.sponsorships || [];
};

/**
 * Create new sponsorship (auto-creates project via backend callback)
 */
export const createSponsorship = async (data: SponsorshipFormData): Promise<Sponsorship> => {
  const response = await apiClient.post('/api/sponsorships', { sponsorship: data });
  return response.data.sponsorship;  // ← Note: singular 'sponsorship' (not 'sponsorships')
};

/**
 * Find project_id for a given child (for omnibar selection handling)
 */
export const findProjectForChild = async (childId: number): Promise<number | null> => {
  const response = await apiClient.get('/api/sponsorships', {
    params: {
      q: { child_id_eq: childId },
      per_page: 1
    }
  });

  if (response.data.sponsorships.length > 0) {
    return response.data.sponsorships[0].project_id;
  }

  return null; // No existing project - will be created on sponsorship creation
};
```

---

### Omnibar Component

**File:** `src/components/ProjectOrChildAutocomplete.tsx` (NEW)

```typescript
import { useState, useEffect } from 'react';
import { Autocomplete, TextField, CircularProgress, Box, Chip } from '@mui/material';
import { useDebouncedValue } from '../hooks';
import { fetchProjects, fetchChildren } from '../api/client';
import { Project, Child } from '../types';

// Union type for omnibar options
export type ProjectOrChild =
  | { type: 'project'; data: Project }
  | { type: 'child'; data: Child };

interface ProjectOrChildAutocompleteProps {
  value: ProjectOrChild | null;
  onChange: (selection: ProjectOrChild | null) => void;
  label?: string;
  helperText?: string;
  required?: boolean;
  size?: 'small' | 'medium';
  fullWidth?: boolean;
}

const ProjectOrChildAutocomplete: React.FC<ProjectOrChildAutocompleteProps> = ({
  value,
  onChange,
  label = 'Project or Child',
  helperText = 'Search for a project or child name',
  required = false,
  size = 'medium',
  fullWidth = true,
}) => {
  const [options, setOptions] = useState<ProjectOrChild[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearchInput = useDebouncedValue(searchInput, 300);
  const [loading, setLoading] = useState(false);
  const isTyping = searchInput.trim() !== '' && searchInput !== debouncedSearchInput;

  // Search for projects and children when debounced input changes
  useEffect(() => {
    const searchOptions = async () => {
      if (debouncedSearchInput.trim()) {
        setLoading(true);
        try {
          // Parallel fetch projects and children
          const [projectsRes, childrenRes] = await Promise.all([
            fetchProjects({ q: { title_cont: debouncedSearchInput }, per_page: 10 }),
            fetchChildren(debouncedSearchInput)
          ]);

          const projectOptions: ProjectOrChild[] = (projectsRes.projects || []).map(p => ({
            type: 'project' as const,
            data: p
          }));

          const childOptions: ProjectOrChild[] = (childrenRes || []).map(c => ({
            type: 'child' as const,
            data: c
          }));

          // Projects first, then children
          setOptions([...projectOptions, ...childOptions]);
        } catch (error) {
          console.error('Failed to search projects/children:', error);
          setOptions([]);
        } finally {
          setLoading(false);
        }
      } else {
        setOptions([]);
      }
    };

    searchOptions();
  }, [debouncedSearchInput]);

  const getOptionLabel = (option: ProjectOrChild): string => {
    return option.type === 'project' ? option.data.title : option.data.name;
  };

  const getGroupLabel = (option: ProjectOrChild): string => {
    return option.type === 'project' ? 'Projects' : 'Children';
  };

  const getNoOptionsText = () => {
    if (isTyping) return 'Searching...';
    if (loading) return 'Searching...';
    if (searchInput.trim()) return 'No results';
    return 'Type to search for a project or child';
  };

  return (
    <Autocomplete
      options={options}
      loading={loading}
      value={value}
      onChange={(_, newValue) => onChange(newValue)}
      inputValue={searchInput}
      onInputChange={(_, newInputValue) => setSearchInput(newInputValue)}
      getOptionLabel={getOptionLabel}
      groupBy={getGroupLabel}
      isOptionEqualToValue={(option, val) =>
        option.type === val.type && option.data.id === val.data.id
      }
      noOptionsText={getNoOptionsText()}
      loadingText="Searching..."
      renderOption={(props, option) => (
        <Box component="li" {...props}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span>{option.type === 'project' ? '🏗️' : '👶'}</span>
            <span>{getOptionLabel(option)}</span>
            {option.type === 'project' && option.data.project_type === 'sponsorship' && (
              <Chip label="Sponsorship" size="small" color="info" />
            )}
            {option.type === 'child' && (
              <Chip label="Child" size="small" color="secondary" />
            )}
          </Box>
        </Box>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          helperText={helperText}
          required={required}
          size={size}
          fullWidth={fullWidth}
          slotProps={{
            input: {
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? <CircularProgress color="inherit" size={20} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            },
          }}
        />
      )}
    />
  );
};

export default ProjectOrChildAutocomplete;
```

**File:** `src/components/index.ts` (Update barrel export)

```typescript
export { default as ProjectOrChildAutocomplete } from './ProjectOrChildAutocomplete';
export type { ProjectOrChild } from './ProjectOrChildAutocomplete';
```

---

### DonationForm Updates

**File:** `src/components/DonationForm.tsx`

**State additions:**
```typescript
// Replace projectId state with omnibar selection
const [selectedProjectOrChild, setSelectedProjectOrChild] = useState<ProjectOrChild | null>(null);
const [derivedProjectId, setDerivedProjectId] = useState<number | null>(null);
const [derivedChildId, setDerivedChildId] = useState<number | null>(null);

// Sponsorship detection state
const [selectedSponsorship, setSelectedSponsorship] = useState<Sponsorship | null>(null);
const [sponsorshipMatches, setSponsorshipMatches] = useState<Sponsorship[]>([]);
const [showSponsorshipModal, setShowSponsorshipModal] = useState(false);
const [sponsorshipAutoCreated, setSponsorshipAutoCreated] = useState(false);
```

**Selection handler:**
```typescript
const handleProjectOrChildSelection = async (selection: ProjectOrChild | null) => {
  setSelectedProjectOrChild(selection);

  if (!selection) {
    setDerivedProjectId(null);
    setDerivedChildId(null);
    setSelectedSponsorship(null);
    return;
  }

  if (selection.type === 'project') {
    // User selected project
    setDerivedProjectId(selection.data.id);

    if (selection.data.project_type === 'sponsorship') {
      // Derive child_id from project's sponsorships
      try {
        const sponsorships = await apiClient.get('/api/sponsorships', {
          params: { q: { project_id_eq: selection.data.id }, per_page: 1 }
        });
        if (sponsorships.data.sponsorships.length > 0) {
          setDerivedChildId(sponsorships.data.sponsorships[0].child_id);
        }
      } catch (error) {
        console.error('Failed to derive child_id from project:', error);
      }
    } else {
      // General/campaign project - no child
      setDerivedChildId(null);
    }
  } else {
    // User selected child
    setDerivedChildId(selection.data.id);

    // Find existing project for this child
    const projectId = await findProjectForChild(selection.data.id);
    setDerivedProjectId(projectId);
  }
};
```

**Sponsorship detection logic:**
```typescript
useEffect(() => {
  const detectSponsorship = async () => {
    // Only run if we have child_id and donor (indicates sponsorship donation)
    if (!derivedChildId || !selectedDonor) {
      setSelectedSponsorship(null);
      setSponsorshipMatches([]);
      return;
    }

    try {
      // Search for matching sponsorships (donor + child)
      const matches = await fetchSponsorshipsForDonation(selectedDonor.id, derivedChildId);
      setSponsorshipMatches(matches);

      if (matches.length === 0) {
        // Auto-create sponsorship
        const newSponsorship = await createSponsorship({
          donor_id: selectedDonor.id,
          child_id: derivedChildId,
          monthly_amount: parseFloat(amount) || 0
        });
        setSelectedSponsorship(newSponsorship);
        setSponsorshipAutoCreated(true);

        // Update derived project_id if it was null (new project created)
        if (!derivedProjectId) {
          setDerivedProjectId(newSponsorship.project_id);
        }
      } else if (matches.length === 1) {
        // Auto-select single match
        setSelectedSponsorship(matches[0]);
        setSponsorshipAutoCreated(false);
      } else {
        // Multiple matches - user must choose
        setSponsorshipAutoCreated(false);
        // Don't auto-select - wait for user to open modal
      }
    } catch (error) {
      console.error('Failed to detect/create sponsorship:', error);
      setSelectedSponsorship(null);
    }
  };

  detectSponsorship();
}, [derivedChildId, selectedDonor, amount]);
```

**UI updates:**
```typescript
{/* Replace project selector with omnibar */}
<ProjectOrChildAutocomplete
  value={selectedProjectOrChild}
  onChange={handleProjectOrChildSelection}
  size="small"
/>

{/* Sponsorship status chip */}
{selectedSponsorship && (
  <Chip
    label={
      sponsorshipAutoCreated
        ? `✅ New sponsorship created for ${selectedSponsorship.child_name}`
        : `ℹ️ Sponsorship: ${selectedSponsorship.child_name} - $${selectedSponsorship.monthly_amount}/month`
    }
    color={sponsorshipAutoCreated ? "success" : "info"}
    size="small"
  />
)}

{/* Multiple matches warning */}
{sponsorshipMatches.length > 1 && !selectedSponsorship && (
  <Alert severity="warning" action={
    <Button
      color="inherit"
      size="small"
      onClick={() => setShowSponsorshipModal(true)}
    >
      Select
    </Button>
  }>
    Multiple sponsorships found. Please select one.
  </Alert>
)}

{/* Selection modal */}
<Dialog open={showSponsorshipModal} onClose={() => setShowSponsorshipModal(false)}>
  <DialogTitle>Select Sponsorship</DialogTitle>
  <DialogContent>
    <RadioGroup
      value={selectedSponsorship?.id}
      onChange={(e) => {
        const selected = sponsorshipMatches.find(s => s.id === parseInt(e.target.value));
        setSelectedSponsorship(selected || null);
      }}
    >
      {sponsorshipMatches.map(sponsorship => (
        <FormControlLabel
          key={sponsorship.id}
          value={sponsorship.id}
          control={<Radio />}
          label={
            <Box>
              <Typography variant="body1">
                {sponsorship.child_name} - ${sponsorship.monthly_amount}/month
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {sponsorship.active ? '✅ Active' : '⏸️ Ended'} • Started: {sponsorship.start_date}
              </Typography>
            </Box>
          }
        />
      ))}
    </RadioGroup>
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setShowSponsorshipModal(false)}>Cancel</Button>
    <Button
      onClick={() => setShowSponsorshipModal(false)}
      disabled={!selectedSponsorship}
      variant="contained"
    >
      Confirm
    </Button>
  </DialogActions>
</Dialog>
```

**Submission update:**
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setSuccess(false);
  setIsSubmitting(true);

  if (!selectedDonor) {
    return;
  }

  try {
    await createDonation({
      amount: parseFloat(amount),
      date,
      donor_id: selectedDonor.id,
      project_id: derivedProjectId,              // ← Use derived project_id
      sponsorship_id: selectedSponsorship?.id || null,  // ← Include sponsorship_id
    });

    setSuccess(true);
    // Reset form
    setAmount('');
    setSelectedDonor(null);
    setSelectedProjectOrChild(null);
    setDerivedProjectId(null);
    setDerivedChildId(null);
    setSelectedSponsorship(null);
    setDate(new Date().toISOString().split('T')[0]);
    onSuccess?.();
  } catch (err) {
    console.error('Failed to create donation:', err);
  } finally {
    setIsSubmitting(false);
  }
};
```

---

## Files to Create/Modify

### Backend (PREREQUISITE)
- ✅ `donation_tracker_api/app/controllers/api/donations_controller.rb` - Add `sponsorship_id` to permit list
- ✅ `donation_tracker_api/spec/requests/api/donations_spec.rb` - Add test for sponsorship_id param

### Frontend Types
- ✅ `src/types/child.ts` (NEW) - Child interface
- ✅ `src/types/index.ts` - Add child export

### Frontend Components
- ✅ `src/components/ProjectOrChildAutocomplete.tsx` (NEW) - Omnibar component
- ✅ `src/components/index.ts` - Add omnibar export
- ✅ `src/components/DonationForm.tsx` - Replace project selector, add detection logic
- ✅ `src/components/DonationForm.test.tsx` - Add tests for all scenarios

### Frontend API
- ✅ `src/api/client.ts` - Add fetchChildren, fetchSponsorshipsForDonation, createSponsorship, findProjectForChild

### Frontend Pages
- ✅ `src/pages/DonationsPage.test.tsx` - Update integration tests (if applicable)

---

## Test Plan

### Backend Tests (RSpec)

**File:** `spec/requests/api/donations_spec.rb`

```ruby
describe "POST /api/donations" do
  context "with sponsorship_id parameter" do
    let(:donor) { create(:donor) }
    let(:child) { create(:child) }
    let(:project) { create(:project, project_type: :sponsorship) }
    let(:sponsorship) { create(:sponsorship, donor: donor, child: child, project: project) }

    it "accepts sponsorship_id parameter" do
      post "/api/donations", params: {
        donation: {
          amount: 100,
          date: Date.today,
          donor_id: donor.id,
          project_id: project.id,
          sponsorship_id: sponsorship.id
        }
      }

      expect(response).to have_http_status(:created)
      expect(Donation.last.sponsorship_id).to eq(sponsorship.id)
    end

    it "validates sponsorship_id presence for sponsorship projects" do
      post "/api/donations", params: {
        donation: {
          amount: 100,
          date: Date.today,
          donor_id: donor.id,
          project_id: project.id
          # Missing sponsorship_id
        }
      }

      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.body).to include("must be present for sponsorship projects")
    end
  end
end
```

### Frontend Unit Tests (Jest)

**File:** `src/components/ProjectOrChildAutocomplete.test.tsx`

```typescript
describe('ProjectOrChildAutocomplete', () => {
  it('renders search field', () => {
    render(<ProjectOrChildAutocomplete value={null} onChange={jest.fn()} />);
    expect(screen.getByLabelText(/project or child/i)).toBeInTheDocument();
  });

  it('fetches projects and children when user types', async () => {
    const mockProjects = [{ id: 1, title: 'Summer Campaign', project_type: 'campaign' }];
    const mockChildren = [{ id: 1, name: 'Maria' }];

    (fetchProjects as jest.Mock).mockResolvedValue({ projects: mockProjects });
    (fetchChildren as jest.Mock).mockResolvedValue(mockChildren);

    const user = userEvent.setup();
    render(<ProjectOrChildAutocomplete value={null} onChange={jest.fn()} />);

    await user.type(screen.getByLabelText(/project or child/i), 'Mar');

    await waitFor(() => {
      expect(fetchProjects).toHaveBeenCalledWith({
        q: { title_cont: 'Mar' },
        per_page: 10
      });
      expect(fetchChildren).toHaveBeenCalledWith('Mar');
    });
  });

  it('displays grouped results (Projects and Children)', async () => {
    const mockProjects = [{ id: 1, title: 'Summer Campaign', project_type: 'campaign' }];
    const mockChildren = [{ id: 1, name: 'Maria' }];

    (fetchProjects as jest.Mock).mockResolvedValue({ projects: mockProjects });
    (fetchChildren as jest.Mock).mockResolvedValue(mockChildren);

    const user = userEvent.setup();
    render(<ProjectOrChildAutocomplete value={null} onChange={jest.fn()} />);

    await user.type(screen.getByLabelText(/project or child/i), 'a');

    await waitFor(() => {
      expect(screen.getByText('Projects')).toBeInTheDocument();
      expect(screen.getByText('Children')).toBeInTheDocument();
    });
  });

  it('shows icons for projects (🏗️) and children (👶)', async () => {
    const mockProjects = [{ id: 1, title: 'Campaign', project_type: 'campaign' }];
    const mockChildren = [{ id: 1, name: 'Maria' }];

    (fetchProjects as jest.Mock).mockResolvedValue({ projects: mockProjects });
    (fetchChildren as jest.Mock).mockResolvedValue(mockChildren);

    const user = userEvent.setup();
    render(<ProjectOrChildAutocomplete value={null} onChange={jest.fn()} />);

    await user.type(screen.getByLabelText(/project or child/i), 'a');

    await waitFor(() => {
      const options = screen.getAllByRole('option');
      expect(options[0].textContent).toContain('🏗️');
      expect(options[1].textContent).toContain('👶');
    });
  });
});
```

**File:** `src/components/DonationForm.test.tsx`

```typescript
describe('DonationForm - Sponsorship Detection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('auto-creates sponsorship when 0 matches found', async () => {
    const mockChild = { id: 1, name: 'Maria' };
    const mockSponsorship = {
      id: 1,
      child_id: 1,
      child_name: 'Maria',
      donor_id: 1,
      monthly_amount: '50',
      project_id: 10,
      active: true
    };

    (fetchSponsorshipsForDonation as jest.Mock).mockResolvedValue([]);
    (createSponsorship as jest.Mock).mockResolvedValue(mockSponsorship);

    const user = userEvent.setup();
    render(<DonationForm />);

    // Select child
    const omnibar = screen.getByLabelText(/project or child/i);
    await user.type(omnibar, 'Maria');
    await user.click(await screen.findByText('Maria'));

    // Select donor
    const donorField = screen.getByLabelText(/donor/i);
    await user.type(donorField, 'John');
    await user.click(await screen.findByText(/john doe/i));

    // Enter amount
    await user.type(screen.getByLabelText(/amount/i), '50');

    // Verify auto-create was called
    await waitFor(() => {
      expect(createSponsorship).toHaveBeenCalledWith({
        donor_id: 1,
        child_id: 1,
        monthly_amount: 50
      });
    });

    // Verify success chip appears
    expect(await screen.findByText(/new sponsorship created for maria/i)).toBeInTheDocument();
  });

  it('auto-selects sponsorship when 1 match found', async () => {
    const mockSponsorship = {
      id: 1,
      child_id: 1,
      child_name: 'Maria',
      donor_id: 1,
      monthly_amount: '50',
      active: true
    };

    (fetchSponsorshipsForDonation as jest.Mock).mockResolvedValue([mockSponsorship]);

    const user = userEvent.setup();
    render(<DonationForm />);

    // Select child
    const omnibar = screen.getByLabelText(/project or child/i);
    await user.type(omnibar, 'Maria');
    await user.click(await screen.findByText('Maria'));

    // Select donor
    const donorField = screen.getByLabelText(/donor/i);
    await user.type(donorField, 'John');
    await user.click(await screen.findByText(/john doe/i));

    // Verify info chip appears
    expect(await screen.findByText(/sponsorship: maria - \$50\/month/i)).toBeInTheDocument();
  });

  it('shows modal when 2+ matches found', async () => {
    const mockSponsorships = [
      { id: 1, child_id: 1, child_name: 'Maria', donor_id: 1, monthly_amount: '50', active: true },
      { id: 2, child_id: 1, child_name: 'Maria', donor_id: 1, monthly_amount: '75', active: true }
    ];

    (fetchSponsorshipsForDonation as jest.Mock).mockResolvedValue(mockSponsorships);

    const user = userEvent.setup();
    render(<DonationForm />);

    // Select child + donor
    const omnibar = screen.getByLabelText(/project or child/i);
    await user.type(omnibar, 'Maria');
    await user.click(await screen.findByText('Maria'));

    const donorField = screen.getByLabelText(/donor/i);
    await user.type(donorField, 'John');
    await user.click(await screen.findByText(/john doe/i));

    // Verify alert appears
    expect(await screen.findByText(/multiple sponsorships found/i)).toBeInTheDocument();

    // Click "Select" button
    await user.click(screen.getByRole('button', { name: /select/i }));

    // Verify modal opens
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/select sponsorship/i)).toBeInTheDocument();
  });

  it('skips sponsorship logic for general projects', async () => {
    const mockProject = { id: 1, title: 'General Fund', project_type: 'general' };

    (fetchProjects as jest.Mock).mockResolvedValue({ projects: [mockProject] });

    const user = userEvent.setup();
    render(<DonationForm />);

    // Select general project
    const omnibar = screen.getByLabelText(/project or child/i);
    await user.type(omnibar, 'General');
    await user.click(await screen.findByText('General Fund'));

    // Select donor
    const donorField = screen.getByLabelText(/donor/i);
    await user.type(donorField, 'John');
    await user.click(await screen.findByText(/john doe/i));

    // Verify NO sponsorship detection
    expect(fetchSponsorshipsForDonation).not.toHaveBeenCalled();
    expect(screen.queryByText(/sponsorship/i)).not.toBeInTheDocument();
  });

  it('includes sponsorship_id in form submission', async () => {
    const mockSponsorship = { id: 5, child_id: 1, child_name: 'Maria', donor_id: 1 };

    (fetchSponsorshipsForDonation as jest.Mock).mockResolvedValue([mockSponsorship]);
    (createDonation as jest.Mock).mockResolvedValue({});

    const user = userEvent.setup();
    render(<DonationForm />);

    // Fill form
    const omnibar = screen.getByLabelText(/project or child/i);
    await user.type(omnibar, 'Maria');
    await user.click(await screen.findByText('Maria'));

    const donorField = screen.getByLabelText(/donor/i);
    await user.type(donorField, 'John');
    await user.click(await screen.findByText(/john doe/i));

    await user.type(screen.getByLabelText(/amount/i), '50');

    // Submit
    await user.click(screen.getByRole('button', { name: /create donation/i }));

    // Verify sponsorship_id included
    await waitFor(() => {
      expect(createDonation).toHaveBeenCalledWith(
        expect.objectContaining({
          sponsorship_id: 5
        })
      );
    });
  });
});
```

### Cypress E2E Tests

**File:** `cypress/e2e/donations.cy.ts`

```typescript
describe('Sponsorship Donation Flow', () => {
  beforeEach(() => {
    cy.visit('/donations');
  });

  it('creates first-time sponsorship donation by selecting child', () => {
    // Select child from omnibar
    cy.get('[data-testid="project-or-child-autocomplete"]').type('Maria');
    cy.contains('Maria').click();

    // Select donor
    cy.get('[data-testid="donor-autocomplete"]').type('John');
    cy.contains('John Doe').click();

    // Enter amount
    cy.get('[data-testid="amount-field"]').type('50');

    // Verify success chip appears
    cy.contains('New sponsorship created for Maria').should('be.visible');

    // Submit
    cy.get('[data-testid="submit-button"]').click();

    // Verify success
    cy.contains('Donation created successfully').should('be.visible');
  });

  it('auto-selects existing sponsorship', () => {
    // Existing sponsorship: John sponsors Maria for $50/month
    cy.get('[data-testid="project-or-child-autocomplete"]').type('Maria');
    cy.contains('Maria').click();

    cy.get('[data-testid="donor-autocomplete"]').type('John');
    cy.contains('John Doe').click();

    // Verify info chip appears
    cy.contains('Sponsorship: Maria - $50/month').should('be.visible');

    // Submit
    cy.get('[data-testid="amount-field"]').type('50');
    cy.get('[data-testid="submit-button"]').click();

    // Verify success
    cy.contains('Donation created successfully').should('be.visible');
  });

  it('handles multiple sponsorships via modal', () => {
    // User has 2 active sponsorships for Maria (different amounts)
    cy.get('[data-testid="project-or-child-autocomplete"]').type('Maria');
    cy.contains('Maria').click();

    cy.get('[data-testid="donor-autocomplete"]').type('John');
    cy.contains('John Doe').click();

    // Verify alert appears
    cy.contains('Multiple sponsorships found').should('be.visible');

    // Click "Select" button
    cy.contains('button', 'Select').click();

    // Verify modal opens
    cy.get('[role="dialog"]').should('be.visible');

    // Select first option
    cy.get('[type="radio"]').first().click();

    // Confirm
    cy.contains('button', 'Confirm').click();

    // Verify chip appears
    cy.contains('Sponsorship: Maria').should('be.visible');
  });

  it('creates general donation without sponsorship', () => {
    cy.get('[data-testid="project-or-child-autocomplete"]').type('Summer');
    cy.contains('Summer Campaign').click();

    cy.get('[data-testid="donor-autocomplete"]').type('Jane');
    cy.contains('Jane Smith').click();

    cy.get('[data-testid="amount-field"]').type('100');
    cy.get('[data-testid="submit-button"]').click();

    // Verify no sponsorship chip
    cy.contains('Sponsorship').should('not.exist');
    cy.contains('Donation created successfully').should('be.visible');
  });
});
```

---

## Edge Cases

### Backend Edge Cases
- **Missing `sponsorship_id` permit:** Backend silently drops parameter → 422 validation error
  - **Fix:** Add to permit list (prerequisite)
- **Sponsorship project without sponsorship_id:** Validation fails
  - **Handled:** Detection auto-creates or prompts user

### Frontend Edge Cases
- **Child has no existing project:** `findProjectForChild` returns null
  - **Handled:** Backend creates project on sponsorship creation
- **API errors during detection:** Network failures, 500 errors
  - **Handled:** Try-catch with console.error, allow form submission
- **User changes selection mid-detection:** Race conditions
  - **Handled:** useEffect dependencies re-run detection, latest selection wins
- **User changes amount after auto-create:** Sponsorship has old amount
  - **Acceptable:** Sponsorship amount is initial estimate, not updated
- **Multiple sponsorships with same child:** Legitimate scenario (e.g., different amounts)
  - **Handled:** Modal forces user to choose

---

## Related Tickets

- **TICKET-053:** Sponsorships Page Filters (this ticket unblocks testing)
- **Backend model:** `Sponsorship.create_sponsorship_project` callback (already implemented)
- **Backend validation:** `Donation.sponsorship_project_must_have_sponsorship_id` (already implemented)

---

## Success Criteria

- ✅ User can create first-time sponsorship donations by selecting a child (no existing project required)
- ✅ User can create sponsorship donations by selecting an existing sponsorship project
- ✅ System automatically detects or creates sponsorships based on donor + child
- ✅ Multiple sponsorships handled gracefully with modal selection
- ✅ General/campaign donations work without sponsorship logic
- ✅ Backend validation passes (all sponsorship projects have sponsorship_id)
- ✅ TICKET-053 unblocked and can proceed with full testing

---

## Notes

- **Omnibar pattern:** Inspired by Slack's unified search and VS Code's command palette
- **Child-first approach:** Solves first-donation problem elegantly
- **Backend prerequisite CRITICAL:** Must add `sponsorship_id` to permit params first
- **Project auto-creation:** Handled by backend `Sponsorship` model callback (`create_sponsorship_project`)
- **Search strategy:** Parallel fetch projects + children for fast results
- **Grouped display:** Clear visual separation between projects and children
- **Icon usage:** 🏗️ (projects) and 👶 (children) improve scannability

**Estimated Implementation Time:** 6-8 hours
- Omnibar component: 2 hours
- DonationForm refactor: 2-3 hours
- Detection logic: 1-2 hours
- Testing: 2-3 hours
- Backend prerequisite: 10 minutes
