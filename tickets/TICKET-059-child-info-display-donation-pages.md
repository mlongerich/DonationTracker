## [TICKET-059] Child Info Display on Donation Pages (Sponsorship Context)

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Effort:** S (Small - 1-2 hours)
**Created:** 2025-10-22
**Dependencies:** TICKET-010 (Sponsorship model exists) ✅, TICKET-009 (Projects) ✅

### User Story

As a user viewing donations, I want to see which child a sponsorship donation supports so that I have full context about the donation purpose when the project is a sponsorship project.

### Problem Statement

Currently, when viewing donations on the DonationsPage or DonationList:
- ❌ Donations show project name ("Sponsor Maria") but no child details
- ❌ Cannot easily see child age, bio, or photo from donation view
- ⚠️ Missing important context for sponsorship donations

**Current View:**
```
Donation: $50.00
Donor: John Doe
Project: Sponsor Maria
Date: 2025-10-20
```

**Desired View (for sponsorship projects):**
```
Donation: $50.00
Donor: John Doe
Project: Sponsor Maria (Child Sponsorship)
  → Child: Maria, Age 10
  → Bio: Loves reading and art
Date: 2025-10-20
```

### Acceptance Criteria

#### Backend API Changes

- [ ] Modify `DonationPresenter` to include child info for sponsorship projects
  - [ ] Add `child_id`, `child_name`, `child_age` when project_type is `:sponsorship`
  - [ ] Eager load child data via `project.sponsorships.child`
  - [ ] Return `null` for non-sponsorship projects
  - [ ] Test: 3 tests
    - Includes child info for sponsorship donation
    - Returns null for general project donation
    - Returns null for campaign project donation

#### API Response Format

**Before (current):**
```json
{
  "id": 1,
  "amount": 50.00,
  "donor_name": "John Doe",
  "project_id": 12,
  "project_title": "Sponsor Maria",
  "project_type": "sponsorship",
  "date": "2025-10-20"
}
```

**After (with child info):**
```json
{
  "id": 1,
  "amount": 50.00,
  "donor_name": "John Doe",
  "project_id": 12,
  "project_title": "Sponsor Maria",
  "project_type": "sponsorship",
  "child": {
    "id": 7,
    "name": "Maria",
    "age": 10,
    "bio": "Loves reading and art"
  },
  "date": "2025-10-20"
}
```

#### Frontend Changes

- [ ] Update `DonationList.tsx` to display child info chip/badge
  - [ ] Show child name + age when `donation.child` is present
  - [ ] Use MUI Chip or secondary text for child info
  - [ ] Only display for sponsorship project types
  - [ ] Test: 4 tests
    - Shows child info for sponsorship donation
    - Hides child info for general donation
    - Hides child info for campaign donation
    - Renders child name and age correctly

- [ ] Update TypeScript types
  - [ ] Add `child` property to `Donation` interface
  - [ ] Make it optional (nullable for non-sponsorship)

#### UI Design

**Option A: Chip Badge (Recommended)**
```tsx
<Card>
  <Typography>$50.00 - John Doe</Typography>
  <Typography>Sponsor Maria</Typography>
  <Chip
    label="Child: Maria, Age 10"
    size="small"
    icon={<ChildCareIcon />}
    color="secondary"
  />
</Card>
```

**Option B: Secondary Text**
```tsx
<ListItem>
  <ListItemText
    primary="$50.00 - John Doe"
    secondary={
      <>
        Project: Sponsor Maria
        {donation.child && (
          <Typography variant="caption" display="block">
            → Child: {donation.child.name}, Age {donation.child.age}
          </Typography>
        )}
      </>
    }
  />
</ListItem>
```

### Technical Approach

#### Backend Implementation

**Update DonationPresenter:**
```ruby
# app/presenters/donation_presenter.rb
class DonationPresenter < BasePresenter
  def as_json
    {
      id: object.id,
      amount: object.amount,
      date: object.date,
      donor_id: object.donor_id,
      donor_name: object.donor&.name,
      project_id: object.project_id,
      project_title: object.project&.title,
      project_type: object.project&.project_type,
      child: child_info # NEW
    }
  end

  private

  def child_info
    return nil unless object.project&.project_type == 'sponsorship'

    sponsorship = object.project.sponsorships.includes(:child).first
    return nil unless sponsorship&.child

    {
      id: sponsorship.child.id,
      name: sponsorship.child.name,
      age: sponsorship.child.age,
      bio: sponsorship.child.bio
    }
  end
end
```

