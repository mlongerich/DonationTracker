## [TICKET-107] Last Donation Date for Projects Page

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Effort:** S (Small - 1-2 hours)
**Created:** 2025-11-12
**Dependencies:** TICKET-077 (Last donation date pattern - donors/children/sponsorships)

### User Story
As a user, I want to see the last donation date for each project on the Projects page so that I can identify inactive projects and understand which projects are currently receiving support.

### Problem Statement
**Current State:**
- TICKET-077 adds last_donation_date to donors, children, and sponsorships
- Projects page does NOT show last donation date
- Cannot identify which projects are actively receiving donations
- No visibility into project engagement over time

**Desired State:**
- Projects page displays "Last Donation: YYYY-MM-DD" for each project
- System projects (General Donation) show last donation date
- Campaign projects show last donation date
- Handle null case: Display "No donations yet" if nil

### Acceptance Criteria

#### Backend Changes
- [ ] Add `Project#last_donation_date` method:
  - Returns `donations.maximum(:date)` (computed, not stored)
  - Returns nil if project has no donations

- [ ] Update `ProjectPresenter` to include `last_donation_date` field

- [ ] RSpec tests (3 new tests):
  - Model: `last_donation_date` returns most recent donation date
  - Model: `last_donation_date` returns nil when no donations
  - Presenter: Includes `last_donation_date` field in JSON

#### Frontend Changes
- [ ] Update `ProjectList` component:
  - Display "Last Donation: YYYY-MM-DD" below project description
  - Show "No donations yet" if `last_donation_date` is null
  - Use `variant="body2" color="text.secondary"` for styling

- [ ] Update TypeScript `Project` interface:
  - Add `last_donation_date?: string | null`

- [ ] Jest tests (2 new tests):
  - ProjectList displays last_donation_date when present
  - ProjectList shows "No donations yet" when null

- [ ] Cypress E2E test (1 scenario):
  - Create project → create donation for project → verify last_donation_date displayed

### Technical Implementation

#### Backend Model
```ruby
# app/models/project.rb (UPDATE)
class Project < ApplicationRecord
  has_many :donations

  # ... existing code ...

  # Last donation date (computed)
  def last_donation_date
    donations.maximum(:date)
  end
end
```

#### Backend Presenter
```ruby
# app/presenters/project_presenter.rb (UPDATE)
class ProjectPresenter < BasePresenter
  def as_json(options = {})
    {
      id: object.id,
      title: object.title,
      description: object.description,
      project_type: object.project_type,
      system: object.system?,
      last_donation_date: object.last_donation_date, # NEW
      # ... other fields
    }
  end
end
```

#### Frontend TypeScript Type
```typescript
// src/types/project.ts (UPDATE)
export interface Project {
  id: number;
  title: string;
  description?: string | null;
  project_type: ProjectType;
  system: boolean;
  last_donation_date?: string | null; // NEW
  created_at: string;
  updated_at: string;
}
```

#### Frontend ProjectList Component
```tsx
// src/components/ProjectList.tsx (UPDATE)
import { Typography, Card, CardContent } from '@mui/material';

const ProjectList = ({ projects }: ProjectListProps) => {
  return (
    <>
      {projects.map((project) => (
        <Card key={project.id}>
          <CardContent>
            <Typography variant="h6">{project.title}</Typography>

            {project.description && (
              <Typography variant="body2" color="text.secondary">
                {project.description}
              </Typography>
            )}

            {/* NEW: Last Donation Date */}
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Last Donation: {project.last_donation_date || 'No donations yet'}
            </Typography>

            {/* Existing action buttons */}
          </CardContent>
        </Card>
      ))}
    </>
  );
};
```

### Expected Display

**Projects Page:**
```
┌────────────────────────────────┐
│ General Donation               │
│ System project for unallocated │
│ donations                      │
│ Last Donation: 2025-11-10      │
│                                │
│ [Edit]                         │
└────────────────────────────────┘

┌────────────────────────────────┐
│ Campaign: Build New School     │
│ Fundraising for new building   │
│ Last Donation: 2025-10-15      │
│                                │
│ [Edit] [Archive]               │
└────────────────────────────────┘

┌────────────────────────────────┐
│ Campaign: Christmas Outreach   │
│ Holiday giving campaign        │
│ Last Donation: No donations yet│
│                                │
│ [Edit] [Archive]               │
└────────────────────────────────┘
```

### Performance Considerations

**N+1 Query Optimization:**
- Same approach as TICKET-077
- Use eager loading in controller: `Project.includes(:donations).all`
- For large datasets, consider database column with callback (future)

### Files to Modify

**Backend:**
- `app/models/project.rb` (add `last_donation_date` method, ~5 lines)
- `app/presenters/project_presenter.rb` (add field, ~1 line)
- `spec/models/project_spec.rb` (add 2 tests, ~15 lines)
- `spec/presenters/project_presenter_spec.rb` (add 1 test, ~10 lines)

**Frontend:**
- `src/types/project.ts` (add field, ~1 line)
- `src/components/ProjectList.tsx` (add display, ~5 lines)
- `src/components/ProjectList.test.tsx` (add 2 tests, ~20 lines)
- `cypress/e2e/project-management.cy.ts` (add 1 test, ~15 lines)

### Testing Strategy

**Backend RSpec (3 tests):**
1. Project with donations returns last_donation_date as most recent date
2. Project with no donations returns nil
3. ProjectPresenter includes last_donation_date field

**Frontend Jest (2 tests):**
1. ProjectList displays last_donation_date when present
2. ProjectList shows "No donations yet" when last_donation_date is null

**Cypress E2E (1 test):**
1. Create project → create donation for project → navigate to Projects page → verify last_donation_date displayed

### Estimated Time
- Backend model method: 15 minutes
- Backend presenter: 10 minutes
- Backend tests: 30 minutes
- Frontend type + display: 15 minutes
- Frontend tests: 30 minutes
- E2E test: 20 minutes
- **Total:** 2 hours

### Success Criteria
- [ ] Projects display last donation date on Projects page
- [ ] System projects show last donation date
- [ ] Campaign projects show last donation date
- [ ] Projects with no donations show "No donations yet"
- [ ] All tests passing (RSpec + Jest + Cypress)
- [ ] Consistent styling with donors/children pages (TICKET-077)

### Related Tickets
- TICKET-077: Last Donation Date Tracking (donors, children, sponsorships) ✅
- TICKET-009: Project-Based Donations ✅ (base feature)

### Notes
- **Consistency:** Follows same pattern as TICKET-077 for donors/children/sponsorships
- **Simple Implementation:** Reuses existing computed method pattern
- **Performance:** Same N+1 optimization strategy as TICKET-077
- **Future Enhancement:** Sort projects by last_donation_date (identify inactive projects)
- **Future Enhancement:** Highlight projects with no donations in past 90 days
