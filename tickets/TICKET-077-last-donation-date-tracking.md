## [TICKET-077] Last Donation Date Tracking

**Status:** 🔵 In Progress
**Priority:** 🔴 High
**Dependencies:** None
**Created:** 2025-11-03

### User Story
As an admin, I want to see the last donation date for donors, children, and sponsorships so that I can identify inactive relationships and follow up proactively.

### Problem Statement
Currently, admins cannot quickly see:
- When a donor last made a donation
- When a child last received sponsorship support
- When a sponsorship last received a payment

This makes it hard to:
- Identify lapsed donors for re-engagement campaigns
- Detect ended sponsorships that weren't formally closed
- Prioritize follow-up communications

### Acceptance Criteria

#### Backend
- [ ] Add computed method: `Donor#last_donation_date`
- [ ] Add computed method: `Child#last_donation_date`
- [ ] Add computed method: `Sponsorship#last_donation_date`
- [ ] Update `DonorPresenter` to include `last_donation_date`
- [ ] Update `ChildPresenter` to include `last_donation_date`
- [ ] Update `SponsorshipPresenter` to include `last_donation_date`
- [ ] RSpec tests for all methods (90%+ coverage)

#### Frontend
- [ ] Donors page: Display "Last Donation: YYYY-MM-DD" on each card
- [ ] Children page: Display "Last Donation: YYYY-MM-DD" on each card
- [ ] Sponsorships page: Display "Last Donation: YYYY-MM-DD" in table
- [ ] Handle null case: Display "No donations yet" if nil
- [ ] Update TypeScript types for API responses
- [ ] Tests: Verify display of last_donation_date

### Technical Design

#### Model Methods

```ruby
# app/models/donor.rb
class Donor < ApplicationRecord
  has_many :donations

  def last_donation_date
    donations.maximum(:date)
  end
end

# app/models/child.rb
class Child < ApplicationRecord
  has_many :sponsorships
  has_many :donations, through: :sponsorships

  def last_donation_date
    donations.maximum(:date)
  end
end

# app/models/sponsorship.rb
class Sponsorship < ApplicationRecord
  has_many :donations

  def last_donation_date
    donations.maximum(:date)
  end
end
```

#### Presenter Updates

```ruby
# app/presenters/donor_presenter.rb
class DonorPresenter < BasePresenter
  def as_json(options = {})
    {
      id: object.id,
      name: object.name,
      email: object.email,
      last_donation_date: object.last_donation_date, # NEW
      # ... other fields
    }
  end
end
```

#### Frontend Display

```tsx
// src/components/DonorList.tsx
<Typography variant="body2" color="text.secondary">
  Last Donation: {donor.last_donation_date || 'No donations yet'}
</Typography>

// src/components/ChildList.tsx
<Typography variant="body2" color="text.secondary">
  Last Donation: {child.last_donation_date || 'No donations yet'}
</Typography>

// src/components/SponsorshipList.tsx
<TableCell>{sponsorship.last_donation_date || 'No donations yet'}</TableCell>
```

#### TypeScript Types

```typescript
// src/types/donor.ts
export interface Donor {
  id: number;
  name: string;
  email: string;
  last_donation_date: string | null; // NEW
  // ... other fields
}

// src/types/child.ts
export interface Child {
  id: number;
  name: string;
  last_donation_date: string | null; // NEW
  // ... other fields
}

// src/types/sponsorship.ts
export interface Sponsorship {
  id: number;
  donor_name: string;
  child_name: string;
  monthly_amount: string;
  last_donation_date: string | null; // NEW
  // ... other fields
}
```

### Performance Considerations

**N+1 Query Optimization:**

The `maximum(:date)` calls will trigger N+1 queries when loading lists. Optimization options:

**Option 1: Counter Cache (Simple)**
```ruby
# Good for small datasets (<1000 records)
# No additional queries, just in-memory computation
def last_donation_date
  donations.maximum(:date)
end
```

**Option 2: Eager Loading (Better)**
```ruby
# In controller
@donors = Donor.includes(:donations).all
```

**Option 3: Database Column (Best for large datasets)**
```ruby
# Add column: donors.last_donation_date
# Update via after_create callback on Donation
# Only use if performance becomes an issue
```

**Recommendation:** Start with Option 1 (simple), measure performance, optimize if needed.

### Expected Results

**Donors Page:**
```
John Doe (john@example.com)
Last Donation: 2025-10-15
```

**Children Page:**
```
Sangwan
Sponsored by: John Doe ($25/mo)
Last Donation: 2025-10-20
```

**Sponsorships Page:**
```
| Donor    | Child   | Monthly | Start Date | Status | Last Donation |
|----------|---------|---------|------------|--------|---------------|
| John Doe | Sangwan | $25.00  | 2024-01-01 | Active | 2025-10-20    |
```

### Files to Modify

**Backend:**
- `app/models/donor.rb` (add `last_donation_date` method)
- `app/models/child.rb` (add `last_donation_date` method)
- `app/models/sponsorship.rb` (add `last_donation_date` method)
- `app/presenters/donor_presenter.rb` (add field)
- `app/presenters/child_presenter.rb` (add field)
- `app/presenters/sponsorship_presenter.rb` (add field)
- `spec/models/donor_spec.rb` (add test)
- `spec/models/child_spec.rb` (add test)
- `spec/models/sponsorship_spec.rb` (add test)

**Frontend:**
- `src/types/donor.ts` (add field)
- `src/types/child.ts` (add field)
- `src/types/sponsorship.ts` (add field)
- `src/components/DonorList.tsx` (display)
- `src/components/ChildList.tsx` (display)
- `src/components/SponsorshipList.tsx` (display)
- Tests for all 3 components

### Related Tickets

- TICKET-011: Recurring Donation Tracking (shows payment frequency)
- TICKET-076: Failed Payments Tracking (explains missing payments)

### Notes

- Use relative date display later: "2 days ago", "3 weeks ago" (future enhancement)
- Add sorting by last_donation_date (future enhancement)
- Consider highlighting "lapsed" donors (>90 days) in red (future enhancement)
- For ended sponsorships, this helps identify when they actually stopped receiving payments