**Tests:**
```ruby
RSpec.describe DonationPresenter do
  describe '#as_json' do
    context 'with sponsorship project' do
      it 'includes child information' do
        child = create(:child, name: 'Maria', age: 10)
        project = create(:project, project_type: :sponsorship)
        sponsorship = create(:sponsorship, child: child, project: project)
        donation = create(:donation, project: project)

        json = DonationPresenter.new(donation).as_json

        expect(json[:child][:name]).to eq('Maria')
        expect(json[:child][:age]).to eq(10)
      end
    end

    context 'with general project' do
      it 'child is null' do
        project = create(:project, project_type: :general)
        donation = create(:donation, project: project)

        json = DonationPresenter.new(donation).as_json

        expect(json[:child]).to be_nil
      end
    end

    context 'with campaign project' do
      it 'child is null' do
        project = create(:project, project_type: :campaign)
        donation = create(:donation, project: project)

        json = DonationPresenter.new(donation).as_json

        expect(json[:child]).to be_nil
      end
    end
  end
end
```

#### Frontend Implementation

**Update Donation TypeScript Type:**
```typescript
// src/types/donation.ts
export interface Child {
  id: number;
  name: string;
  age: number | null;
  bio: string | null;
}

export interface Donation {
  id: number;
  amount: number;
  date: string;
  donor_id: number | null;
  donor_name: string | null;
  project_id: number | null;
  project_title: string | null;
  project_type: string | null;
  child: Child | null; // NEW
}
```

**Update DonationList Component:**
```tsx
// src/components/DonationList.tsx
import ChildCareIcon from '@mui/icons-material/ChildCare';

{donation.child && (
  <Chip
    label={`Child: ${donation.child.name}, Age ${donation.child.age || 'N/A'}`}
    size="small"
    icon={<ChildCareIcon />}
    color="secondary"
    sx={{ mt: 1 }}
  />
)}
```

**Tests:**
```typescript
describe('DonationList', () => {
  it('displays child info for sponsorship donation', () => {
    const donations = [
      {
        id: 1,
        amount: 50,
        donor_name: 'John Doe',
        project_title: 'Sponsor Maria',
        project_type: 'sponsorship',
        child: { id: 7, name: 'Maria', age: 10, bio: 'Loves art' },
        date: '2025-10-20'
      }
    ];

    render(<DonationList donations={donations} />);

    expect(screen.getByText(/Child: Maria, Age 10/i)).toBeInTheDocument();
  });

  it('does not display child info for general donation', () => {
    const donations = [
      {
        id: 1,
        amount: 100,
        donor_name: 'Jane Smith',
        project_title: 'General Fund',
        project_type: 'general',
        child: null,
        date: '2025-10-20'
      }
    ];

    render(<DonationList donations={donations} />);

    expect(screen.queryByText(/Child:/i)).not.toBeInTheDocument();
  });
});
```

### Files to Modify

- **Backend:**
  - `app/presenters/donation_presenter.rb` - Add child_info method
  - `spec/presenters/donation_presenter_spec.rb` - Add 3 tests

- **Frontend:**
  - `src/types/donation.ts` - Add `child` property to Donation interface
  - `src/components/DonationList.tsx` - Add child info display
  - `src/components/DonationList.test.tsx` - Add 4 tests

### Benefits

- ✅ **Better Context:** Users see full donation purpose at a glance
- ✅ **Improved UX:** No need to navigate to Projects page to see child details
- ✅ **Consistent Information:** Child info appears everywhere donations are displayed
- ✅ **Visual Distinction:** Sponsorship donations visually different from general donations

### Edge Cases

1. **Sponsorship project with no child:** Should not happen (prevented by Sponsorship model), but handle gracefully (show null)
2. **Multiple sponsorships per project:** TICKET-056 will enforce one project per child, but use `.first` for safety
3. **Child age is null:** Display "Age N/A" or hide age field

### Related Tickets

- ✅ TICKET-009: Project-Based Donations (prerequisite - complete)
- ✅ TICKET-010: Children & Sponsorship Tracking (prerequisite - complete)
- ✅ TICKET-029: Presenter Pattern (DonationPresenter exists)
- 📋 TICKET-056: Sponsorship Business Logic (one project per child enforcement)

### Notes

- This feature was originally planned in TICKET-010 but deferred to avoid scope creep
- Medium priority - improves user experience but not critical for launch
- Simple implementation - mostly presentation layer changes
- Could be extended to show child photo in future

---

*Extracted from TICKET-010 deferred acceptance criteria (2025-10-22)*
