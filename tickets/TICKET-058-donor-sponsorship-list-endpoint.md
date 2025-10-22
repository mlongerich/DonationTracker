## [TICKET-058] Donor Sponsorship List API Endpoint

**Status:** 📋 Planned
**Priority:** 🟢 Low
**Effort:** S (Small - 1-2 hours)
**Created:** 2025-10-22
**Dependencies:** TICKET-010 (Sponsorship model exists) ✅

### User Story

As a developer, I want an API endpoint to list all sponsorships for a specific donor so that I can display a donor's sponsored children on the DonorsPage or in a donor detail view.

### Problem Statement

Currently, there's no dedicated endpoint to fetch all sponsorships for a given donor:
- ❌ Cannot easily show "Your sponsored children" on DonorsPage
- ❌ Have to query all sponsorships and filter client-side (inefficient)
- ⚠️ Missing useful donor profile information

**Current Workaround:**
- Query `GET /api/sponsorships` and filter by donor_id on frontend
- Inefficient for large datasets

**Desired Solution:**
- `GET /api/donors/:id/sponsorships` endpoint
- Returns all sponsorships (active + ended) for that donor
- Includes child info and project details

### Acceptance Criteria

#### Backend API

- [ ] Add `GET /api/donors/:id/sponsorships` endpoint
  - [ ] Returns all sponsorships for donor (active + ended)
  - [ ] Includes child data (eager loaded)
  - [ ] Includes project data (eager loaded)
  - [ ] Sorted by start_date DESC (most recent first) or created_at DESC
  - [ ] Request spec: 3 tests
    - Success with multiple sponsorships
    - Success with no sponsorships (empty array)
    - 404 when donor not found

#### API Response Format

```json
{
  "sponsorships": [
    {
      "id": 1,
      "donor_id": 5,
      "child_id": 3,
      "child_name": "Sangwan",
      "monthly_amount": 50.00,
      "end_date": null,
      "active": true,
      "project_id": 12,
      "project_title": "Sponsor Sangwan",
      "created_at": "2025-01-15T10:30:00Z"
    },
    {
      "id": 2,
      "donor_id": 5,
      "child_id": 7,
      "child_name": "Maria",
      "monthly_amount": 75.00,
      "end_date": "2025-10-01",
      "active": false,
      "project_id": 18,
      "project_title": "Sponsor Maria",
      "created_at": "2024-06-20T14:15:00Z"
    }
  ]
}
```

#### Frontend (Optional - Not Required for This Ticket)

- [ ] Add `fetchDonorSponsorships(donorId)` to API client
- [ ] Test: 1 unit test

**Note:** Frontend UI implementation deferred to separate ticket when needed.

### Technical Approach

#### Backend Implementation

**Controller:**
```ruby
# app/controllers/api/donors_controller.rb
class Api::DonorsController < ApplicationController
  def sponsorships
    donor = Donor.find(params[:id])
    sponsorships = donor.sponsorships
                        .includes(:child, :project)
                        .order(created_at: :desc)

    render json: {
      sponsorships: sponsorships.map do |s|
        {
          id: s.id,
          donor_id: s.donor_id,
          child_id: s.child_id,
          child_name: s.child.name,
          monthly_amount: s.monthly_amount,
          end_date: s.end_date,
          active: s.active?,
          project_id: s.project_id,
          project_title: s.project.title,
          created_at: s.created_at
        }
      end
    }
  rescue ActiveRecord::RecordNotFound
    render json: { error: 'Donor not found' }, status: :not_found
  end
end
```

**Routes:**
```ruby
resources :donors do
  member do
    get :sponsorships
  end
end
```

**Tests:**
```ruby
RSpec.describe 'GET /api/donors/:id/sponsorships', type: :request do
  let(:donor) { create(:donor) }
  let(:child1) { create(:child, name: 'Sangwan') }
  let(:child2) { create(:child, name: 'Maria') }

  it 'returns all sponsorships for donor' do
    sponsorship1 = create(:sponsorship, donor: donor, child: child1, monthly_amount: 50)
    sponsorship2 = create(:sponsorship, donor: donor, child: child2, monthly_amount: 75, end_date: Date.today)

    get "/api/donors/#{donor.id}/sponsorships"

    expect(response).to have_http_status(:ok)
    json = JSON.parse(response.body)
    expect(json['sponsorships'].size).to eq(2)
    expect(json['sponsorships'].first['child_name']).to eq('Sangwan')
  end

  it 'returns empty array when donor has no sponsorships' do
    get "/api/donors/#{donor.id}/sponsorships"

    expect(response).to have_http_status(:ok)
    json = JSON.parse(response.body)
    expect(json['sponsorships']).to eq([])
  end

  it 'returns 404 when donor not found' do
    get '/api/donors/99999/sponsorships'

    expect(response).to have_http_status(:not_found)
  end
end
```

### Files to Create/Modify

- **Backend:**
  - `app/controllers/api/donors_controller.rb` - Add `sponsorships` action
  - `config/routes.rb` - Add sponsorships member route
  - `spec/requests/api/donors_spec.rb` - Add 3 tests

### Use Cases

1. **Donor Profile Page:** Show "Your Sponsored Children" section
2. **Donor Dashboard:** Quick overview of active/ended sponsorships
3. **Reports:** Generate donor-specific sponsorship reports
4. **Admin Tools:** View donor sponsorship history

### Benefits

- ✅ Efficient querying (single SQL query with eager loading)
- ✅ Reduces frontend complexity
- ✅ Follows RESTful nested resource convention
- ✅ Enables future donor dashboard features

### Related Tickets

- ✅ TICKET-010: Children & Sponsorship Tracking (prerequisite - complete)
- 📋 TICKET-056: Sponsorship Business Logic (adds `start_date` field)
- 📋 Future: Donor Dashboard/Profile page ticket (will use this endpoint)

### Notes

- This endpoint was originally planned in TICKET-010 but deferred as "not needed for initial release"
- Low priority since DonorsPage doesn't currently show sponsorship info
- Becomes more useful once Donor Dashboard or Donor Detail View is implemented

---

*Extracted from TICKET-010 deferred acceptance criteria (2025-10-22)*
